/**
 * [Plan] Lector de planes de proyecto exportados de MS Project a Excel (docs/plan-import-design.md §2).
 *
 * Lógica pura (sin Firebase ni DOM): recibe las filas de la hoja como matriz y devuelve el árbol con
 * el rol de cada fila y los avisos. La jerarquía se obtiene, por orden de preferencia, de:
 *   1. columna "Nivel de esquema" / "Outline Level";
 *   2. columna "Número de esquema" / EDT (nº de segmentos);
 *   3. sangría del nombre (MS Project exporta 3 espacios por nivel) ← caso Transpais;
 *   4. nº de segmentos del código embebido en el nombre ("III.1.4.2 Configurar…").
 * Los códigos EDT NO se usan para colgar filas de su padre: en planes reales se repiten y saltan.
 */
import type { PlanRole } from '@/types';

export interface PlanWarning {
    code:
        | 'duplicate_codes' | 'no_code' | 'milestone_without_children' | 'summary_without_detail'
        | 'above_milestone_without_children' | 'level_jump' | 'predecessors_ignored' | 'parallel_effort'
        | 'percent_ignored' | 'completed_from_excel' | 'overdue' | 'duplicate_path' | 'no_milestones';
    severity: 'info' | 'warning';
    message: string;
    rows?: number[];
}

export interface PlanNode {
    key: string;               // id temporal estable dentro del fichero ("r12")
    rowNumber: number;         // fila de Excel (1-based) para referencias en avisos
    level: number;             // 0 = raíz
    code: string | null;       // código EDT tal como viene
    name: string;              // nombre sin código
    durationDays: number | null;
    effortDays: number | null; // columna Esfuerzo/Trabajo convertida a días (8 h = 1 día)
    predecessors: string | null; // columna Predecesoras normalizada ("12;15"); agrupa tareas en paralelo
    /** Esfuerzo de la hoja en días: Esfuerzo del Excel; si no hay, su Duración, repartida si va en paralelo. */
    leafEffortDays: number | null;
    /** Nº de tareas del grupo paralelo con el que comparte esfuerzo (≥ 2), o null. */
    parallelGroupSize: number | null;
    start: string | null;      // ISO de medianoche local (mismo formato que el selector de fechas de tareas)
    end: string | null;
    notes: string | null;
    uniTaskId: string | null;  // columna "UniTask ID" de un Excel exportado por UniTask (emparejamiento exacto)
    percent: number | null;    // "% completado" del Excel, 0–100 (solo decide si una hoja entra cerrada)
    bold: boolean;             // MS Project marca en negrita las tareas resumen
    parentKey: string | null;
    children: PlanNode[];
    role: PlanRole;
    path: string;              // ruta normalizada de nombres desde la raíz (clave de emparejamiento)
}

/** Profundidad candidata a hito: nº de niveles por debajo del flujo (o nivel absoluto si no hay flujos). */
export interface PlanLevelInfo { level: number; count: number; sample: string }

export interface ParsedPlan {
    roots: PlanNode[];
    nodes: PlanNode[];         // preorden
    warnings: PlanWarning[];
    levels: PlanLevelInfo[];
    /** true si se detectaron flujos ("III.1") y la profundidad del hito se cuenta desde ellos. */
    flowMode: boolean;
    milestoneLevel: number;
    suggestedMilestoneLevel: number;
    roleCounts: Record<PlanRole, number>;
    hasPercentColumn: boolean;
}

export const HOURS_PER_DAY = 8; // D7

