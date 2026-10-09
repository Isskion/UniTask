/**
 * [Seguimiento] Modelo del Dashboard de proyecto (docs/project-dashboard-design.md).
 *
 * Lógica pura: junta la foto de hoy, la historia (fotos diarias `project_snapshots` donde existen y
 * reconstrucción desde las tareas donde no), la curva planificada por las fechas de cada tarea, el
 * ritmo y la previsión. El núcleo cuenta en días de esfuerzo; el modelo sale en HORAS (8 h = 1 día).
 * Calendario: días laborables de Madrid (sin fines de semana ni festivos, functions/src/workCalendar.ts).
 *
 * Previsión principal por CALENDARIO: fin del plan (el Fin más tardío de las tareas) desplazado el
 * retraso actual. La de ritmo (pendiente / horas cerradas por día) queda como dato secundario: con
 * tareas en paralelo y poco historial se iba a años vista.
 */
import {
    addDays, closedDayOf, currentSnapshot, dayKey, daysBetween, effortOf, forecastEnd, plannedSeries,
    reconstructSeries, scheduleDelay, scheduleForecast, velocity, workableTasks, workdayDelta, workdaysBetween,
    type ProgressSnapshot, type ProgressTask,
} from '@/functions/src/projectProgressCore';

export interface ProjectDates {
    startDate?: string | null;        // yyyy-MM-dd
    endDate?: string | null;          // fin prevista
    committedEndDate?: string | null; // fin comprometida
}

export const HOURS_PER_DAY = 8;

export interface StoredSnapshot { day: string; scope: number; done: number; remaining: number }

export interface ChartPoint {
    day: string;
    remaining?: number;     // real (hasta hoy)
    scope?: number;
    done?: number;
    ideal?: number;         // de la referencia a 0 en la fecha comprometida
    planRemaining?: number; // pendiente según las fechas de cada tarea
    planned?: number;       // hecho según las fechas de cada tarea (burn-up)
    forecast?: number;      // previsión (desde hoy hasta 0 en la fecha prevista)
    exact?: boolean;        // el punto viene de una foto diaria
}

export interface ProjectDashboardModel {
    today: string;
    start: string;
    target: string | null;          // fecha contra la que se mide: comprometida, o prevista si no hay
    targetKind: 'committed' | 'planned' | null;
    now: ProgressSnapshot;
    progressPct: number;            // ganado / alcance
    plannedPct: number | null;      // planificado a hoy / total con fechas
    earnedDatedPct: number | null;
    velocityPerWeek: number;        // horas cerradas por semana (últimas 4)
    planEnd: string | null;         // Fin más tardío de las tareas del plan
    forecast: string | null;        // previsión principal
    forecastKind: 'schedule' | 'velocity' | null;
    velocityForecast: string | null; // al ritmo de cierre actual (secundaria)
    forecastDelay: number | null;   // días lab. de la previsión respecto al objetivo (+ = retraso)
    scheduleDelay: number | null;   // días lab. de retraso frente a las fechas de las tareas
    scheduleReachedOn: string | null;
    workdaysLeft: number | null;
    series: ChartPoint[];
    exactDays: number;              // nº de días con foto diaria
}

const iso = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : dayKey(v));
const r2 = (n: number) => Math.round(n * 100) / 100;
const remainingAfterToday = (remaining: number) => remaining > 0;

