/**
 * [Seguimiento] Cálculo puro del avance de un proyecto (docs/project-dashboard-design.md).
 *
 * Sin dependencias de Firebase: lo usan el Dashboard de proyecto (app) y la foto diaria
 * `projectSnapshots` (Cloud Function), así las dos fuentes de la curva cuentan igual.
 *
 * Unidad: días de esfuerzo (8 h = 1 día). Cuenta solo el trabajo real: se excluyen las tareas
 * con hijas (padres, hitos y agrupadores del plan, épicas con subtareas), los controles del plan
 * (gate), las archivadas y las inactivas.
 * Días como "yyyy-MM-dd" en la zona del negocio (Europe/Madrid), igual en navegador y servidor.
 */

export const BUSINESS_TZ = 'Europe/Madrid';
export const CLOSED: ReadonlySet<string> = new Set(['completed', 'discarded', 'out_of_scope']);
const DROPPED: ReadonlySet<string> = new Set(['discarded', 'out_of_scope']);
/** Avance por estado (D13 del plan): Aprobación Final 100, Revisión 75, En curso 50, Pendiente 0. */
const STATUS_PROGRESS: Readonly<Record<string, number>> = { completed: 1, review: 0.75, in_progress: 0.5, pending: 0 };
const TSHIRT_DAYS: Readonly<Record<string, number>> = { XS: 0.125, S: 0.5, M: 2, L: 5, XL: 10 };
export const DEFAULT_EFFORT_DAYS = 1;
export const VELOCITY_WINDOW_DAYS = 28;

export interface ProgressTask {
    id: string;
    status?: string;
    parentId?: string | null;
    type?: string;
    planRole?: string;
    planStatus?: string;
    isActive?: boolean;
    createdAt?: unknown;
    closedAt?: unknown;
    updatedAt?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    estimatedEffort?: unknown;
    estimatedEffortSize?: string;
    planBaseline?: { estimatedEffort?: number | null } | null;
}

export type EffortSource = 'estimate' | 'plan' | 'size' | 'dates' | 'default';

// ─── Fechas ─────────────────────────────────────────────────────────────────

export function toMillis(v: unknown): number | null {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
    if (typeof v === 'string') {
        // "yyyy-MM-dd" sin hora = ese día en la zona del negocio (mediodía UTC para no saltar de día)
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return Date.parse(v + 'T12:00:00Z');
        const t = Date.parse(v);
        return Number.isNaN(t) ? null : t;
    }
    const a = v as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof a.toMillis === 'function') return a.toMillis();
    if (typeof a.seconds === 'number') return a.seconds * 1000;
    if (typeof a._seconds === 'number') return a._seconds * 1000;
    return null;
}

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Día "yyyy-MM-dd" en Europe/Madrid. */
export function dayKey(v: unknown): string | null {
    const ms = toMillis(v);
    return ms === null ? null : dayFmt.format(new Date(ms));
}

const keyToUtc = (k: string) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const utcToKey = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (k: string, n: number) => utcToKey(keyToUtc(k) + n * 86400000);
export const isWorkday = (k: string) => { const wd = new Date(keyToUtc(k)).getUTCDay(); return wd !== 0 && wd !== 6; };

/** Días entre a y b, ambos incluidos (a ≤ b). */
export function daysBetween(a: string, b: string): string[] {
    const out: string[] = [];
    for (let t = keyToUtc(a), e = keyToUtc(b); t <= e; t += 86400000) out.push(utcToKey(t));
    return out;
}

/** Días laborables (lun–vie) entre a y b, ambos incluidos. 0 si b < a. */
export function workdaysBetween(a: string, b: string): number {
    if (b < a) return 0;
    const start = keyToUtc(a);
    const days = Math.round((keyToUtc(b) - start) / 86400000) + 1;
    let n = Math.floor(days / 7) * 5;
    const startWd = new Date(start).getUTCDay();
    for (let i = 0; i < days % 7; i++) { const wd = (startWd + i) % 7; if (wd !== 0 && wd !== 6) n++; }
    return n;
}

/** Suma n días laborables a partir del día siguiente a `from`. */
export function addWorkdays(from: string, n: number): string {
    let k = from;
    let left = Math.ceil(n);
    while (left > 0) { k = addDays(k, 1); if (isWorkday(k)) left--; }
    return k;
}

