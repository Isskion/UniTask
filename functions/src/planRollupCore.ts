/**
 * [Plan] Cálculo puro del estado de los nodos del árbol de plan (docs/plan-import-design.md §5).
 *
 * Sin dependencias de Firebase: lo usa la Cloud Function planRollup y lo reutilizará el
 * asistente de importación para fijar los estados iniciales en el mismo lote.
 *
 * Reglas:
 * - Un nodo con hijos vivos (no archivados, activos, que no sean "gate") calcula su estado:
 *     todos cerrados y ≥1 completado → completed; todos cerrados sin completados → discarded
 *     (out_of_scope si todos lo son); todos los abiertos en review → review; alguno empezado
 *     → in_progress; si no → pending.
 * - Avance por hoja según su estado (STATUS_PROGRESS: Aprobación Final 100, Revisión 75, En curso 50,
 *   Pendiente 0), ponderado por esfuerzo estimado
 *   (mínimo 1 para que las hojas sin estimar cuenten). Descartadas / fuera de alcance no pesan.
 *   El % "a ojo" del Excel no se usa: cuenta el estado real en UniTask.
 * - Esfuerzo estimado (sin descartadas) y real (todas) = suma; fechas = mín. inicio / máx. fin.
 * - Gates (filas de control de 0 días) se excluyen del cálculo del padre y se cierran solos
 *   cuando están cerrados todos sus hermanos anteriores.
 */

export type PlanStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'discarded' | 'out_of_scope';
export type PlanRole = 'group' | 'milestone' | 'parent' | 'leaf' | 'gate';

export const CLOSED_STATUSES: ReadonlySet<string> = new Set(['completed', 'discarded', 'out_of_scope']);
const NOT_COUNTING: ReadonlySet<string> = new Set(['discarded', 'out_of_scope']);
/** Avance de una hoja según su estado (D13): lo que espera dependencias o revisión también cuenta. */
export const STATUS_PROGRESS: Readonly<Record<string, number>> = { completed: 100, review: 75, in_progress: 50, pending: 0 };
export const statusProgress = (status?: string): number => STATUS_PROGRESS[String(status || 'pending')] ?? 0;

export const COMPUTED_ROLES: ReadonlySet<string> = new Set(['group', 'milestone', 'parent']);

export interface PlanNodeLike {
    id: string;
    status?: string;
    planRole?: PlanRole | string;
    planStatus?: string;
    isActive?: boolean;
    order?: number;
    estimatedEffort?: number | string | null;
    actualEffort?: number | string | null;
    startDate?: unknown;
    endDate?: unknown;
    planChildCount?: number;
    computed?: {
        status?: string;
        progress?: number;
        estimatedEffort?: number;
        actualEffort?: number;
        startDate?: unknown;
        endDate?: unknown;
    } | null;
}

export interface Aggregate {
    status: PlanStatus;
    progress: number;
    estimatedEffort: number;
    actualEffort: number;
    startDate: unknown | null;
    endDate: unknown | null;
    childCount: number;
    doneCount: number;
}

/** Hijo que cuenta para el árbol: no archivado y activo. */
export function isLive(n: PlanNodeLike): boolean {
    return n.planStatus !== 'archived' && n.isActive !== false;
}

export function toNumber(v: unknown): number {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') {
        const n = parseFloat(v.replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

/** Milisegundos de un Timestamp de Firestore, Date, número o string ISO. null si no es fecha. */
export function toMillis(v: unknown): number | null {
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'string') {
        const t = Date.parse(v);
        return Number.isNaN(t) ? null : t;
    }
    const anyV = v as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof anyV.toMillis === 'function') return anyV.toMillis();
    if (typeof anyV.seconds === 'number') return anyV.seconds * 1000;
    if (typeof anyV._seconds === 'number') return anyV._seconds * 1000;
    return null;
}

/** ¿Este nodo tiene su estado calculado (no editable a mano)? */
export function hasComputedState(n: PlanNodeLike): boolean {
    if (n.planRole === 'gate') return true;
    if (!n.planRole || !COMPUTED_ROLES.has(n.planRole)) return false;
    // Un hito sin hijos es "hito individual": se trata a mano.
    return (n.planChildCount ?? 0) > 0;
}