export function buildProjectDashboard(tasks: ProgressTask[], dates: ProjectDates, snapshots: StoredSnapshot[], today: string): ProjectDashboardModel {
    const work = workableTasks(tasks);
    const now = currentSnapshot(tasks, today);

    // Inicio: el del proyecto; si no hay, el primer día con trabajo (creación o inicio de tarea).
    const firstDays = work.flatMap((t) => [dayKey(t.createdAt), dayKey(t.startDate)]).filter((d): d is string => !!d);
    const start = iso(dates.startDate) || (firstDays.length ? firstDays.sort()[0] : today);
    const committed = iso(dates.committedEndDate);
    const planned = iso(dates.endDate);
    const target = committed || planned || null;

    const vel = velocity(tasks, today);
    const velocityForecast = forecastEnd(now.remaining, vel.perWorkday, today);
    const planEnds = work
        .filter((t) => !['discarded', 'out_of_scope'].includes(String(t.status || '')))
        .map((t) => dayKey(t.endDate)).filter((d): d is string => !!d).sort();
    const planEnd = planEnds.length ? planEnds[planEnds.length - 1] : null;

    // Retraso frente al plan, medido sobre todo el horizonte del plan (no depende del eje del gráfico)
    const axisStart = start < today ? start : today;
    const horizon = [today, planEnd].filter((d): d is string => !!d).sort();
    const schedDays = daysBetween(axisStart, horizon[horizon.length - 1]);
    const sched = scheduleDelay(schedDays, plannedSeries(tasks, schedDays), now.earnedDated, today);
    const calendarForecast = remainingAfterToday(now.remaining) ? scheduleForecast(planEnd, sched.delay) : today;
    const forecast = calendarForecast ?? velocityForecast;
    const forecastKind = calendarForecast ? 'schedule' as const : velocityForecast ? 'velocity' as const : null;

    // Eje: del inicio a lo más lejano entre hoy, objetivo, fin previsto, fin del plan y previsión (máx. 3 años).
    const ends = [today, target, planned, planEnd, forecast].filter((d): d is string => !!d).sort();
    const end = ends[ends.length - 1] > addDays(start, 1095) ? addDays(start, 1095) : ends[ends.length - 1];
    const days = daysBetween(axisStart, end);
    const pastDays = days.filter((d) => d <= today);

    const rebuilt = reconstructSeries(tasks, pastDays[0], today);
    const snapByDay = new Map(snapshots.map((s) => [s.day, s]));
    const plannedCurve = plannedSeries(tasks, days);

    // Referencia del ideal: alcance tras el primer día con trabajo dentro del proyecto (evita el salto de la importación).
    const refIdx = Math.max(0, rebuilt.findIndex((p) => p.day >= start && p.scope > 0));
    const ref = rebuilt[refIdx] ?? { day: start, scope: now.scope };
    const idealSpan = target ? workdaysBetween(addDays(ref.day, 1), target) : 0;

    // Previsión: recta desde lo pendiente hoy hasta 0 el día previsto.
    const fcSpan = forecast ? workdaysBetween(addDays(today, 1), forecast) : 0;

    let exactDays = 0;
    const series: ChartPoint[] = days.map((day, i) => {
        const p: ChartPoint = { day };
        if (day <= today) {
            const snap = day === today ? null : snapByDay.get(day);
            const src = snap ?? (day === today ? { scope: now.scope, done: now.done, remaining: now.remaining } : rebuilt[i]);
            if (snap) { p.exact = true; exactDays++; }
            p.scope = src.scope; p.done = src.done; p.remaining = src.remaining;
        }
        if (target && day >= ref.day && day <= target && idealSpan > 0) {
            p.ideal = r2(ref.scope * (1 - workdaysBetween(addDays(ref.day, 1), day) / idealSpan));
        }
        if (now.plannedTotal > 0) { p.planned = plannedCurve[i]; p.planRemaining = r2(Math.max(0, now.scope - plannedCurve[i])); }
        if (forecast && day >= today && day <= forecast) {
            p.forecast = fcSpan > 0 ? r2(now.remaining * (1 - workdaysBetween(addDays(today, 1), day) / fcSpan)) : 0;
        }
        return p;
    });

    const H = HOURS_PER_DAY;
    const h = (v?: number) => (v === undefined ? undefined : r2(v * H));
    return {
        today, start, target, targetKind: committed ? 'committed' : planned ? 'planned' : null,
        now: {
            ...now, scope: r2(now.scope * H), done: r2(now.done * H), remaining: r2(now.remaining * H), earned: r2(now.earned * H),
            plannedToDate: r2(now.plannedToDate * H), plannedTotal: r2(now.plannedTotal * H), earnedDated: r2(now.earnedDated * H),
        },
        progressPct: now.scope > 0 ? r2((now.earned / now.scope) * 100) : 0,
        plannedPct: now.plannedTotal > 0 ? r2((now.plannedToDate / now.plannedTotal) * 100) : null,
        earnedDatedPct: now.plannedTotal > 0 ? r2((now.earnedDated / now.plannedTotal) * 100) : null,
        velocityPerWeek: r2(vel.perWorkday * 5 * H),
        planEnd,
        forecast,
        forecastKind,
        velocityForecast,
        forecastDelay: forecast && target ? workdayDelta(target, forecast) : null,
        scheduleDelay: sched.delay,
        scheduleReachedOn: sched.reachedOn,
        workdaysLeft: target ? (target >= today ? workdaysBetween(addDays(today, 1), target) : -workdaysBetween(addDays(target, 1), today)) : null,
        series: series.map((p) => ({
            ...p, remaining: h(p.remaining), scope: h(p.scope), done: h(p.done), ideal: h(p.ideal),
            planRemaining: h(p.planRemaining), planned: h(p.planned), forecast: h(p.forecast),
        })),
        exactDays,
    };
}

