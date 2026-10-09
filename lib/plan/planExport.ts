/**
 * [Plan] Exportación del plan a Excel con el formato de entrada (docs/plan-import-design.md §7).
 *
 * Lógica pura (sin Firebase ni DOM): recibe las tareas del plan y devuelve las filas en orden de árbol.
 * El fichero resultante se puede volver a importar con "Reimportar Excel" sin cambios:
 * - el nombre lleva el código delante y la sangría de MS Project (3 espacios por nivel);
 * - la duración de las hojas es su esfuerzo estimado (la importación la lee como esfuerzo, D7) y los
 *   controles salen con "0 d" (así se reconocen);
 * - la columna "UniTask ID" empareja cada fila con su tarea al reimportar.
 * % completado por estado (D13: 100/75/50/0), padres e hitos ponderados por esfuerzo; se recalcula aquí
 * para no depender de `computed` guardados con la escala anterior.
 * Las tareas creadas en UniTask llevan un código generado (siguiente libre bajo su padre) y Origen "UniTask".
 */
import type { Task } from '@/types';
import { aggregateChildren, statusProgress, toMillis, toNumber, type PlanNodeLike } from '@/functions/src/planRollupCore';
import { planName } from './planTitle';
import { workdaysBetween } from '@/functions/src/workCalendar';

export const PLAN_EXPORT_HEADERS = [
    'Id', 'Nombre de tarea', 'Duración', '% completado', 'Predecesoras', 'Comienzo', 'Fin',
    'Estado UniTask', 'Responsable', 'Origen', 'UniTask ID',
] as const;

export const INDENT = '   '; // MS Project exporta 3 espacios por nivel

export const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente', in_progress: 'En Curso', review: 'Revisión', completed: 'Aprobación Final',
    discarded: 'Descartada', out_of_scope: 'Fuera de alcance',
};

export interface PlanExportRow {
    id: number;                 // nº de fila de tarea (como el Id de MS Project); base de "Predecesoras"
    level: number;
    code: string | null;
    codeGenerated: boolean;     // código propuesto por UniTask (tarea creada en UniTask)
    name: string;               // nombre sin código ni sangría
    durationDays: number | null;
    percent: number;            // 0–100
    predecessors: string;       // "12;15"
    start: string | null;       // yyyy-MM-dd (día local)
    end: string | null;
    status: string;             // etiqueta en castellano
    responsible: string;
    origin: 'Excel' | 'UniTask';
    taskId: string;
    summary: boolean;           // tiene hijos (negrita, como MS Project)
    archived: boolean;
}

export interface PlanExportOptions {
    includeArchived?: boolean;
}

export interface PlanExportResult {
    rows: PlanExportRow[];
    counts: { total: number; unitask: number; archived: number; skippedDependencies: number };
}

const isArchived = (t: Task) => t.planStatus === 'archived' || t.isActive === false;