// ─── Tareas que cuentan y su esfuerzo ───────────────────────────────────────

const num = (v: unknown): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') { const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) ? n : 0; }
    return 0;
};

/** Trabajo real del proyecto: sin padres (tienen hijas vivas), controles, agrupadores, archivadas ni inactivas. */
export function workableTasks<T extends ProgressTask>(tasks: T[]): T[] {
    const live = tasks.filter((t) => t.planStatus !== 'archived' && t.isActive !== false);
    const parents = new Set(live.map((t) => t.parentId).filter((p): p is string => !!p));
    return live.filter((t) => !parents.has(t.id) && t.planRole !== 'gate' && t.planRole !== 'group');
}

/** Días de esfuerzo de una tarea, recuperándolos de donde se pueda. */
export function effortOf(t: ProgressTask): { days: number; source: EffortSource } {
    const est = num(t.estimatedEffort);
    if (est > 0) return { days: est, source: 'estimate' };
    const base = num(t.planBaseline?.estimatedEffort);
    if (base > 0) return { days: base, source: 'plan' };
    if (t.estimatedEffortSize && TSHIRT_DAYS[t.estimatedEffortSize]) return { days: TSHIRT_DAYS[t.estimatedEffortSize], source: 'size' };
    const s = dayKey(t.startDate);
    const e = dayKey(t.endDate);
    if (s && e) { const w = workdaysBetween(s, e); if (w > 0) return { days: w, source: 'dates' }; }
    return { days: DEFAULT_EFFORT_DAYS, source: 'default' };
}

/** Día de cierre: `closedAt`; si falta y está cerrada, `updatedAt` (aproximado). */
export function closedDayOf(t: ProgressTask): { day: string | null; approx: boolean } {
    if (!CLOSED.has(String(t.status || ''))) return { day: null, approx: false };
    const c = dayKey(t.closedAt);
    if (c) return { day: c, approx: false };
    return { day: dayKey(t.updatedAt) ?? dayKey(t.createdAt), approx: true };
}

// ─── Foto del día ───────────────────────────────────────────────────────────

