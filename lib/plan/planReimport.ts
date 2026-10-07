/**
 * [Plan] Reimportación de un plan sobre el árbol ya existente (docs/plan-import-design.md §4).
 *
 * Lógica pura (sin Firebase): empareja las filas del Excel nuevo con las tareas del plan, calcula
 * qué propone cambiar y, con las decisiones del PM, construye las escrituras.
 *
 * Manda UniTask (D1): cada tarea guarda en `planBaseline` lo que decía el Excel la última vez.
 * Comparación a tres bandas por campo:
 *   Excel = UniTask                 → nada
 *   Excel = base (solo cambió UniTask) → nada: se respeta lo editado en UniTask
 *   UniTask = base (solo cambió Excel) → cambio propuesto (marcado por defecto)
 *   los tres distintos               → conflicto, por defecto se queda UniTask
 *   sin base (lotes anteriores)     → conflicto "sin referencia", por defecto Excel
 *
 * Emparejamiento por capas (de más a menos seguro):
 *   0. columna "UniTask ID" (Excel exportado por UniTask)
 *   1. misma ruta de nombres (`planPath`)
 *   2. mismo nombre bajo el mismo padre emparejado (cambió el código EDT o un antepasado)
 *   3. nombre parecido (≥ 0,85) bajo el mismo padre              → a confirmar
 *   4. mismo nombre, único, en otro sitio del árbol (movida)     → a confirmar
 * Sin pareja → fila nueva. Tarea del Excel que ya no está → se propone archivar (nunca borrar).
 */
import type { Task, PlanBaseline, PlanRole } from '@/types';
import { CLOSED_STATUSES, toMillis } from '@/functions/src/planRollupCore';
import { isCompletedInExcel, normalizeName, type ParsedPlan, type PlanNode } from './planParser';
import { siblingOrder } from './planInitialState';

export const SIMILARITY_THRESHOLD = 0.85;

export type FieldKey = 'title' | 'planCode' | 'startDate' | 'endDate' | 'estimatedEffort';
export const FIELD_LABEL: Record<FieldKey, string> = {
    title: 'Nombre', planCode: 'Código', startDate: 'Comienzo', endDate: 'Fin', estimatedEffort: 'Esfuerzo (d)',
};

export type MatchVia = 'id' | 'path' | 'name' | 'similar' | 'moved';

export interface FieldDiff {
    field: FieldKey;
    excel: unknown;
    uniTask: unknown;
    /** excel: solo cambió el Excel · conflict: cambiaron los dos · no_baseline: tarea sin foto previa */
    kind: 'excel' | 'conflict' | 'no_baseline';
}

export interface MatchedItem {
    node: PlanNode;
    task: Task;
    via: MatchVia;
    score?: number;                 // similitud (via 'similar')
    needsConfirm: boolean;          // via 'similar' | 'moved'
    fields: FieldDiff[];
    close: boolean;                 // 100 % en el Excel y abierta en UniTask → Aprobación Final
    move: { fromParentId: string | null; toParent: ParentRef } | null;
    unarchive: boolean;
    baseline: PlanBaseline;         // foto nueva (se guarda siempre)
}

/** Padre de destino: una tarea existente, una fila nueva del mismo lote o la raíz. */
export type ParentRef = { taskId: string } | { nodeKey: string } | null;

export interface NewItem { node: PlanNode; parent: ParentRef; completed: boolean }

export interface ArchiveItem {
    task: Task;
    hasActivity: boolean;           // estado distinto de pendiente o esfuerzo real registrado
    keptDescendants: number;        // descendientes que siguen en el plan (creados en UniTask o emparejados)
    defaultOn: boolean;
}

export interface ReimportDiff {
    matched: MatchedItem[];
    created: NewItem[];
    archived: ArchiveItem[];
    unchanged: number;              // emparejadas sin ningún cambio que proponer
}

// ─── Utilidades ─────────────────────────────────────────────────────────────

const lastSegment = (path?: string) => (path || '').split(' › ').pop()!.replace(/ #\d+$/, '');
const nameKeys = (t: Task) => new Set([lastSegment(t.planPath), normalizeName(t.title || '')].filter(Boolean));

/** Coeficiente de Dice sobre bigramas (0–1). */
export function similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const grams = (s: string) => {
        const m = new Map<string, number>();
        for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) ?? 0) + 1); }
        return m;
    };
    const ga = grams(a), gb = grams(b);
    let inter = 0;
    for (const [g, n] of ga) inter += Math.min(n, gb.get(g) ?? 0);
    return (2 * inter) / (a.length - 1 + b.length - 1);
}

