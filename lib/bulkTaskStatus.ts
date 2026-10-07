/**
 * Cambio de estado masivo de tareas (lista de tareas → selección → validación → aplicar).
 *
 * - `planBulkStatus` (puro) decide qué tareas cambian y cuáles se omiten, con el motivo:
 *   ya en ese estado; estado calculado del plan (hitos con tareas, padres, agrupadores, controles:
 *   las reglas lo rechazarían); bloqueada por una dependencia abierta que no se cierra en el mismo lote.
 * - `applyBulkStatus` escribe en lotes: estado + closedAt/closedBy (igual que el editor de tareas)
 *   y una entrada `status_change` en el historial de cada tarea.
 */
import { db } from '@/lib/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { Task } from '@/types';
import { isPlanStateLocked } from '@/lib/plan/planTasks';

export type TaskStatus = Task['status'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
    pending: 'Pendiente',
    in_progress: 'En curso',
    review: 'Revisión',
    completed: 'Aprobación Final',
    discarded: 'Descartada',
    out_of_scope: 'Fuera de alcance',
};

const CLOSED = new Set<string>(['completed', 'discarded', 'out_of_scope']);
/** Estados que sacan trabajo del proyecto: piden motivo y confirmación escrita. */
export const DESTRUCTIVE = new Set<TaskStatus>(['discarded', 'out_of_scope']);

export interface BulkSkip { task: Task; reason: string }
export interface BulkPlan { apply: Task[]; skipped: BulkSkip[] }

export function planBulkStatus(selected: Task[], target: TaskStatus, allTasks: Task[]): BulkPlan {
    const byId = new Map(allTasks.map((t) => [t.id, t]));
    const skipped: BulkSkip[] = [];
    let candidates: Task[] = [];
    for (const t of selected) {
        if (t.status === target) skipped.push({ task: t, reason: `ya está en ${STATUS_LABEL[target]}` });
        else if (isPlanStateLocked(t)) skipped.push({ task: t, reason: 'estado calculado del plan: cambia al cambiar sus tareas' });
        else candidates.push(t);
    }
    // Al cerrar, una dependencia abierta bloquea… salvo que se cierre en este mismo cambio
    if (target === 'completed') {
        let changed = true;
        while (changed) {
            changed = false;
            const closing = new Set(candidates.map((t) => t.id));
            const next: Task[] = [];
            for (const t of candidates) {
                const open = (t.dependencies || [])
                    .map((id) => byId.get(id))
                    .filter((d): d is Task => !!d && d.status !== 'completed' && !closing.has(d.id));
                if (open.length) {
                    skipped.push({ task: t, reason: `bloqueada por ${open.map((d) => d.friendlyId || d.title).join(', ')}` });
                    changed = true;
                } else next.push(t);
            }
            candidates = next;
        }
    }
    return { apply: candidates, skipped };
}

export interface ApplyBulkParams {
    tasks: Task[];
    target: TaskStatus;
    tenantId: string;
    user: { uid: string; email?: string | null; displayName?: string | null };
    reason?: string;
    onProgress?: (done: number, total: number) => void;
}

const BATCH_TASKS = 200; // 2 escrituras por tarea (tarea + historial) → 400 por lote

export async function applyBulkStatus({ tasks, target, tenantId, user, reason, onProgress }: ApplyBulkParams): Promise<number> {
    let done = 0;
    for (let i = 0; i < tasks.length; i += BATCH_TASKS) {
        const batch = writeBatch(db);
        const slice = tasks.slice(i, i + BATCH_TASKS);
        for (const t of slice) {
            const data: Record<string, unknown> = { status: target, updatedAt: serverTimestamp() };
            const wasClosed = CLOSED.has(t.status);
            const isClosed = CLOSED.has(target);
            if (isClosed && !wasClosed) { data.closedAt = serverTimestamp(); data.closedBy = user.uid; }
            else if (!isClosed && wasClosed) { data.closedAt = null; data.closedBy = null; }
            batch.update(doc(db, 'tasks', t.id), data);
            batch.set(doc(collection(db, 'task_activities')), {
                taskId: t.id,
                tenantId,
                userId: user.uid,
                userEmail: user.email ?? null,
                userName: user.displayName || 'Usuario',
                type: 'status_change',
                details: `Estado cambiado de ${STATUS_LABEL[t.status] ?? t.status} a ${STATUS_LABEL[target]} (cambio masivo de ${tasks.length} tareas)` + (reason?.trim() ? `. Motivo: ${reason.trim()}` : ''),
                createdAt: serverTimestamp(),
            });
        }
        try {
            await batch.commit();
        } catch (err) {
            console.error('[BulkStatus] Falló un lote del cambio masivo', { target, done, total: tasks.length, ids: slice.map((t) => t.id) }, err);
            const code = (err as { code?: string })?.code;
            throw new Error(
                (done ? `Se cambiaron ${done} de ${tasks.length} tareas; el resto no. ` : 'No se cambió ninguna tarea. ') +
                (code === 'permission-denied'
                    ? 'Alguna tarea del lote está fuera de tu región/división o es un nodo calculado del plan. Filtra por un solo proyecto y vuelve a intentarlo, o pide a un administrador que lo haga.'
                    : `Error: ${err instanceof Error ? err.message : String(err)}`),
            );
        }
        done += slice.length;
        onProgress?.(done, tasks.length);
    }
    return done;
}