export interface ProgressSnapshot {
    day: string;
    scope: number;          // días de esfuerzo en alcance (sin descartadas / fuera de alcance)
    done: number;           // días de esfuerzo en Aprobación Final
    remaining: number;      // scope − done
    earned: number;         // días ganados con la escala por estado (100/75/50/0)
    plannedToDate: number;  // días que, según las fechas de cada tarea, deberían estar hechos hoy
    plannedTotal: number;   // días de las tareas con fechas (base del % planificado)
    earnedDated: number;    // días ganados solo de las tareas con fechas (comparables con plannedToDate)
    counts: {
        created: number; active: number; pending: number; inProgress: number; review: number;
        completed: number; dropped: number; approxClosed: number; withoutDates: number;
    };
    effortSources: Record<EffortSource, number>;   // nº de tareas por origen de sus días
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Parte del esfuerzo que debería estar hecho al final del día `day`, según inicio/fin de la tarea. */
export function plannedShare(t: ProgressTask, effort: number, day: string): number | null {
    const e = dayKey(t.endDate);
    if (!e) return null;
    if (e <= day) return effort;
    const s = dayKey(t.startDate) ?? e;
    if (day < s) return 0;
    const total = workdaysBetween(s, e);
    return total > 0 ? effort * workdaysBetween(s, day) / total : 0;
}

export function currentSnapshot(tasks: ProgressTask[], today: string): ProgressSnapshot {
    const work = workableTasks(tasks);
    const counts = { created: work.length, active: 0, pending: 0, inProgress: 0, review: 0, completed: 0, dropped: 0, approxClosed: 0, withoutDates: 0 };
    const effortSources: Record<EffortSource, number> = { estimate: 0, plan: 0, size: 0, dates: 0, default: 0 };
    let scope = 0, done = 0, earned = 0, plannedToDate = 0, plannedTotal = 0, earnedDated = 0;
    for (const t of work) {
        const status = String(t.status || 'pending');
        const { days, source } = effortOf(t);
        effortSources[source]++;
        if (closedDayOf(t).approx) counts.approxClosed++;
        if (DROPPED.has(status)) { counts.dropped++; continue; }
        scope += days;
        const p = STATUS_PROGRESS[status] ?? 0;
        earned += days * p;
        if (status === 'completed') { done += days; counts.completed++; }
        else {
            counts.active++;
            if (status === 'in_progress') counts.inProgress++;
            else if (status === 'review') counts.review++;
            else counts.pending++;
        }
        const share = plannedShare(t, days, today);
        if (share === null) counts.withoutDates++;
        else { plannedToDate += share; plannedTotal += days; earnedDated += days * p; }
    }
    return {
        day: today, scope: round2(scope), done: round2(done), remaining: round2(scope - done), earned: round2(earned),
        plannedToDate: round2(plannedToDate), plannedTotal: round2(plannedTotal), earnedDated: round2(earnedDated),
        counts, effortSources,
    };
}

// ─── Historia reconstruida (antes de que existan fotos diarias) ─────────────

export interface SeriesPoint { day: string; scope: number; done: number; remaining: number }

/**
 * Alcance y hecho al final de cada día a partir de `createdAt` y del día de cierre.
 * Aproximada: no ve reaperturas ni cambios de esfuerzo pasados (para eso están las fotos diarias).
 */
export function reconstructSeries(tasks: ProgressTask[], from: string, to: string): SeriesPoint[] {
    const work = workableTasks(tasks).map((t) => ({
        created: dayKey(t.createdAt) ?? from,
        closed: closedDayOf(t).day,
        status: String(t.status || 'pending'),
        days: effortOf(t).days,
    }));
    return daysBetween(from, to).map((day) => {
        let scope = 0, done = 0;
        for (const w of work) {
            if (w.created > day) continue;
            const closedBy = w.closed !== null && w.closed <= day;
            if (closedBy && DROPPED.has(w.status)) continue;
            scope += w.days;
            if (closedBy && w.status === 'completed') done += w.days;
        }
        return { day, scope: round2(scope), done: round2(done), remaining: round2(scope - done) };
    });
}

/** Días de esfuerzo que deberían estar hechos al final de cada día (curva planificada). */
export function plannedSeries(tasks: ProgressTask[], days: string[]): number[] {
    const work = workableTasks(tasks)
        .filter((t) => !DROPPED.has(String(t.status || '')))
        .map((t) => ({ t, effort: effortOf(t).days }));
    return days.map((d) => round2(work.reduce((s, w) => s + (plannedShare(w.t, w.effort, d) ?? 0), 0)));
}

// ─── Ritmo, previsión y desviación ──────────────────────────────────────────

/** Días de esfuerzo cerrados (Aprobación Final) por día laborable en las últimas `window` jornadas naturales. */
export function velocity(tasks: ProgressTask[], today: string, window = VELOCITY_WINDOW_DAYS): { perWorkday: number; closedDays: number } {
    const from = addDays(today, -(window - 1));
    let closedDays = 0;
    for (const t of workableTasks(tasks)) {
        if (t.status !== 'completed') continue;
        const c = closedDayOf(t).day;
        if (c && c >= from && c <= today) closedDays += effortOf(t).days;
    }
    const wd = workdaysBetween(from, today);
    return { perWorkday: wd > 0 ? closedDays / wd : 0, closedDays: round2(closedDays) };
}

/** Día en que se acabaría lo pendiente al ritmo actual. null si no hay ritmo. */
export function forecastEnd(remaining: number, perWorkday: number, today: string): string | null {
    if (remaining <= 0) return today;
    if (perWorkday <= 0) return null;
    return addWorkdays(today, remaining / perWorkday);
}

/** Desviación en días laborables de `actual` respecto a `target` (+ = retraso). */
export function workdayDelta(target: string, actual: string): number {
    return actual >= target ? workdaysBetween(addDays(target, 1), actual) : -workdaysBetween(addDays(actual, 1), target);
}

/**
 * Retraso frente a la planificación de cada tarea: día en que la curva planificada alcanzaba lo ganado hoy,
 * comparado con hoy (+ = retraso, − = adelanto). null si no hay tareas con fechas.
 */
export function scheduleDelay(days: string[], planned: number[], earnedDated: number, today: string): { reachedOn: string | null; delay: number | null } {
    if (!days.length || planned[planned.length - 1] <= 0) return { reachedOn: null, delay: null };
    const i = planned.findIndex((p) => p >= earnedDated - 0.01);
    const reachedOn = i === -1 ? days[days.length - 1] : days[i];
    return { reachedOn, delay: workdayDelta(reachedOn, today) };
}