// ─── Cerradas por día / semana / mes ────────────────────────────────────────

export type ClosureScope = 'day' | 'week' | 'month';

export interface ClosureBucket { key: string; label: string; tasks: number; effort: number } // effort en horas

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mondayOf = (day: string) => { const wd = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7; return addDays(day, -wd); };
const fmtDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function bucketOf(day: string, scope: ClosureScope): string {
    if (scope === 'day') return day;
    if (scope === 'week') return mondayOf(day);
    return day.slice(0, 7);
}

/** Tareas en Aprobación Final por periodo (últimos 30 días, 12 semanas o 12 meses hasta hoy). */
export function closuresBy(tasks: ProgressTask[], scope: ClosureScope, today: string): ClosureBucket[] {
    const keys: string[] = [];
    if (scope === 'day') for (let i = 29; i >= 0; i--) keys.push(addDays(today, -i));
    else if (scope === 'week') { const m = mondayOf(today); for (let i = 11; i >= 0; i--) keys.push(addDays(m, -7 * i)); }
    else {
        const [y, mo] = today.split('-').map(Number);
        for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(y, mo - 1 - i, 1)); keys.push(d.toISOString().slice(0, 7)); }
    }
    const map = new Map<string, ClosureBucket>(keys.map((k) => [k, {
        key: k,
        label: scope === 'month' ? `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}` : fmtDay(k),
        tasks: 0, effort: 0,
    }]));
    for (const t of workableTasks(tasks)) {
        if (t.status !== 'completed') continue;
        const d = closedDayOf(t).day;
        if (!d) continue;
        const b = map.get(bucketOf(d, scope));
        if (b) { b.tasks++; b.effort = r2(b.effort + effortOf(t).days * HOURS_PER_DAY); }
    }
    return keys.map((k) => map.get(k)!);
}

/** Cerradas hoy, esta semana (desde el lunes) y este mes. */
export function closureCounts(tasks: ProgressTask[], today: string): { day: number; week: number; month: number } {
    const monday = mondayOf(today);
    const month = today.slice(0, 7);
    const out = { day: 0, week: 0, month: 0 };
    for (const t of workableTasks(tasks)) {
        if (t.status !== 'completed') continue;
        const d = closedDayOf(t).day;
        if (!d || d > today) continue;
        if (d === today) out.day++;
        if (d >= monday) out.week++;
        if (d.slice(0, 7) === month) out.month++;
    }
    return out;
}
