/**
 * [Plan] Escritura de un plan importado como árbol de tareas (docs/plan-import-design.md §2).
 *
 * - Todas las tareas pertenecen al proyecto declarado (D4) y heredan su ámbito (región/división).
 * - Entran como `pending`, salvo las hojas al 100 % en el Excel, que entran en Aprobación Final
 *   (`completed`, cerradas en su fecha de Fin). El % parcial se descarta (D9).
 * - Los nodos con hijos llevan ya `computed` y `planChildCount`, calculados con el mismo código que
 *   la Cloud Function planRollup; las altas con `importId` no disparan recálculos.
 * - `friendlyId`/`taskNumber` se asignan aquí de una vez (mismo formato que lib/tasks.ts): con
 *   friendlyId presente, la función generateFriendlyId no hace nada → sin 600 transacciones
 *   sobre el mismo contador.
 * - Se registra el lote en `plan_imports` (status applying → applied | failed) para poder deshacer.
 */
import { db } from '@/lib/firebase';
import {
    collection, doc, getDocs, query, where, writeBatch, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import type { Project, Task, PlanImport } from '@/types';
import { CLOSED_STATUSES, statusProgress } from '@/functions/src/planRollupCore';
import { inferResponsibleSide, type ParsedPlan, type PlanNode } from './planParser';
import { computeInitialStates, siblingOrder } from './planInitialState';
import { baselineOf } from './planReimport';
import { buildPlanTrail, composePlanTitle } from './planTitle';

const BATCH_SIZE = 400;

export interface ImportPlanParams {
    project: Project;
    tenantId: string;
    userId: string;
    fileName: string;
    plan: ParsedPlan;
    onProgress?: (done: number, total: number) => void;
}

export interface ImportPlanResult {
    importId: string;
    created: number;
}

/** Tareas de plan ya existentes en el proyecto (para impedir una segunda importación inicial). */
export async function loadPlanTasks(projectId: string, tenantId: string): Promise<Task[]> {
    const snap = await getDocs(query(
        collection(db, 'tasks'),
        where('projectId', '==', projectId),
        where('tenantId', '==', tenantId),
    ));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task)).filter((t) => !!t.planRole);
}

const TASK_TYPE: Record<string, Task['type']> = {
    group: 'epic', milestone: 'milestone', gate: 'milestone', parent: 'task', leaf: 'task',
};

