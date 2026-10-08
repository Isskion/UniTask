/**
 * [Seguimiento] Modelo del Dashboard de proyecto (docs/project-dashboard-design.md).
 *
 * Lógica pura: junta la foto de hoy, la historia (fotos diarias `project_snapshots` donde existen y
 * reconstrucción desde las tareas donde no), la curva planificada por las fechas de cada tarea, el
 * ritmo y la previsión. Unidad: días de esfuerzo.
 */
import {
    addDays, closedDayOf, currentSnapshot, dayKey, daysBetween, effortOf, forecastEnd, plannedSeries,
    reconstructSeries, scheduleDelay, velocity, workableTasks, workdayDelta, workdaysBetween,
    type ProgressSnapshot, type ProgressTask,
} from '@/functions/src/projectProgressCore';

export interface ProjectDates {
    startDate?: string | null;        // yyyy-MM-dd
    endDate?: string | null;          // fin prevista
    committedEndDate?: string | null; // fin comprometida
}

export interface StoredSnapshot { day: string; scope: number; done: number; remaining: number }

export interface ChartPoint {
    day: string;
    remaining?: number;     // real (hasta hoy)
    scope?: number;
    done?: number;
    ideal?: number;         // de la referencia a 0 en la fecha comprometida
    planRemaining?: number; // pendiente según las fechas de cada tarea
    planned?: number;       // hecho según las fechas de cada tarea (burn-up)
    forecast?: number;      // previsión al ritmo actual (desde hoy)
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
    velocityPerWeek: number;        // días de esfuerzo cerrados por semana (últimas 4)
    forecast: string | null;
    forecastDelay: number | null;   // días lab. de la previsión respecto al objetivo (+ = retraso)
    scheduleDelay: number | null;   // días lab. de retraso frente a las fechas de las tareas
    scheduleReachedOn: string | null;
    workdaysLeft: number | null;
    series: ChartPoint[];
    exactDays: number;              // nº de días con foto diaria
}

const iso = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : dayKey(v));
const r2 = (n: number) => Math.round(n * 100) / 100;

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
    const forecast = forecastEnd(now.remaining, vel.perWorkday, today);

    // Eje: del inicio a lo más lejano entre hoy, objetivo, fin previsto, previsión (máx. 3 años).
    const ends = [today, target, planned, forecast].filter((d): d is string => !!d).sort();
    const end = ends[ends.length - 1] > addDays(start, 1095) ? addDays(start, 1095) : ends[ends.length - 1];
    const days = daysBetween(start < today ? start : today, end);
    const pastDays = days.filter((d) => d <= today);

    const rebuilt = reconstructSeries(tasks, pastDays[0], today);
    const snapByDay = new Map(snapshots.map((s) => [s.day, s]));
    const plannedCurve = plannedSeries(tasks, days);
    const sched = scheduleDelay(days, plannedCurve, now.earnedDated, today);

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

    return {
        today, start, target, targetKind: committed ? 'committed' : planned ? 'planned' : null, now,
        progressPct: now.scope > 0 ? r2((now.earned / now.scope) * 100) : 0,
        plannedPct: now.plannedTotal > 0 ? r2((now.plannedToDate / now.plannedTotal) * 100) : null,
        earnedDatedPct: now.plannedTotal > 0 ? r2((now.earnedDated / now.plannedTotal) * 100) : null,
        velocityPerWeek: r2(vel.perWorkday * 5),
        forecast,
        forecastDelay: forecast && target ? workdayDelta(target, forecast) : null,
        scheduleDelay: sched.delay,
        scheduleReachedOn: sched.reachedOn,
        workdaysLeft: target ? (target >= today ? workdaysBetween(addDays(today, 1), target) : -workdaysBetween(addDays(target, 1), today)) : null,
        series,
        exactDays,
    };
}

// ─── Cerradas por día / semana / mes ────────────────────────────────────────

export type ClosureScope = 'day' | 'week' | 'month';

export interface ClosureBucket { key: string; label: string; tasks: number; effort: number }

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
        if (b) { b.tasks++; b.effort = r2(b.effort + effortOf(t).days); }
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
