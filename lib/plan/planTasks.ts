/**
 * [Plan] Operaciones sobre el árbol de plan desde la app (docs/plan-import-design.md §5–§6):
 * bloqueo de nodos calculados, herencia al crear tareas, alta de tareas y "Descartar bloque".
 */
import { db } from '@/lib/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { Project, Task } from '@/types';
import { recalculateAncestors } from '@/lib/hierarchy-governance';
import { createTask } from '@/lib/tasks';
import { normalizeName } from './planParser';

const CLOSED = new Set(['completed', 'discarded', 'out_of_scope']);

/** Mismo criterio que `planStateLocked` en firestore.rules: estado calculado, no editable a mano. */
export function isPlanStateLocked(t: Pick<Task, 'planRole' | 'planChildCount'>): boolean {
    if (t.planRole === 'group' || t.planRole === 'parent' || t.planRole === 'gate') return true;
    return t.planRole === 'milestone' && (t.planChildCount ?? 0) > 0;
}

/** Tareas trabajables: hojas e hitos individuales (sin hijos). */
export function isWorkable(t: Pick<Task, 'planRole' | 'planChildCount'>): boolean {
    return t.planRole === 'leaf' || (t.planRole === 'milestone' && !(t.planChildCount ?? 0));
}

/** Fechas de tarea: ISO (selector de la app / importación) o Timestamp de Firestore. */
export function toIso(v: unknown): string | null {
    if (!v) return null;
    if (typeof v === 'string') return v;
    const t = v as { toDate?: () => Date };
    return typeof t.toDate === 'function' ? t.toDate().toISOString() : null;
}

const todayIso = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };

export type AddMode = 'child' | 'subtask' | 'loose';

/** Datos editables de la nueva tarea, ya rellenados con lo heredado del padre. */
export interface PlanTaskDraft {
    title: string;
    description: string;
    startDate: string | null;
    endDate: string | null;
    clientDeadline: unknown | null;
    estimatedEffort: number | null;
    effortHint: string | null;
    responsible: string;
    priority: 'high' | 'medium' | 'low';
    dependencies: string[];
}

/**
 * Herencia (§6): deadline = fin del padre; inicio = hoy o el inicio del padre si es posterior;
 * responsable, prioridad y deadline de cliente del padre; descripción con la ruta como contexto.
 * Esfuerzo sugerido: si el padre es una hoja (subtarea), lo que le queda (estimado − real);
 * si ya tiene hijas, el tamaño medio de sus hijas abiertas.
 */
export function buildDraft(mode: AddMode, parent: Task | null, planTasks: Task[]): PlanTaskDraft {
    const base: PlanTaskDraft = {
        title: '', description: '', startDate: todayIso(), endDate: null, clientDeadline: null,
        estimatedEffort: null, effortHint: null, responsible: '', priority: 'medium', dependencies: [],
    };
    if (mode === 'loose' || !parent) return base;

    const byId = new Map(planTasks.map((t) => [t.id, t]));
    const path = [...(parent.ancestorIds || []).map((id) => byId.get(id)?.title).filter(Boolean), parent.title].join(' › ');
    const parentHasKids = (parent.planChildCount ?? 0) > 0;
    const parentStart = toIso(parentHasKids ? parent.computed?.startDate ?? parent.startDate : parent.startDate);
    const parentEnd = toIso(parentHasKids ? parent.computed?.endDate ?? parent.endDate : parent.endDate);
    const today = todayIso();

    let estimatedEffort: number | null = null;
    let effortHint: string | null = null;
    const num = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.')) || 0);
    if (!parentHasKids) {
        const remaining = Math.max(0, num(parent.estimatedEffort) - num(parent.actualEffort));
        if (remaining > 0) { estimatedEffort = Math.round(remaining * 10) / 10; effortHint = `lo que le queda a "${parent.title}"`; }
    } else {
        const open = planTasks.filter((t) => t.parentId === parent.id && isWorkable(t) && !CLOSED.has(t.status) && num(t.estimatedEffort) > 0);
        if (open.length) {
            estimatedEffort = Math.round((open.reduce((s, t) => s + num(t.estimatedEffort), 0) / open.length) * 10) / 10;
            effortHint = `tamaño medio de sus ${open.length} tarea(s) abiertas`;
        }
    }

    return {
        ...base,
        description: `Parte de: ${path}` + (parent.description ? `\n\n${parent.description}` : ''),
        startDate: parentStart && parentStart > today ? parentStart : today,
        endDate: parentEnd,
        clientDeadline: parent.clientDeadline ?? null,
        estimatedEffort,
        effortHint,
        responsible: parent.raci?.responsible?.[0] ?? '',
        priority: parent.priority ?? 'medium',
    };
}

