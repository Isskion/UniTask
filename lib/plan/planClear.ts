/**
 * [Plan] Vaciar el plan de un proyecto (docs/plan-import-design.md §3, variante "vaciar"): para
 * rehacer el plan desde cero cuando se importó un Excel equivocado.
 *
 * - Grupos, hitos con hijos, padres y gates (estado calculado) se borran siempre.
 * - Tareas trabajables SIN actividad real → se borran.
 * - Tareas trabajables CON actividad real (esfuerzo real, estado cambiado a mano, comentarios) → el PM
 *   elige: borrarlas también o conservarlas desvinculadas del plan (tarea normal del proyecto, sin padre).
 *   El estado puesto por la propia importación (hojas al 100 % del Excel) no cuenta como actividad.
 * - Los lotes de `plan_imports` del proyecto quedan `undone`; el más reciente guarda el informe.
 * - Se borra de arriba abajo: cuando planRollup procesa el borrado de una hija, su padre ya no existe
 *   y no recalcula nada.
 */
import { db } from '@/lib/firebase';
import {
    collection, deleteField, doc, getDocs, query, serverTimestamp, where, writeBatch,
} from 'firebase/firestore';
import type { PlanImport, Task } from '@/types';
import { isWorkable } from './planTasks';

const BATCH_SIZE = 400;
const IN_LIMIT = 30;

export type ActivityReason = 'effort' | 'status' | 'comments';
export const ACTIVITY_LABEL: Record<ActivityReason, string> = {
    effort: 'esfuerzo real registrado',
    status: 'estado cambiado a mano',
    comments: 'comentarios',
};

export interface ClearAnalysis {
    /** Se borran siempre (estructura calculada o trabajables sin actividad). */
    toDelete: Task[];
    /** Trabajables con actividad: el PM decide. */
    withActivity: { task: Task; reasons: ActivityReason[] }[];
}

/** Estado puesto por un proceso (importación, reimportación, rollup) y no por una persona. */
const systemClosed = (t: Task) => String(t.closedBy || '').startsWith('system:');

export function activityReasons(t: Task, commented: Set<string>): ActivityReason[] {
    const reasons: ActivityReason[] = [];
    if (Number(t.actualEffort || 0) > 0) reasons.push('effort');
    if (t.status !== 'pending' && !systemClosed(t)) reasons.push('status');
    if (commented.has(t.id)) reasons.push('comments');
    return reasons;
}

export function analyzeClear(planTasks: Task[], commented: Set<string>): ClearAnalysis {
    const toDelete: Task[] = [];
    const withActivity: ClearAnalysis['withActivity'] = [];
    for (const t of planTasks) {
        const reasons = isWorkable(t) ? activityReasons(t, commented) : [];
        if (reasons.length) withActivity.push({ task: t, reasons });
        else toDelete.push(t);
    }
    return { toDelete, withActivity };
}

/** IDs de tareas con al menos un comentario (consultas `in` de 30 en 30). */
export async function loadCommentedTaskIds(taskIds: string[], tenantId: string): Promise<Set<string>> {
    const out = new Set<string>();
    for (let i = 0; i < taskIds.length; i += IN_LIMIT) {
        const snap = await getDocs(query(
            collection(db, 'task_comments'),
            where('tenantId', '==', tenantId),
            where('taskId', 'in', taskIds.slice(i, i + IN_LIMIT)),
        ));
        for (const d of snap.docs) out.add(String(d.data().taskId));
    }
    return out;
}

/** Campos que hacen de una tarea un nodo del plan; se quitan al conservarla fuera del plan. */
const PLAN_FIELDS = [
    'planRole', 'planCode', 'planPath', 'planOrigin', 'planStatus', 'planChildCount', 'planBaseline',
    'planTrail', 'computed', 'importId', 'importKind', 'lastImportId', 'externalSource', 'parentId',
] as const;

export interface ClearPlanParams {
    projectId: string;
    tenantId: string;
    userId: string;
    analysis: ClearAnalysis;
    /** Tareas con actividad que el PM ha decidido borrar igualmente. */
    alsoDelete: Set<string>;
    onProgress?: (done: number, total: number) => void;
}

export interface ClearPlanResult { deleted: number; kept: number }

export async function clearPlan(p: ClearPlanParams): Promise<ClearPlanResult> {
    const deleteList = [
        ...p.analysis.toDelete,
        ...p.analysis.withActivity.filter((a) => p.alsoDelete.has(a.task.id)).map((a) => a.task),
    ].sort((a, b) => (a.ancestorIds?.length ?? 0) - (b.ancestorIds?.length ?? 0));
    const keepList = p.analysis.withActivity.filter((a) => !p.alsoDelete.has(a.task.id)).map((a) => a.task);

    type Op = { kind: 'detach' | 'delete'; id: string };
    // Primero se desvinculan las que se quedan (dejan de colgar de nodos que se van a borrar)
    const ops: Op[] = [
        ...keepList.map((t) => ({ kind: 'detach' as const, id: t.id })),
        ...deleteList.map((t) => ({ kind: 'delete' as const, id: t.id })),
    ];
    const total = ops.length;
    let done = 0;
    const deleted: string[] = [];
    const kept: string[] = [];
    try {
        for (let i = 0; i < ops.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const slice = ops.slice(i, i + BATCH_SIZE);
            for (const op of slice) {
                const ref = doc(db, 'tasks', op.id);
                if (op.kind === 'delete') {
                    batch.delete(ref);
                } else {
                    const data: Record<string, unknown> = { ancestorIds: [], isActive: true, updatedAt: serverTimestamp() };
                    for (const f of PLAN_FIELDS) data[f] = deleteField();
                    batch.update(ref, data);
                }
            }
            await batch.commit();
            for (const op of slice) (op.kind === 'delete' ? deleted : kept).push(op.id);
            done += slice.length;
            p.onProgress?.(done, total);
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[PlanClear] Falló vaciando el plan del proyecto', p.projectId, 'tras', deleted.length, 'borradas y', kept.length, 'conservadas:', err);
        throw new Error(`El vaciado se cortó tras borrar ${deleted.length} y conservar ${kept.length} de ${total} tareas (${message}). Vuelve a pulsar "Vaciar plan" para terminar con las que quedan.`);
    }

    // Registro: los lotes del proyecto quedan deshechos; el informe va en el más reciente
    try {
        const snap = await getDocs(query(collection(db, 'plan_imports'), where('projectId', '==', p.projectId), where('tenantId', '==', p.tenantId)));
        const imports = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as PlanImport))
            .filter((i) => i.status !== 'undone')
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        if (imports.length) {
            const batch = writeBatch(db);
            imports.forEach((imp, idx) => {
                const data: Record<string, unknown> = { status: 'undone', undoneAt: serverTimestamp(), undoneBy: p.userId };
                if (idx === 0) data.undoReport = { deleted, kept, restored: [] };
                batch.update(doc(db, 'plan_imports', imp.id), data);
            });
            await batch.commit();
        }
    } catch (err) {
        // El plan ya está vaciado; solo falta el registro
        console.error('[PlanClear] Plan vaciado pero no se pudieron marcar los lotes de plan_imports como deshechos', p.projectId, err);
    }
    return { deleted: deleted.length, kept: kept.length };
}