/** Valores efectivos de un hijo, tanto si es hoja como si es un nodo calculado. */
function effective(c: PlanNodeLike) {
    const status = String(c.status || 'pending');
    if (c.computed && hasComputedState(c)) {
        return {
            status,
            progress: toNumber(c.computed.progress),
            estimated: toNumber(c.computed.estimatedEffort),
            actual: toNumber(c.computed.actualEffort),
            start: c.computed.startDate ?? null,
            end: c.computed.endDate ?? null,
        };
    }
    return {
        status,
        progress: statusProgress(status),
        estimated: toNumber(c.estimatedEffort),
        actual: toNumber(c.actualEffort),
        start: c.startDate ?? null,
        end: c.endDate ?? null,
    };
}

/**
 * Agrega los hijos de un nodo. Devuelve null si no tiene hijos que cuenten
 * (el llamante decide: un "parent" vuelve a ser hoja, un hito pasa a individual).
 */
export function aggregateChildren(children: PlanNodeLike[]): Aggregate | null {
    const counted = children.filter((c) => isLive(c) && c.planRole !== 'gate');
    if (counted.length === 0) return null;

    const eff = counted.map(effective);
    const closed = eff.filter((e) => CLOSED_STATUSES.has(e.status));
    const open = eff.filter((e) => !CLOSED_STATUSES.has(e.status));

    let status: PlanStatus;
    if (open.length === 0) {
        if (closed.some((e) => e.status === 'completed')) status = 'completed';
        else if (closed.every((e) => e.status === 'out_of_scope')) status = 'out_of_scope';
        else status = 'discarded';
    } else if (open.every((e) => e.status === 'review')) {
        status = 'review';
    } else if (closed.length > 0 || open.some((e) => e.status !== 'pending')) {
        status = 'in_progress';
    } else {
        status = 'pending';
    }

    const weighted = eff.filter((e) => !NOT_COUNTING.has(e.status));
    let progress: number;
    if (weighted.length === 0) {
        progress = status === 'completed' ? 100 : 0;
    } else {
        let wSum = 0;
        let pSum = 0;
        for (const e of weighted) {
            const w = e.estimated > 0 ? e.estimated : 1;
            wSum += w;
            pSum += w * e.progress;
        }
        progress = Math.round((pSum / wSum) * 10) / 10;
    }

    let startDate: unknown | null = null;
    let endDate: unknown | null = null;
    let startMs = Infinity;
    let endMs = -Infinity;
    for (const e of eff) {
        const s = toMillis(e.start);
        if (s !== null && s < startMs) { startMs = s; startDate = e.start; }
        const f = toMillis(e.end);
        if (f !== null && f > endMs) { endMs = f; endDate = e.end; }
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
        status,
        progress,
        estimatedEffort: round2(weighted.reduce((s, e) => s + e.estimated, 0)),
        actualEffort: round2(eff.reduce((s, e) => s + e.actual, 0)),
        startDate,
        endDate,
        childCount: counted.length,
        doneCount: closed.length,
    };
}

/**
 * Estado de un gate: completed cuando están cerrados todos sus hermanos anteriores
 * (por `order`; sin `order`, todos los hermanos que no son gate). Sin bloque → sin cambios.
 */
export function gateStatus(gate: PlanNodeLike, siblings: PlanNodeLike[]): PlanStatus | null {
    const gateOrder = typeof gate.order === 'number' ? gate.order : Infinity;
    const block = siblings.filter((s) =>
        s.id !== gate.id && isLive(s) && s.planRole !== 'gate' &&
        (typeof s.order === 'number' ? s.order < gateOrder : gateOrder === Infinity));
    if (block.length === 0) return null;
    const allClosed = block.every((s) => CLOSED_STATUSES.has(String(s.status || 'pending')));
    if (!allClosed) return 'pending';
    return block.some((s) => s.status === 'completed') ? 'completed' : 'discarded';
}

/** Igualdad de dos agregados ignorando la representación de fechas (Timestamp vs Date…). */
export function sameAggregate(a: (NonNullable<PlanNodeLike["computed"]> & { childCount?: number; doneCount?: number }) | null | undefined, b: Aggregate | null): boolean {
    if (!a || !b) return !a && !b;
    return a.status === b.status &&
        a.progress === b.progress &&
        a.estimatedEffort === b.estimatedEffort &&
        a.actualEffort === b.actualEffort &&
        a.childCount === b.childCount &&
        a.doneCount === b.doneCount &&
        toMillis(a.startDate) === toMillis(b.startDate) &&
        toMillis(a.endDate) === toMillis(b.endDate);
}