export interface CreatePlanTaskParams {
    mode: AddMode;
    parent: Task | null;
    draft: PlanTaskDraft;
    project: Project;
    tenantId: string;
    userId: string;
    planTasks: Task[];
    addDoc: (ref: any, data: any) => Promise<{ id: string }>;
}

/** Alta de una tarea del plan creada en UniTask (planOrigin 'unitask', viaja en la exportación). */
export async function createPlanTask({ mode, parent, draft, project, tenantId, userId, planTasks, addDoc }: CreatePlanTaskParams): Promise<string> {
    if (!draft.title.trim()) throw new Error('El título es obligatorio.');
    const parentId = mode === 'loose' ? null : parent?.id ?? null;

    // Lanza con mensaje claro si se supera la profundidad máxima o hay ciclo
    const ancestorIds = parentId ? recalculateAncestors(parentId, planTasks) : [];

    const siblings = planTasks.filter((t) => (parentId ? t.parentId === parentId : !t.parentId));
    const order = siblings.reduce((max, t) => Math.max(max, t.order ?? 0), 0) + 1000;
    const scope: Record<string, unknown> = {};
    for (const k of ['regionId', 'divisionId', '_accessKey', '_tenantAccessKey'] as const) if (project[k]) scope[k] = project[k];

    const data: Record<string, unknown> = {
        title: draft.title.trim(),
        description: draft.description,
        status: 'pending',
        projectId: project.id,
        projectCode: project.code || null,
        tenantId,
        ...scope,
        type: 'task',
        ancestorIds,
        order,
        planRole: 'leaf',
        planOrigin: 'unitask',
        planPath: (parent?.planPath ? parent.planPath + ' › ' : '') + normalizeName(draft.title),
        startDate: draft.startDate,
        endDate: draft.endDate,
        estimatedEffort: draft.estimatedEffort,
        priority: draft.priority,
        dependencies: draft.dependencies,
        progressV13: { actual: 0, planned: 0 },
        creationSource: 'manual_main',
    };
    if (parentId) data.parentId = parentId;
    if (draft.clientDeadline) data.clientDeadline = draft.clientDeadline;
    if (draft.responsible.trim()) data.raci = { responsible: [draft.responsible.trim()], accountable: [], consulted: [], informed: [] };
    if (parent && mode !== 'loose') {
        if (parent.area) data.area = parent.area;
        if (parent.module) data.module = parent.module;
        if (parent.attributes) data.attributes = parent.attributes;
    }

    return createTask(data as any, userId, addDoc, project.name);
}

export interface DiscardBlockParams {
    node: Task;
    planTasks: Task[];
    reason: string;
    tenantId: string;
    user: { uid: string; email?: string | null; displayName?: string | null };
}

/**
 * "Descartar bloque" (§5): marca como fuera de alcance las tareas trabajables abiertas bajo un hito o
 * padre; el nodo se cierra solo por propagación. Deja traza en task_activities de cada tarea.
 */
export async function discardBlock({ node, planTasks, reason, tenantId, user }: DiscardBlockParams): Promise<number> {
    if (!reason.trim()) throw new Error('Indica el motivo del descarte.');
    const targets = planTasks.filter((t) => (t.ancestorIds || []).includes(node.id) && isWorkable(t) && !CLOSED.has(t.status));
    for (let i = 0; i < targets.length; i += 200) {
        const batch = writeBatch(db);
        for (const t of targets.slice(i, i + 200)) {
            batch.update(doc(db, 'tasks', t.id), { status: 'out_of_scope', closedAt: serverTimestamp(), closedBy: user.uid, updatedAt: serverTimestamp() });
            batch.set(doc(collection(db, 'task_activities')), {
                taskId: t.id,
                tenantId,
                userId: user.uid,
                userEmail: user.email ?? null,
                userName: user.displayName || 'Usuario',
                type: 'status_change',
                details: `Fuera de alcance por descarte del bloque "${node.title}": ${reason.trim()}`,
                createdAt: serverTimestamp(),
            });
        }
        await batch.commit();
    }
    return targets.length;
}