// ─── Utilidades ─────────────────────────────────────────────────────────────

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Normalización usada en las rutas de emparejamiento. */
export function normalizeName(s: string): string {
    return norm(s).replace(/[^a-z0-9#/ ]/g, '');
}

const HEADER_ALIASES: Record<string, string[]> = {
    name: ['nombre de tarea', 'nombre', 'task name', 'name'],
    wbs: ['numero de esquema', 'edt', 'wbs', 'outline number'],
    level: ['nivel de esquema', 'outline level'],
    duration: ['duracion', 'duration'],
    start: ['comienzo', 'inicio', 'start'],
    end: ['fin', 'finalizacion', 'finish'],
    effort: ['esfuerzo', 'trabajo', 'work'],
    notes: ['notas', 'notes'],
    predecessors: ['predecesoras', 'depende de', 'predecessors'],
    percent: ['% completado', '% complete'],
    uniTaskId: ['unitask id'],
};

/** Código EDT al inicio del nombre: "III.1.4.2 Texto", "V.1. Texto", "1.1.2 Texto". */
const CODE_RE = /^([IVX]+(?:\.\d+[A-Za-z]?)+|\d+(?:\.\d+[A-Za-z]?)*)\.?\s+(.+)$/;

export function splitCode(raw: string): { code: string | null; name: string } {
    const m = raw.trim().match(CODE_RE);
    if (!m) return { code: null, name: raw.trim() };
    return { code: m[1], name: m[2].trim() };
}

const segments = (code: string | null) => (code ? code.split('.').filter(Boolean).length : 0);

/** "20 d", "1 d?", "182,25 días", "3 sem", "16 h", "2 meses" → días. */
export function parseDurationDays(v: unknown): number | null {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v;
    const m = String(v).trim().match(/^([\d.,]+)\s*([a-zA-Záéíóú]*)/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    const u = norm(m[2]);
    if (u.startsWith('h')) return n / HOURS_PER_DAY;
    if (u.startsWith('sem') || u.startsWith('w')) return n * 5;
    if (u.startsWith('mes') || u.startsWith('mo')) return n * 20;
    return n; // d, día, días, day, sin unidad
}

/** "% completado": fracción de Excel (1 = 100 %), número 0–100 o texto "100%" → 0–100. */
export function parsePercent(v: unknown): number | null {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? (v <= 1 ? v * 100 : v) : null;
    const m = String(v).trim().match(/^([\d.,]+)\s*(%?)/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return m[2] === '%' || n > 1 ? n : n * 100;
}

/**
 * Fila que entra ya en Aprobación Final (`completed`): trabajable (sin hijos, no control) y al 100 %
 * en el Excel. Padres, hitos con tareas y controles no miran su %: su estado se calcula.
 */
export function isCompletedInExcel(n: Pick<PlanNode, 'percent' | 'children' | 'role'>): boolean {
    return n.children.length === 0 && n.role !== 'gate' && (n.percent ?? 0) >= 100;
}

/** "2982 horas" → días; números sin unidad se interpretan como horas (columna Trabajo de MS Project). */
export function parseEffortDays(v: unknown): number | null {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v / HOURS_PER_DAY;
    const m = String(v).trim().match(/^([\d.,]+)\s*([a-zA-Záéíóú]*)/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    const u = norm(m[2]);
    if (u.startsWith('d')) return n;
    return n / HOURS_PER_DAY;
}

const toLocalIso = (y: number, m: number, d: number) => {
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) || dt.getDate() !== d ? null : dt.toISOString();
};

/** Serie de Excel, Date, "lun 07/09/26", "07/09/2026", "2026-09-07" → ISO de medianoche local. */
export function parsePlanDate(v: unknown): string | null {
    if (v == null || v === '') return null;
    if (v instanceof Date) return toLocalIso(v.getFullYear(), v.getMonth() + 1, v.getDate());
    if (typeof v === 'number') {
        const ms = Math.round((v - 25569) * 86400 * 1000);
        const d = new Date(ms);
        return toLocalIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    const s = String(v).trim();
    let m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
        const y = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
        return toLocalIso(y, parseInt(m[2], 10), parseInt(m[1], 10));
    }
    m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return toLocalIso(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
    return null;
}

function findHeader(rows: unknown[][]): { index: number; cols: Record<string, number> } | null {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const row = (rows[i] || []).map((c) => norm(String(c ?? '')));
        const cols: Record<string, number> = {};
        for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
            const idx = row.findIndex((h) => aliases.includes(h));
            if (idx !== -1) cols[field] = idx;
        }
        if (cols.name !== undefined) return { index: i, cols };
    }
    return null;
}

// ─── Lectura ────────────────────────────────────────────────────────────────

export interface ParseOptions {
    /** Profundidad del hito: niveles por debajo del flujo ("III.1"); sin flujos, nivel absoluto (0 = raíz).
     *  Si se omite: 2 desde el flujo (D2). */
    milestoneLevel?: number;
    /** Negrita por fila (1-based), si el llamante la ha leído (xlsx no la expone en sheet_to_json). */
    boldRows?: Set<number>;
    today?: Date;
}

export function parsePlanRows(rows: unknown[][], opts: ParseOptions = {}): ParsedPlan {
    const header = findHeader(rows);
    if (!header) {
        throw new Error('No se encuentra la fila de cabeceras: el Excel debe tener una columna "Nombre de tarea" (o "Nombre" / "Task Name").');
    }
    const { cols } = header;
    const warnings: PlanWarning[] = [];

    // 1. Filas planas
    type Flat = Omit<PlanNode, 'level' | 'parentKey' | 'children' | 'role' | 'path' | 'leafEffortDays' | 'parallelGroupSize'> & {
        indent: number; explicitLevel: number | null; wbsSegments: number; hasPredecessors: boolean;
    };
    const flat: Flat[] = [];
    for (let i = header.index + 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const rawName = row[cols.name];
        if (rawName == null || String(rawName).trim() === '') continue;
        const nameStr = String(rawName);
        const indent = nameStr.length - nameStr.replace(/^[\s ]+/, '').length;
        const wbsRaw = cols.wbs !== undefined ? String(row[cols.wbs] ?? '').trim() : '';
        const split = splitCode(nameStr);
        const code = wbsRaw || split.code;
        const lvlRaw = cols.level !== undefined ? parseInt(String(row[cols.level] ?? ''), 10) : NaN;
        flat.push({
            key: `r${i + 1}`,
            rowNumber: i + 1,
            code,
            name: split.name,
            durationDays: cols.duration !== undefined ? parseDurationDays(row[cols.duration]) : null,
            effortDays: cols.effort !== undefined ? parseEffortDays(row[cols.effort]) : null,
            predecessors: cols.predecessors !== undefined ? normalizePredecessors(row[cols.predecessors]) : null,
            start: cols.start !== undefined ? parsePlanDate(row[cols.start]) : null,
            end: cols.end !== undefined ? parsePlanDate(row[cols.end]) : null,
            notes: cols.notes !== undefined && row[cols.notes] != null && String(row[cols.notes]).trim() !== '' ? String(row[cols.notes]).trim() : null,
            percent: cols.percent !== undefined ? parsePercent(row[cols.percent]) : null,
            uniTaskId: cols.uniTaskId !== undefined && String(row[cols.uniTaskId] ?? '').trim() !== '' ? String(row[cols.uniTaskId]).trim() : null,
            bold: opts.boldRows?.has(i + 1) ?? false,
            indent,
            explicitLevel: Number.isFinite(lvlRaw) ? lvlRaw : null,
            wbsSegments: wbsRaw ? segments(wbsRaw) : 0,
            hasPredecessors: cols.predecessors !== undefined && String(row[cols.predecessors] ?? '').trim() !== '',
        });
    }
    if (flat.length === 0) throw new Error('El Excel no tiene filas de tareas debajo de la cabecera.');

    // 2. Nivel de cada fila
    let levelOf: (f: Flat) => number;
    if (flat.every((f) => f.explicitLevel !== null)) {
        const min = Math.min(...flat.map((f) => f.explicitLevel!));
        levelOf = (f) => f.explicitLevel! - min;
    } else if (cols.wbs !== undefined && flat.every((f) => f.wbsSegments > 0)) {
        const min = Math.min(...flat.map((f) => f.wbsSegments));
        levelOf = (f) => f.wbsSegments - min;
    } else if (flat.some((f) => f.indent > 0)) {
        const indents = [...new Set(flat.map((f) => f.indent).filter((n) => n > 0))].sort((a, b) => a - b);
        const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
        const unit = indents.reduce((g, n) => gcd(g, n), indents[0]) || 1;
        const min = Math.min(...flat.map((f) => f.indent));
        levelOf = (f) => Math.round((f.indent - min) / unit);
    } else {
        levelOf = (f) => Math.max(0, segments(f.code) - 1);
    }

    // 3. Árbol por pila de niveles
    const nodes: PlanNode[] = [];
    const roots: PlanNode[] = [];
    const stack: PlanNode[] = [];
    const jumps: number[] = [];
    for (const f of flat) {
        let level = levelOf(f);
        while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
        const parent = stack[stack.length - 1] ?? null;
        if (parent && level > parent.level + 1) { jumps.push(f.rowNumber); level = parent.level + 1; }
        if (!parent && level > 0) { level = 0; }
        const { indent: _i, explicitLevel: _e, wbsSegments: _w, hasPredecessors: _p, ...rest } = f;
        const node: PlanNode = { ...rest, level, parentKey: parent?.key ?? null, children: [], role: 'leaf', path: '', leafEffortDays: null, parallelGroupSize: null };
        if (parent) parent.children.push(node); else roots.push(node);
        nodes.push(node);
        stack.push(node);
    }
    if (jumps.length) warnings.push({ code: 'level_jump', severity: 'warning', rows: jumps, message: `${jumps.length} fila(s) saltan más de un nivel de sangría; se cuelgan del nivel inmediato superior.` });

    // 4. Profundidad del hito (D2: "dos números contados desde el flujo").
    // Un flujo es una fila con código de dos segmentos ("III.1"). Cada fila mide su profundidad desde
    // su flujo, así un flujo mal sangrado en el Excel (Transpais: "III.4" un nivel por encima de los
    // demás) no descoloca sus hitos. Sin flujos detectables, se usa el nivel absoluto.
    const flowOf = new Map<string, PlanNode | null>();
    for (const n of nodes) {
        if (segments(n.code) === 2) flowOf.set(n.key, n);
        else flowOf.set(n.key, n.parentKey ? flowOf.get(n.parentKey) ?? null : null);
    }
    const flowMode = nodes.some((n) => segments(n.code) === 2);
    const depthOf = (n: PlanNode) => {
        const f = flowOf.get(n.key);
        return flowMode ? (f ? n.level - f.level : -1) : n.level;
    };

    const levelMap = new Map<number, PlanLevelInfo>();
    for (const n of nodes) {
        const d = depthOf(n);
        if (d < 0) continue;
        const info = levelMap.get(d) ?? { level: d, count: 0, sample: `${n.code ? n.code + ' ' : ''}${n.name}` };
        info.count++;
        levelMap.set(d, info);
    }
    const levels = [...levelMap.values()].sort((a, b) => a.level - b.level);
    const maxDepth = levels.length ? levels[levels.length - 1].level : 0;
    const suggested = flowMode ? Math.min(2, maxDepth) : Math.max(0, maxDepth - 2);
    const milestoneLevel = opts.milestoneLevel ?? suggested;

    // 5. Roles
    const roleCounts: Record<PlanRole, number> = { group: 0, milestone: 0, parent: 0, leaf: 0, gate: 0 };
    const individual: number[] = [];
    const aboveNoChildren: number[] = [];
    const summaryNoDetail: number[] = [];
    for (const n of nodes) {
        const hasChildren = n.children.length > 0;
        const depth = depthOf(n); // -1 = fuera de cualquier flujo (Etapas, raíz…)
        if (!hasChildren && n.durationDays === 0) n.role = 'gate';
        else if (depth < milestoneLevel) n.role = hasChildren ? 'group' : 'leaf';
        else if (depth === milestoneLevel) n.role = 'milestone';
        else n.role = hasChildren ? 'parent' : 'leaf';

        if (n.role === 'milestone' && !hasChildren) individual.push(n.rowNumber);
        if (n.role === 'leaf' && depth < milestoneLevel) aboveNoChildren.push(n.rowNumber);
        if (!hasChildren && n.bold && n.role !== 'gate') summaryNoDetail.push(n.rowNumber);
        roleCounts[n.role]++;
    }
    if (roleCounts.milestone === 0) warnings.push({ code: 'no_milestones', severity: 'warning', message: `No hay ninguna fila en el nivel de hito elegido. Elige otro nivel.` });
    if (individual.length) warnings.push({ code: 'milestone_without_children', severity: 'info', rows: individual, message: `${individual.length} hito(s) sin tareas: se tratarán como hitos individuales (se cierran a mano).` });
    if (aboveNoChildren.length) warnings.push({ code: 'above_milestone_without_children', severity: 'warning', rows: aboveNoChildren, message: `${aboveNoChildren.length} fila(s) por encima del nivel de hito no tienen hijos: se importan como tareas sueltas del agrupador.` });
    if (summaryNoDetail.length) warnings.push({ code: 'summary_without_detail', severity: 'warning', rows: summaryNoDetail, message: `${summaryNoDetail.length} tarea(s) resumen (negrita en MS Project) llegan sin detalle: pendientes de desglosar.` });

    // 5b. Esfuerzo de las hojas. Tareas hermanas con la misma predecesora arrancan juntas y las hace
    // el mismo equipo a la vez: comparten el esfuerzo (4 tareas de 4 d = 4 d entre las cuatro, no 16).
    // Con duraciones distintas, el grupo vale la mayor y se reparte en proporción a cada duración.
    const parallel = assignLeafEffort(nodes);
    if (parallel.groups) warnings.push({
        code: 'parallel_effort', severity: 'info', rows: parallel.rows,
        message: `${parallel.rows.length} tarea(s) en ${parallel.groups} grupo(s) en paralelo (misma predecesora bajo el mismo padre) comparten el esfuerzo: ${fmtDays(parallel.before)} d → ${fmtDays(parallel.after)} d.`,
    });

    // 6. Rutas de emparejamiento
    const byKey = new Map(nodes.map((n) => [n.key, n]));
    const seenPaths = new Map<string, number>();
    const dupPaths: number[] = [];
    for (const n of nodes) {
        const parentPath = n.parentKey ? byKey.get(n.parentKey)!.path : '';
        let path = (parentPath ? parentPath + ' › ' : '') + normalizeName(n.name);
        const seen = seenPaths.get(path) ?? 0;
        seenPaths.set(path, seen + 1);
        if (seen > 0) { dupPaths.push(n.rowNumber); path = `${path} #${seen + 1}`; }
        n.path = path;
    }
    if (dupPaths.length) warnings.push({ code: 'duplicate_path', severity: 'warning', rows: dupPaths, message: `${dupPaths.length} fila(s) repiten nombre bajo el mismo padre; se distinguen por orden de aparición (#2, #3…).` });

    // 7. Calidad de datos
    const codeCount = new Map<string, number[]>();
    for (const n of nodes) if (n.code) codeCount.set(n.code, [...(codeCount.get(n.code) ?? []), n.rowNumber]);
    const dups = [...codeCount.entries()].filter(([, r]) => r.length > 1);
    if (dups.length) warnings.push({
        code: 'duplicate_codes', severity: 'info', rows: dups.flatMap(([, r]) => r),
        message: `${dups.length} código(s) EDT repetidos (p. ej. ${dups.slice(0, 3).map(([c, r]) => `${c} ×${r.length}`).join(', ')}). No afecta: la jerarquía sale de la sangría.`,
    });
    const firstCodedLevel = Math.min(...nodes.filter((n) => n.code).map((n) => n.level), Infinity);
    const noCode = nodes.filter((n) => !n.code && n.level >= firstCodedLevel).map((n) => n.rowNumber);
    if (noCode.length) warnings.push({ code: 'no_code', severity: 'info', rows: noCode, message: `${noCode.length} fila(s) sin código EDT; se colocan por su sangría.` });
    if (flat.some((f) => f.hasPredecessors)) warnings.push({ code: 'predecessors_ignored', severity: 'info', message: 'Las predecesoras solo se usan para agrupar tareas en paralelo (esfuerzo compartido); todavía no se importan como dependencias entre tareas.' });
    const hasPercentColumn = cols.percent !== undefined;
    const doneRows = nodes.filter(isCompletedInExcel).map((n) => n.rowNumber);
    if (doneRows.length) warnings.push({ code: 'completed_from_excel', severity: 'info', rows: doneRows, message: `${doneRows.length} tarea(s) al 100 % en el Excel entran en Aprobación Final (fecha de cierre = su Fin). Sus hitos y padres se calculan a partir de ellas.` });
    const partialRows = nodes.filter((n) => n.children.length === 0 && n.role !== 'gate' && (n.percent ?? 0) > 0 && (n.percent ?? 0) < 100).map((n) => n.rowNumber);
    if (partialRows.length) warnings.push({ code: 'percent_ignored', severity: 'info', rows: partialRows, message: `${partialRows.length} tarea(s) con avance parcial en el Excel entran como pendientes: solo el 100 % se importa (el avance se calcula en UniTask).` });
    const today = opts.today ?? new Date();
    const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const overdue = nodes.filter((n) => (n.role === 'leaf' || n.role === 'gate' || (n.role === 'milestone' && !n.children.length)) && !isCompletedInExcel(n) && n.end && Date.parse(n.end) < todayMs).map((n) => n.rowNumber);
    if (overdue.length) warnings.push({ code: 'overdue', severity: 'info', rows: overdue, message: `${overdue.length} tarea(s) tienen fecha de fin ya pasada; entran como pendientes y aparecerán vencidas.` });

    return { roots, nodes, warnings, levels, flowMode, milestoneLevel, suggestedMilestoneLevel: suggested, roleCounts, hasPercentColumn };
}

/** "12;15" ordenado y sin espacios; tipos y desfases de MS Project se conservan ("479FF"). */
export function normalizePredecessors(v: unknown): string | null {
    if (v == null) return null;
    const parts = String(v).split(/[;,]/).map((p) => p.trim().toUpperCase().replace(/\s+/g, '')).filter(Boolean);
    return parts.length ? [...new Set(parts)].sort().join(';') : null;
}

const fmtDays = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-ES');

/**
 * Fija `leafEffortDays` y `parallelGroupSize` en las hojas trabajables (sin hijos y no gate).
 * Grupo paralelo = hojas hermanas (mismo padre) con las mismas predecesoras y sin Esfuerzo propio.
 */
export function assignLeafEffort(nodes: PlanNode[]): { groups: number; rows: number[]; before: number; after: number } {
    const groups = new Map<string, PlanNode[]>();
    for (const n of nodes) {
        if (n.children.length) continue;
        if (n.role === 'gate') { n.leafEffortDays = n.effortDays ?? n.durationDays; continue; }
        if (n.effortDays != null) { n.leafEffortDays = n.effortDays; continue; }
        n.leafEffortDays = n.durationDays;
        if (!n.predecessors || !(n.durationDays && n.durationDays > 0)) continue;
        const k = `${n.parentKey ?? ''}|${n.predecessors}`;
        groups.set(k, [...(groups.get(k) ?? []), n]);
    }
    const out = { groups: 0, rows: [] as number[], before: 0, after: 0 };
    for (const list of groups.values()) {
        if (list.length < 2) continue;
        const sum = list.reduce((s, n) => s + n.durationDays!, 0);
        const max = Math.max(...list.map((n) => n.durationDays!));
        out.groups++;
        out.before += sum;
        out.after += max;
        for (const n of list) {
            n.leafEffortDays = Math.round((n.durationDays! * max / sum) * 1000) / 1000;
            n.parallelGroupSize = list.length;
            out.rows.push(n.rowNumber);
        }
    }
    return out;
}

/** Responsable deducido del prefijo del nombre ("Transpais …" → cliente, "UNI …" → Unigis). */
export function inferResponsibleSide(name: string, clientName?: string): string | null {
    const n = norm(name);
    if (/^(uni|unigis)\b/.test(n)) return 'Unigis';
    const client = clientName ? norm(clientName).split(' ')[0] : '';
    if ((client && n.startsWith(client)) || /^(transpais|trnp)\b/.test(n)) return clientName || 'Transpais';
    return null;
}