/** Día local yyyy-MM-dd de un Timestamp / ISO / Date (las fechas del plan son medianoche local). */
export function dayOf(v: unknown): string | null {
    const ms = toMillis(v);
    if (ms === null) return null;
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Días laborables (lun–vie sin festivos de Madrid) entre dos días, ambos incluidos. */
export function workingDays(start: string | null, end: string | null): number | null {
    if (!start || !end || end < start) return null;
    return workdaysBetween(start, end);
}

/** Siguiente código libre bajo un padre: "III.1.4.2.1" + hermanos ".1…7" → "III.1.4.2.1.8". */
function nextFreeCode(parentCode: string, used: Set<string>): string {
    const prefix = parentCode + '.';
    let max = 0;
    for (const c of used) {
        if (!c.startsWith(prefix)) continue;
        const rest = c.slice(prefix.length);
        if (/^\d+$/.test(rest)) max = Math.max(max, parseInt(rest, 10));
    }
    const code = `${prefix}${max + 1}`;
    used.add(code);
    return code;
}

export function buildPlanExport(planTasks: Task[], opts: PlanExportOptions = {}): PlanExportResult {
    const ids = new Set(planTasks.map((t) => t.id));
    const LOOSE = '__loose__';
    const ROOT = '__root__';
    const byParent = new Map<string, Task[]>();
    for (const t of planTasks) {
        const p = t.parentId && ids.has(t.parentId) ? t.parentId : (t.planOrigin === 'unitask' ? LOOSE : ROOT);
        byParent.set(p, [...(byParent.get(p) || []), t]);
    }
    for (const list of byParent.values()) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Avance, esfuerzo y fechas de abajo arriba, solo con lo que se exporta.
    type Calc = { percent: number; effort: number; start: string | null; end: string | null; hasKids: boolean };
    const calc = new Map<string, Calc>();
    const included = (t: Task) => opts.includeArchived || !isArchived(t);
    const compute = (t: Task): Calc => {
        const kids = (byParent.get(t.id) || []).filter(included);
        if (!kids.length) {
            const c: Calc = {
                percent: statusProgress(t.status),
                effort: toNumber(t.estimatedEffort),
                start: dayOf(t.startDate), end: dayOf(t.endDate), hasKids: false,
            };
            calc.set(t.id, c);
            return c;
        }
        const likes: PlanNodeLike[] = kids.map((k) => {
            const c = compute(k);
            return {
                id: k.id, status: k.status, planRole: k.planRole === 'gate' ? 'gate' : 'parent', planChildCount: 1,
                computed: { progress: c.percent, estimatedEffort: c.effort, actualEffort: 0, startDate: c.start, endDate: c.end },
            };
        });
        const agg = aggregateChildren(likes);
        const c: Calc = agg
            ? { percent: agg.progress, effort: agg.estimatedEffort, start: (agg.startDate as string | null) ?? dayOf(t.startDate), end: (agg.endDate as string | null) ?? dayOf(t.endDate), hasKids: true }
            : { percent: statusProgress(t.status), effort: toNumber(t.estimatedEffort), start: dayOf(t.startDate), end: dayOf(t.endDate), hasKids: true };
        calc.set(t.id, c);
        return c;
    };
    for (const root of [...(byParent.get(ROOT) || []), ...(byParent.get(LOOSE) || [])]) if (included(root)) compute(root);

    // Filas en preorden; las tareas sueltas de UniTask van al final, en la raíz.
    const usedCodes = new Set(planTasks.map((t) => t.planCode).filter((c): c is string => !!c));
    const codeOf = new Map<string, string | null>();
    const rows: PlanExportRow[] = [];
    const rowIdOf = new Map<string, number>();
    const walk = (parent: string, level: number, parentCode: string | null) => {
        for (const t of byParent.get(parent) || []) {
            if (!included(t)) continue;
            const c = calc.get(t.id)!;
            let code = t.planCode || null;
            let codeGenerated = false;
            if (!code && t.planOrigin === 'unitask' && parentCode) { code = nextFreeCode(parentCode, usedCodes); codeGenerated = true; }
            codeOf.set(t.id, code);
            const isGate = t.planRole === 'gate' && !c.hasKids;
            const duration = isGate ? 0
                : c.hasKids ? workingDays(c.start, c.end)
                : (c.effort > 0 ? c.effort : null);
            const row: PlanExportRow = {
                id: rows.length + 1,
                level,
                code,
                codeGenerated,
                name: planName(t),
                durationDays: duration,
                percent: Math.round(c.percent),
                predecessors: '',
                start: c.start,
                end: c.end,
                status: STATUS_LABELS[t.status] ?? t.status,
                responsible: t.raci?.responsible?.[0] ?? '',
                origin: t.planOrigin === 'unitask' ? 'UniTask' : 'Excel',
                taskId: t.id,
                summary: c.hasKids,
                archived: isArchived(t),
            };
            rows.push(row);
            rowIdOf.set(t.id, row.id);
            walk(t.id, level + 1, code);
        }
    };
    walk(ROOT, 0, null);
    walk(LOOSE, 0, null);

    // Predecesoras renumeradas al Id de fila del fichero.
    const byTaskId = new Map(planTasks.map((t) => [t.id, t]));
    let skippedDependencies = 0;
    for (const r of rows) {
        const deps = byTaskId.get(r.taskId)?.dependencies || [];
        const nums: number[] = [];
        for (const d of deps) {
            const n = rowIdOf.get(d);
            if (n) nums.push(n); else skippedDependencies++;
        }
        r.predecessors = nums.sort((a, b) => a - b).join(';');
    }

    return {
        rows,
        counts: {
            total: rows.length,
            unitask: rows.filter((r) => r.origin === 'UniTask').length,
            archived: rows.filter((r) => r.archived).length,
            skippedDependencies,
        },
    };
}

/** Texto de la duración como MS Project en castellano: "5 d", "0,5 d". */
export const formatDuration = (d: number | null) => (d === null ? '' : `${String(Math.round(d * 100) / 100).replace('.', ',')} d`);

/** Para el nombre del fichero: proyecto sin caracteres raros + fecha. */
export function planExportFileName(projectName: string, today = new Date()): string {
    const slug = projectName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'plan';
    const p = (n: number) => String(n).padStart(2, '0');
    return `Plan_${slug}_${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}.xlsx`;
}