export async function importPlan({ project, tenantId, userId, fileName, plan, onProgress }: ImportPlanParams): Promise<ImportPlanResult> {
    // 1. Un proyecto, un plan inicial (la reimportación es el paso 6)
    const projectTasksSnap = await getDocs(query(
        collection(db, 'tasks'),
        where('projectId', '==', project.id),
        where('tenantId', '==', tenantId),
    ));
    const existing = projectTasksSnap.docs.map((d) => d.data() as Task);
    if (existing.some((t) => !!t.planRole)) {
        throw new Error('Este proyecto ya tiene un plan importado. La reimportación con comparación de cambios llegará en el siguiente paso; de momento no se puede importar otro encima.');
    }

    // 2. Numeración de tareas: continúa la del proyecto (mismo esquema que lib/tasks.ts)
    let taskNumber = existing.reduce((max, t) => Math.max(max, t.taskNumber || 0), 0);
    const prefix = (project.name || 'TSK').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');

    // 3. IDs de Firestore pre-generados → parentId / ancestorIds resueltos antes de escribir
    const idOf = new Map<string, string>();
    for (const n of plan.nodes) idOf.set(n.key, doc(collection(db, 'tasks')).id);
    const byKey = new Map(plan.nodes.map((n) => [n.key, n]));
    const ancestorNodes = (n: PlanNode): PlanNode[] => {
        const chain: PlanNode[] = [];
        let p = n.parentKey ? byKey.get(n.parentKey) : undefined;
        while (p) { chain.unshift(p); p = p.parentKey ? byKey.get(p.parentKey) : undefined; }
        return chain;
    };
    const ancestorsOf = (n: PlanNode): string[] => ancestorNodes(n).map((p) => idOf.get(p.key)!);
    const trailOf = (n: PlanNode) => buildPlanTrail(ancestorNodes(n).map((p) => ({ id: idOf.get(p.key)!, code: p.code, name: p.name, role: p.role })));

    // 4. Estado inicial (mismo cálculo que la vista previa y que planRollup)
    const likeOf = computeInitialStates(plan);

    // 5. Lote de importación (antes de escribir tareas: si algo falla queda rastro)
    const importRef = doc(collection(db, 'plan_imports'));
    const importId = importRef.id;
    const stats = { ...plan.roleCounts, total: plan.nodes.length } as Record<string, number>;
    const importDoc: Omit<PlanImport, 'id'> = {
        projectId: project.id,
        tenantId,
        fileName,
        kind: 'initial',
        milestoneLevel: plan.milestoneLevel,
        createdBy: userId,
        createdAt: serverTimestamp(),
        created: [],
        updated: [],
        archived: [],
        status: 'applying',
        stats,
        warnings: plan.warnings.map((w) => ({ code: w.code, severity: w.severity, message: w.message, rows: (w.rows || []).slice(0, 200) })),
    };
    await setDoc(importRef, importDoc);

    // 6. Tareas, en lotes
    const scope: Record<string, unknown> = {};
    for (const k of ['regionId', 'divisionId', '_accessKey', '_tenantAccessKey'] as const) {
        if (project[k]) scope[k] = project[k];
    }
    const orderIndex = siblingOrder(plan);

    const createdIds: string[] = [];
    try {
        for (let i = 0; i < plan.nodes.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const batchIds: string[] = [];
            for (const n of plan.nodes.slice(i, i + BATCH_SIZE)) {
                const like = likeOf.get(n.key)!;
                const id = idOf.get(n.key)!;
                taskNumber++;
                const responsible = inferResponsibleSide(n.name, project.clientName);
                const data: Record<string, unknown> = {
                    title: composePlanTitle(n.code, n.name),
                    description: n.notes || '',
                    status: like.status,
                    isActive: true,
                    tenantId,
                    projectId: project.id,
                    projectCode: project.code || null,
                    ...scope,
                    type: TASK_TYPE[n.role],
                    ancestorIds: ancestorsOf(n),
                    order: orderIndex.get(n.key),
                    planRole: n.role,
                    planCode: n.code,
                    planPath: n.path,
                    planOrigin: 'import',
                    importId,
                    importKind: 'initial',
                    lastImportId: importId,
                    planBaseline: baselineOf(n),
                    planTrail: trailOf(n),
                    externalSource: { system: 'excel_plan', id: n.path },
                    startDate: n.start,
                    endDate: n.end,
                    priority: 'medium',
                    progressV13: like.computed
                        ? { actual: like.computed.progress ?? 0, planned: 0, aggregated: like.computed.progress ?? 0 }
                        : { actual: statusProgress(like.status), planned: 0 },
                    friendlyId: `${prefix}-${taskNumber}`,
                    taskNumber,
                    creationSource: 'import',
                    createdBy: userId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                if (n.parentKey) data.parentId = idOf.get(n.parentKey);
                if (CLOSED_STATUSES.has(String(like.status))) {
                    // Cerrada en su Fin del Excel (no hoy): no infla el burndown del día de la importación
                    const end = like.computed ? like.computed.endDate : n.end;
                    const endDate = typeof end === 'string' ? new Date(end) : null;
                    data.closedAt = endDate && !Number.isNaN(endDate.getTime()) ? endDate : serverTimestamp();
                    data.closedBy = 'system:planImport';
                }
                if (!n.children.length) data.estimatedEffort = like.estimatedEffort ?? null;
                if (n.children.length) {
                    data.planChildCount = n.children.length;
                    if (like.computed) data.computed = { ...like.computed, updatedAt: serverTimestamp() };
                }
                if (responsible) data.raci = { responsible: [responsible], accountable: [], consulted: [], informed: [] };
                batch.set(doc(db, 'tasks', id), data);
                batchIds.push(id);
            }
            await batch.commit();
            createdIds.push(...batchIds);
            onProgress?.(Math.min(i + BATCH_SIZE, plan.nodes.length), plan.nodes.length);
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[PlanImport] Falló la escritura del lote', importId, 'tras', createdIds.length, 'tareas:', err);
        await updateDoc(importRef, { status: 'failed', created: createdIds, error: message }).catch(() => { /* el error original es el relevante */ });
        throw new Error(`La importación se cortó tras crear ${createdIds.length} de ${plan.nodes.length} tareas (${message}). Quedan registradas en el lote ${importId} para poder deshacerlas.`);
    }

    await updateDoc(importRef, { status: 'applied', created: createdIds });
    return { importId, created: createdIds.length };
}
