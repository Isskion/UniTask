/**
 * [Plan] Escritura de una reimportación (docs/plan-import-design.md §4). La lógica (emparejar,
 * diferencias, decisiones → escrituras) está en planReimport.ts; aquí solo se lee y se escribe.
 *
 * - El lote queda en `plan_imports` (kind 'reimport') con altas, valores previos de lo modificado y
 *   archivados, para poder deshacer.
 * - Las altas llevan `importKind: 'reimport'`: a diferencia de la importación inicial, sí disparan
 *   planRollup, que recalcula sus padres (y promueve a "padre" una tarea que recibe hijas).
 */
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, query, where, writeBatch, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Project, Task, PlanImport } from '@/types';
import { inferResponsibleSide, type ParsedPlan } from './planParser';
import { buildReimportOps, type ReimportDecisions, type ReimportDiff } from './planReimport';

const BATCH_SIZE = 400;

export interface ReimportContext {
    planTasks: Task[];          // del plan, incluidas las archivadas
    lastTaskNumber: number;     // de todas las tareas del proyecto
    milestoneLevel: number | null; // del último lote aplicado
}

export async function loadReimportContext(projectId: string, tenantId: string): Promise<ReimportContext> {
    const [tasksSnap, importsSnap] = await Promise.all([
        getDocs(query(collection(db, 'tasks'), where('projectId', '==', projectId), where('tenantId', '==', tenantId))),
        getDocs(query(collection(db, 'plan_imports'), where('projectId', '==', projectId), where('tenantId', '==', tenantId))),
    ]);
    const all = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
    const imports = importsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as PlanImport))
        .filter((i) => i.status === 'applied')
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    return {
        planTasks: all.filter((t) => !!t.planRole),
        lastTaskNumber: all.reduce((max, t) => Math.max(max, t.taskNumber || 0), 0),
        milestoneLevel: imports[0]?.milestoneLevel ?? null,
    };
}

export interface ApplyReimportParams {
    project: Project;
    tenantId: string;
    userId: string;
    fileName: string;
    plan: ParsedPlan;
    context: ReimportContext;
    diff: ReimportDiff;
    decisions: ReimportDecisions;
    onProgress?: (done: number, total: number) => void;
}

export async function applyReimport(p: ApplyReimportParams): Promise<{ importId: string; stats: Record<string, number> }> {
    const importRef = doc(collection(db, 'plan_imports'));
    const importId = importRef.id;
    const ops = buildReimportOps(p.plan, p.context.planTasks, p.diff, p.decisions, {
        project: p.project,
        tenantId: p.tenantId,
        userId: p.userId,
        importId,
        newId: () => doc(collection(db, 'tasks')).id,
        lastTaskNumber: p.context.lastTaskNumber,
        prefix: (p.project.name || 'TSK').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X'),
        now: serverTimestamp(),
        responsibleOf: (name) => inferResponsibleSide(name, p.project.clientName),
    });

    const importDoc: Omit<PlanImport, 'id'> = {
        projectId: p.project.id,
        tenantId: p.tenantId,
        fileName: p.fileName,
        kind: 'reimport',
        milestoneLevel: p.plan.milestoneLevel,
        createdBy: p.userId,
        createdAt: serverTimestamp(),
        created: [],
        updated: [],
        archived: [],
        status: 'applying',
        stats: ops.stats,
        warnings: p.plan.warnings.map((w) => ({ code: w.code, severity: w.severity, message: w.message, rows: (w.rows || []).slice(0, 200) })),
    };
    await setDoc(importRef, importDoc);

    // Altas primero (los padres nuevos existen antes que nada apunte a ellos), luego cambios
    type Op = { kind: 'create' | 'update'; id: string; data: Record<string, unknown> };
    const all: Op[] = [
        ...ops.creates.map((c) => ({ kind: 'create' as const, id: c.id, data: c.data })),
        ...ops.updates.map((u) => ({ kind: 'update' as const, id: u.id, data: u.data })),
    ];
    const createdIds: string[] = [];
    const updatedIds = new Set<string>();
    try {
        for (let i = 0; i < all.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const slice = all.slice(i, i + BATCH_SIZE);
            for (const op of slice) {
                if (op.kind === 'create') batch.set(doc(db, 'tasks', op.id), op.data);
                else batch.update(doc(db, 'tasks', op.id), op.data);
            }
            await batch.commit();
            for (const op of slice) (op.kind === 'create' ? createdIds.push(op.id) : updatedIds.add(op.id));
            p.onProgress?.(Math.min(i + BATCH_SIZE, all.length), all.length);
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[PlanReimport] Falló la escritura del lote', importId, 'tras', createdIds.length, 'altas y', updatedIds.size, 'cambios:', err);
        await updateDoc(importRef, {
            status: 'failed', error: message, created: createdIds,
            updated: ops.updates.filter((u) => updatedIds.has(u.id)).map((u) => ({ taskId: u.id, before: u.before })),
            archived: ops.archivedIds.filter((id) => updatedIds.has(id)),
        }).catch(() => { /* el error original es el relevante */ });
        throw new Error(`La reimportación se cortó tras ${createdIds.length} altas y ${updatedIds.size} cambios (${message}). Lo aplicado queda registrado en el lote ${importId}.`);
    }

    await updateDoc(importRef, {
        status: 'applied',
        created: createdIds,
        updated: ops.updates.map((u) => ({ taskId: u.id, before: u.before })),
        archived: ops.archivedIds,
    });
    return { importId, stats: ops.stats };
}