const dayKey = (v: unknown) => {
    const ms = toMillis(v);
    if (ms === null) return null;
    const d = new Date(ms);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function sameValue(field: FieldKey, a: unknown, b: unknown): boolean {
    if (field === 'startDate' || field === 'endDate') return dayKey(a) === dayKey(b);
    if (field === 'estimatedEffort') {
        const na = a == null || a === '' ? null : Number(a);
        const nb = b == null || b === '' ? null : Number(b);
        if (na === null || nb === null) return na === nb;
        return Math.abs(na - nb) < 0.01;
    }
    return String(a ?? '').trim() === String(b ?? '').trim();
}

const isComputedTask = (t: Task) => (t.planChildCount ?? 0) > 0 || t.planRole === 'gate';
const isWorkable = (t: Task) => t.planRole === 'leaf' || (t.planRole === 'milestone' && !(t.planChildCount ?? 0));

/** Foto de lo que dice el Excel para una fila (base de la comparación a tres bandas). */
export function baselineOf(n: PlanNode): PlanBaseline {
    return {
        title: n.name, planCode: n.code, startDate: n.start, endDate: n.end,
        estimatedEffort: n.children.length ? null : (n.effortDays ?? n.durationDays ?? null),
        percent: n.percent,
    };
}

// ─── Diferencias ────────────────────────────────────────────────────────────

export interface DiffOptions {
    /** Filas (nodeKey) cuya pareja "a confirmar" el PM ha rechazado: entran como nuevas. */
    rejected?: Set<string>;
}

export function computeReimportDiff(plan: ParsedPlan, planTasks: Task[], opts: DiffOptions = {}): ReimportDiff {
    const rejected = opts.rejected ?? new Set<string>();
    // Del plan: vivas o archivadas por una reimportación (pueden volver)
    const tasks = planTasks.filter((t) => !!t.planRole && (t.isActive !== false || t.planStatus === 'archived'));
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const used = new Set<string>();
    const free = (t?: Task) => !!t && !used.has(t.id);

    const byPath = new Map<string, Task[]>();
    for (const t of tasks) if (t.planPath) byPath.set(t.planPath, [...(byPath.get(t.planPath) ?? []), t]);
    const childrenOf = new Map<string, Task[]>();
    for (const t of tasks) {
        const k = t.parentId || '__root__';
        childrenOf.set(k, [...(childrenOf.get(k) ?? []), t]);
    }

    // Unicidad de nombres en el Excel (capa 4: solo si el nombre no se repite)
    const excelNameCount = new Map<string, number>();
    for (const n of plan.nodes) { const k = normalizeName(n.name); excelNameCount.set(k, (excelNameCount.get(k) ?? 0) + 1); }

    const matchOf = new Map<string, { task: Task; via: MatchVia; score?: number }>();
    for (const n of plan.nodes) {
        const name = normalizeName(n.name);
        const parentMatch = n.parentKey ? matchOf.get(n.parentKey) : undefined;
        const parentTaskId = n.parentKey ? parentMatch?.task.id : '__root__';
        const pool = parentTaskId ? (childrenOf.get(parentTaskId) ?? []).filter(free) : [];

        let m: { task: Task; via: MatchVia; score?: number } | undefined;
        if (n.uniTaskId && free(byId.get(n.uniTaskId))) m = { task: byId.get(n.uniTaskId)!, via: 'id' };
        if (!m) { const t = (byPath.get(n.path) ?? []).find(free); if (t) m = { task: t, via: 'path' }; }
        if (!m) { const t = pool.find((c) => nameKeys(c).has(name)); if (t) m = { task: t, via: 'name' }; }
        if (!m && !rejected.has(n.key)) {
            let best: Task | undefined, bestScore = 0;
            for (const c of pool) {
                const s = Math.max(...[...nameKeys(c)].map((k) => similarity(k, name)));
                if (s > bestScore) { bestScore = s; best = c; }
            }
            if (best && bestScore >= SIMILARITY_THRESHOLD) m = { task: best, via: 'similar', score: Math.round(bestScore * 100) / 100 };
        }
        if (!m && !rejected.has(n.key) && excelNameCount.get(name) === 1) {
            const cands = tasks.filter((t) => free(t) && t.planOrigin !== 'unitask' && nameKeys(t).has(name));
            if (cands.length === 1) m = { task: cands[0], via: 'moved' };
        }
        if (m) { matchOf.set(n.key, m); used.add(m.task.id); }
    }

    const parentRefOf = (n: PlanNode): ParentRef => {
        if (!n.parentKey) return null;
        const pm = matchOf.get(n.parentKey);
        return pm ? { taskId: pm.task.id } : { nodeKey: n.parentKey };
    };

    const matched: MatchedItem[] = [];
    const created: NewItem[] = [];
    let unchanged = 0;
    for (const n of plan.nodes) {
        const m = matchOf.get(n.key);
        if (!m) { created.push({ node: n, parent: parentRefOf(n), completed: isCompletedInExcel(n) }); continue; }
        const t = m.task;
        const baseline = baselineOf(n);
        const base = t.planBaseline;

        const fields: FieldDiff[] = [];
        const candidates: [FieldKey, unknown, unknown][] = [
            ['title', baseline.title, t.title],
            ['planCode', baseline.planCode, t.planCode ?? null],
            ['startDate', baseline.startDate, t.startDate ?? null],
            ['endDate', baseline.endDate, t.endDate ?? null],
        ];
        if (!n.children.length && !isComputedTask(t)) candidates.push(['estimatedEffort', baseline.estimatedEffort, t.estimatedEffort ?? null]);
        for (const [field, excel, uni] of candidates) {
            if (sameValue(field, excel, uni)) continue;
            if (!base) { fields.push({ field, excel, uniTask: uni, kind: 'no_baseline' }); continue; }
            const b = base[field];
            if (sameValue(field, excel, b)) continue;                 // solo cambió UniTask: se respeta
            fields.push({ field, excel, uniTask: uni, kind: sameValue(field, uni, b) ? 'excel' : 'conflict' });
        }

        const close = !n.children.length && (n.percent ?? 0) >= 100 && isWorkable(t) &&
            !CLOSED_STATUSES.has(t.status) && !((base?.percent ?? 0) >= 100); // si UniTask la reabrió, no se vuelve a cerrar

        const target = parentRefOf(n);
        const currentParent = t.parentId || null;
        const targetId = target && 'taskId' in target ? target.taskId : null;
        const move = (target && 'nodeKey' in target) || targetId !== currentParent
            ? { fromParentId: currentParent, toParent: target } : null;

        const item: MatchedItem = {
            node: n, task: t, via: m.via, score: m.score,
            needsConfirm: m.via === 'similar' || m.via === 'moved',
            fields, close, move, unarchive: t.planStatus === 'archived', baseline,
        };
        if (!fields.length && !close && !move && !item.unarchive && !item.needsConfirm) unchanged++;
        matched.push(item);
    }

    // Tareas del Excel anterior que ya no están
    const keptIds = new Set<string>(used);
    for (const t of tasks) if (t.planOrigin === 'unitask') keptIds.add(t.id);
    const archived: ArchiveItem[] = [];
    for (const t of tasks) {
        if (used.has(t.id) || t.planOrigin === 'unitask' || t.planStatus === 'archived') continue;
        const kept = tasks.filter((d) => (d.ancestorIds || []).includes(t.id) && keptIds.has(d.id) && d.planStatus !== 'archived').length;
        const hasActivity = t.status !== 'pending' || Number(t.actualEffort || 0) > 0;
        archived.push({ task: t, hasActivity, keptDescendants: kept, defaultOn: !hasActivity && kept === 0 });
    }
    return { matched, created, archived, unchanged };
}

// ─── Decisiones y escrituras ────────────────────────────────────────────────

export interface ReimportDecisions {
    /** `${taskId}:${field}` → qué valor gana. Sin entrada: el valor por defecto del tipo de diferencia. */
    fields: Map<string, 'excel' | 'unitask'>;
    /** Claves desmarcadas: `close:${taskId}`, `move:${taskId}`, `unarchive:${taskId}`, `new:${nodeKey}`, `archive:${taskId}` (marcada). */
    off: Set<string>;
    /** Archivados marcados a mano (los que no vienen marcados por defecto). */
    archiveOn: Set<string>;
}

export const emptyDecisions = (): ReimportDecisions => ({ fields: new Map(), off: new Set(), archiveOn: new Set() });

export const defaultChoice = (f: FieldDiff): 'excel' | 'unitask' => (f.kind === 'conflict' ? 'unitask' : 'excel');
export const choiceOf = (d: ReimportDecisions, taskId: string, f: FieldDiff) => d.fields.get(`${taskId}:${f.field}`) ?? defaultChoice(f);
export const archiveChosen = (d: ReimportDecisions, a: ArchiveItem) =>
    a.defaultOn ? !d.off.has(`archive:${a.task.id}`) : d.archiveOn.has(a.task.id);

/** Una fila nueva solo se crea si su padre nuevo también se crea. */
export function newChosen(diff: ReimportDiff, d: ReimportDecisions, nodeKey: string): boolean {
    const byKey = new Map(diff.created.map((c) => [c.node.key, c]));
    let item = byKey.get(nodeKey);
    while (item) {
        if (d.off.has(`new:${item.node.key}`)) return false;
        const p = item.parent;
        item = p && 'nodeKey' in p ? byKey.get(p.nodeKey) : undefined;
    }
    return true;
}

export interface BuildContext {
    project: { id: string; code?: string | null; clientName?: string; regionId?: string; divisionId?: string; _accessKey?: string; _tenantAccessKey?: string };
    tenantId: string;
    userId: string;
    importId: string;
    newId: () => string;
    /** Último taskNumber del proyecto (todas las tareas, no solo las del plan). */
    lastTaskNumber: number;
    prefix: string;
    /** Marca de tiempo del servidor (serverTimestamp() en la app). */
    now: unknown;
    responsibleOf?: (name: string) => string | null;
}

export interface ReimportOps {
    creates: { id: string; data: Record<string, unknown> }[];
    updates: { id: string; data: Record<string, unknown>; before: Record<string, unknown> }[];
    archivedIds: string[];
    stats: Record<string, number>;
}

const TASK_TYPE: Record<PlanRole, Task['type']> = { group: 'epic', milestone: 'milestone', gate: 'milestone', parent: 'task', leaf: 'task' };

export function buildReimportOps(plan: ParsedPlan, planTasks: Task[], diff: ReimportDiff, d: ReimportDecisions, ctx: BuildContext): ReimportOps {
    const order = siblingOrder(plan);
    const updates = new Map<string, { data: Record<string, unknown>; before: Record<string, unknown> }>();
    const touch = (t: Task, field: string, value: unknown) => {
        const u = updates.get(t.id) ?? { data: {}, before: {} };
        if (!(field in u.before)) u.before[field] = (t as unknown as Record<string, unknown>)[field] ?? null;
        u.data[field] = value;
        updates.set(t.id, u);
    };
    const stats = { matched: diff.matched.length, created: 0, fieldsFromExcel: 0, keptUniTask: 0, closed: 0, moved: 0, archived: 0, unarchived: 0 };

    // Padre final de cada tarea del plan (para recalcular ancestorIds al final)
    const parentOf = new Map<string, string | null>();
    for (const t of planTasks) parentOf.set(t.id, t.parentId || null);

    // 1. Altas
    const newIdOf = new Map<string, string>();
    const chosenNew = diff.created.filter((c) => newChosen(diff, d, c.node.key));
    for (const c of chosenNew) newIdOf.set(c.node.key, ctx.newId());
    /** undefined = el padre es una fila nueva que no se crea. */
    const resolveParent = (p: ParentRef): string | null | undefined => (p === null ? null : 'taskId' in p ? p.taskId : newIdOf.get(p.nodeKey));

    const scope: Record<string, unknown> = {};
    for (const k of ['regionId', 'divisionId', '_accessKey', '_tenantAccessKey'] as const) if (ctx.project[k]) scope[k] = ctx.project[k];
    let taskNumber = ctx.lastTaskNumber;
    const creates: ReimportOps['creates'] = [];
    for (const c of chosenNew) {
        const n = c.node;
        const id = newIdOf.get(n.key)!;
        const parentId = resolveParent(c.parent) ?? null; // newChosen garantiza que el padre nuevo existe
        parentOf.set(id, parentId);
        taskNumber++;
        const responsible = ctx.responsibleOf?.(n.name) ?? null;
        const completed = c.completed;
        const data: Record<string, unknown> = {
            title: n.name,
            description: n.notes || '',
            status: completed ? 'completed' : 'pending',
            isActive: true,
            tenantId: ctx.tenantId,
            projectId: ctx.project.id,
            projectCode: ctx.project.code || null,
            ...scope,
            type: TASK_TYPE[n.role],
            order: order.get(n.key),
            planRole: n.role,
            planCode: n.code,
            planPath: n.path,
            planOrigin: 'import',
            importId: ctx.importId,
            importKind: 'reimport',
            lastImportId: ctx.importId,
            planBaseline: baselineOf(n),
            externalSource: { system: 'excel_plan', id: n.path },
            startDate: n.start,
            endDate: n.end,
            priority: 'medium',
            progressV13: { actual: completed ? 100 : 0, planned: 0 },
            friendlyId: `${ctx.prefix}-${taskNumber}`,
            taskNumber,
            creationSource: 'import',
            createdBy: ctx.userId,
            createdAt: ctx.now,
            updatedAt: ctx.now,
        };
        if (parentId) data.parentId = parentId;
        if (!n.children.length) data.estimatedEffort = n.effortDays ?? n.durationDays ?? null;
        if (completed) {
            const end = n.end ? new Date(n.end) : null;
            data.closedAt = end && !Number.isNaN(end.getTime()) ? end : ctx.now;
            data.closedBy = 'system:planImport';
        }
        if (responsible) data.raci = { responsible: [responsible], accountable: [], consulted: [], informed: [] };
        creates.push({ id, data });
    }
    stats.created = creates.length;

    // 2. Emparejadas
    for (const m of diff.matched) {
        const t = m.task;
        for (const f of m.fields) {
            if (choiceOf(d, t.id, f) === 'excel') {
                touch(t, f.field, f.field === 'planCode' ? (f.excel ?? null) : f.excel);
                stats.fieldsFromExcel++;
            } else stats.keptUniTask++;
        }
        if (m.close && !d.off.has(`close:${t.id}`)) {
            touch(t, 'status', 'completed');
            const end = m.node.end ? new Date(m.node.end) : null;
            touch(t, 'closedAt', end && !Number.isNaN(end.getTime()) ? end : ctx.now);
            touch(t, 'closedBy', 'system:planImport');
            touch(t, 'progressV13', { ...(t.progressV13 || { planned: 0 }), actual: 100 });
            stats.closed++;
        }
        if (m.move && !d.off.has(`move:${t.id}`)) {
            const to = resolveParent(m.move.toParent);
            if (to !== undefined && to !== (t.parentId || null)) {
                touch(t, 'parentId', to);
                parentOf.set(t.id, to);
                stats.moved++;
            }
        }
        if (m.unarchive && !d.off.has(`unarchive:${t.id}`)) {
            touch(t, 'planStatus', null);
            touch(t, 'isActive', true);
            stats.unarchived++;
        }
        const o = order.get(m.node.key);
        if (o !== undefined && o !== t.order) touch(t, 'order', o);
        if (t.planPath !== m.node.path) touch(t, 'planPath', m.node.path);
        if (JSON.stringify(t.planBaseline ?? null) !== JSON.stringify(m.baseline)) touch(t, 'planBaseline', m.baseline);
    }

    // 3. Archivados
    const archivedIds: string[] = [];
    for (const a of diff.archived) {
        if (!archiveChosen(d, a)) continue;
        touch(a.task, 'planStatus', 'archived');
        touch(a.task, 'isActive', false);
        archivedIds.push(a.task.id);
    }
    stats.archived = archivedIds.length;

    // 4. ancestorIds coherentes con el árbol final (movidas arrastran a sus descendientes)
    const ancestorsOf = (id: string): string[] => {
        const chain: string[] = [];
        const seen = new Set<string>([id]);
        let p = parentOf.get(id) ?? null;
        while (p && !seen.has(p)) { chain.unshift(p); seen.add(p); p = parentOf.get(p) ?? null; }
        return chain;
    };
    for (const c of creates) c.data.ancestorIds = ancestorsOf(c.id);
    for (const t of planTasks) {
        const next = ancestorsOf(t.id);
        if (JSON.stringify(next) !== JSON.stringify(t.ancestorIds || [])) touch(t, 'ancestorIds', next);
    }

    const updateList: ReimportOps['updates'] = [];
    for (const [id, u] of updates) {
        updateList.push({ id, data: { ...u.data, lastImportId: ctx.importId, updatedAt: ctx.now }, before: u.before });
    }
    return { creates, updates: updateList, archivedIds, stats };
}
