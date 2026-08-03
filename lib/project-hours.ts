import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import {
    startOfDay, endOfDay, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, addWeeks, isAfter,
} from "date-fns";
import { format } from "date-fns";
import { AgendaEntry, ResultStatus } from "@/types/agenda";
import { Project, ProjectPhase } from "@/types";

// ─── Periodo temporal ──────────────────────────────────────────────────────────

export type PeriodKind = 'day' | 'week' | 'month' | 'range';

/** Rango inclusivo en hora LOCAL (nunca UTC — ver regla de fechas del proyecto). */
export interface PeriodRange { from: Date; to: Date; }

/** Construye el rango [from, to] para día/semana/mes a partir de una fecha ancla. */
export function buildPeriodRange(kind: Exclude<PeriodKind, 'range'>, anchor: Date): PeriodRange {
    switch (kind) {
        case 'day':   return { from: startOfDay(anchor),  to: endOfDay(anchor) };
        case 'week':  return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
        case 'month': return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    }
}

/** Rango personalizado (horquilla): normaliza a inicio/fin de día local e inclusivo. */
export function customRange(fromIso: string, toIso: string): PeriodRange {
    const from = startOfDay(new Date(fromIso + 'T00:00:00'));
    const to   = endOfDay(new Date(toIso + 'T00:00:00'));
    return isAfter(from, to) ? { from: startOfDay(new Date(toIso + 'T00:00:00')), to: endOfDay(new Date(fromIso + 'T00:00:00')) } : { from, to };
}

function toDate(ts: any): Date {
    if (!ts) return new Date(0);
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts.seconds === 'number')  return new Date(ts.seconds * 1000);
    return new Date(ts);
}

/** Lunes (ISO 'yyyy-MM-dd') de cada semana que solapa el rango — para reutilizar el
 *  índice agenda_entries(tenantId, weekStart) sin crear uno nuevo por `date`. */
function listWeekStarts(range: PeriodRange): string[] {
    const out: string[] = [];
    let cursor = startOfWeek(range.from, { weekStartsOn: 1 });
    const last = startOfWeek(range.to, { weekStartsOn: 1 });
    // tope de seguridad: 2 años de semanas
    for (let i = 0; i < 110 && !isAfter(cursor, last); i++) {
        out.push(format(cursor, 'yyyy-MM-dd'));
        cursor = addWeeks(cursor, 1);
    }
    return out;
}

// ─── Acceso a datos por rango ───────────────────────────────────────────────────

/** Registro real de tiempo (colección consultantTasks, escrita por TaskControllerWidget). */
export interface ConsultantTaskLite {
    id: string;
    projectId?: string;
    projectName?: string;
    taskTypeId?: string;
    taskTypeName?: string;
    durationMinutes: number;
    userId?: string;
    userName?: string;
    type?: string;       // 'live' | 'retroactive'
    createdAt?: any;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/** Horas PLANIFICADAS: agenda_entries dentro del rango. Reutiliza el índice
 *  (tenantId, weekStart) agrupando las semanas del rango en bloques de hasta 30 (límite de
 *  Firestore para 'in') en vez de una query por semana — un rango de vida de proyecto de 2 años
 *  (~104 semanas) hace 4 peticiones en vez de 104. */
export async function getAgendaEntriesRange(tenantId: string, range: PeriodRange): Promise<AgendaEntry[]> {
    const weekStarts = listWeekStarts(range);
    const weekChunks = chunkArray(weekStarts, 30);
    const chunks = await Promise.all(weekChunks.map(wc =>
        getDocs(query(
            collection(db, "agenda_entries"),
            where("tenantId", "==", tenantId),
            where("weekStart", "in", wc),
        ))
    ));
    const all = chunks.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() } as AgendaEntry)));
    return all.filter(e => {
        if (e.isActive === false) return false;
        const d = toDate(e.date);
        return d >= range.from && d <= range.to;
    });
}

/** Horas REALES: consultantTasks por createdAt dentro del rango (índice (tenantId, createdAt)).
 *  Nota: las tareas 'retroactive' se fechan por createdAt, no por la fecha real del trabajo. */
export async function getConsultantTasksRange(tenantId: string, range: PeriodRange): Promise<ConsultantTaskLite[]> {
    const snap = await getDocs(query(
        collection(db, "consultantTasks"),
        where("tenantId", "==", tenantId),
        where("createdAt", ">=", Timestamp.fromDate(range.from)),
        where("createdAt", "<=", Timestamp.fromDate(range.to)),
    ));
    return snap.docs.map(d => {
        const data = d.data() as any;
        return {
            id: d.id,
            projectId: data.projectId,
            projectName: data.projectName,
            taskTypeId: data.taskTypeId,
            taskTypeName: data.taskTypeName,
            durationMinutes: Number(data.durationMinutes) || 0,
            userId: data.userId,
            userName: data.userName,
            type: data.type,
            createdAt: data.createdAt,
        } as ConsultantTaskLite;
    });
}

// ─── Salud por horas (semáforo) ──────────────────────────────────────────────────

export const HOURS_HEALTH_THRESHOLDS = { warn: 0.8, over: 1.0 } as const;
export type HoursHealth = 'none' | 'healthy' | 'warn' | 'over';

/** Semáforo según consumo REAL frente al presupuesto. */
export function hoursHealth(real: number, budget: number): HoursHealth {
    if (!budget || budget <= 0) return 'none';
    const ratio = real / budget;
    if (ratio > HOURS_HEALTH_THRESHOLDS.over) return 'over';
    if (ratio >= HOURS_HEALTH_THRESHOLDS.warn) return 'warn';
    return 'healthy';
}

// ─── Agregación por proyecto / fase ──────────────────────────────────────────────

export interface PhaseHours {
    phaseId: string;
    name: string;
    color?: string;
    budget: number;
    planned: number;
    real: number;
}

export interface ProjectHours {
    projectId: string;
    name: string;
    code: string;
    color: string;
    hasBudget: boolean;
    budget: number;
    planned: number;
    real: number;
    health: HoursHealth;
    byPhase: PhaseHours[];
    unphased: { planned: number; real: number };
    /** Entradas de agenda que pertenecen a este proyecto (para informes de detalle). */
    matchedEntries: AgendaEntry[];
}

const PHASE_NONE = '__none__';

/** Combina presupuesto + agendado + realizado (agenda) por proyecto y fase.
 *  - planned: suma de scheduledHours de todas las entradas activas (agendado total)
 *  - real:    suma de scheduledHours de entradas con result === HECHO (trabajo completado)
 *  Resolución de proyecto: primero por projectId; si es null, por nombre de cliente (e.client)
 *  contra project.name / project.clientName / project.code. Lo no mapeado cae en `unphased`. */
export function aggregateProjectHours(
    projects: Project[],
    entries: AgendaEntry[],
    tasks: ConsultantTaskLite[],   // reservado para integración de timer — no se usa aún
): ProjectHours[] {
    const projById = new Map(projects.map(p => [p.id, p]));

    // Índice de nombres/códigos para matching cuando projectId es null.
    const nameIndex = new Map<string, string>(); // upperCase → projectId
    projects.forEach(p => {
        if (p.name)       nameIndex.set(p.name.trim().toUpperCase(), p.id);
        if ((p as any).clientName) nameIndex.set((p as any).clientName.trim().toUpperCase(), p.id);
        if (p.code)       nameIndex.set(p.code.trim().toUpperCase(), p.id);
    });

    const resolveId = (e: AgendaEntry): string | null => {
        if (e.projectId) return e.projectId;
        const client = (e as any).client?.trim().toUpperCase() ?? '';
        if (!client) return null;
        // 1. Coincidencia exacta (name, clientName, code)
        const exact = nameIndex.get(client);
        if (exact) return exact;
        // 2. Coincidencia parcial: el nombre del proyecto empieza por el cliente o viceversa
        for (const [id, p] of projById) {
            const pName = p.name?.trim().toUpperCase() ?? '';
            if (pName && (pName.startsWith(client) || client.startsWith(pName))) return id;
            const pClient = (p as any).clientName?.trim().toUpperCase() ?? '';
            if (pClient && (pClient.startsWith(client) || client.startsWith(pClient))) return id;
        }
        return null;
    };

    const acc = new Map<string, ProjectHours>();

    const ensure = (projectId: string, fallback?: { name?: string; code?: string; color?: string }): ProjectHours => {
        let row = acc.get(projectId);
        if (row) return row;
        const p = projById.get(projectId);
        const phases = p?.budgetPhases ?? [];
        const budgetFromPhases = phases.reduce((s, ph) => s + (Number(ph.hours) || 0), 0);
        const budget = (p?.budgetHours && p.budgetHours > 0) ? p.budgetHours : budgetFromPhases;
        row = {
            projectId,
            name:  p?.name  ?? fallback?.name  ?? projectId,
            code:  p?.code  ?? fallback?.code  ?? '',
            color: p?.color ?? fallback?.color ?? '#6b7280',
            hasBudget: budget > 0,
            budget,
            planned: 0,
            real: 0,
            health: 'none',
            byPhase: phases.map((ph: ProjectPhase) => ({
                phaseId: ph.id, name: ph.name, color: ph.color,
                budget: Number(ph.hours) || 0, planned: 0, real: 0,
            })),
            unphased: { planned: 0, real: 0 },
            matchedEntries: [],
        };
        acc.set(projectId, row);
        return row;
    };

    // Semilla con proyectos con presupuesto (aparecen aunque no haya horas en el periodo).
    projects.forEach(p => {
        const phases = p.budgetPhases ?? [];
        const hasBudget = (p.budgetHours ?? 0) > 0 || phases.some(ph => (ph.hours ?? 0) > 0);
        if (hasBudget) ensure(p.id);
    });

    // Horas de agenda: planned = todas las entradas; real = solo HECHO.
    entries.forEach(e => {
        const projectId = resolveId(e);
        if (!projectId) return;
        // Un proyecto desactivado (ej. baja en producción) no debe generar fila aunque la entrada
        // traiga projectId denormalizado — `projects` ya viene filtrado a activos por el caller
        // (getActiveProjects), así que si no está en projById es que se dio de baja.
        if (!projById.has(projectId)) return;
        const row = ensure(projectId, { name: e.projectName || e.client, code: e.projectCode, color: e.projectColor });
        row.matchedEntries.push(e);
        const h = Number(e.scheduledHours) || 0;
        if (h <= 0) return;
        row.planned += h;
        if (e.result === ResultStatus.HECHO) row.real += h;
        const p = projById.get(projectId);
        const phaseId = p?.phaseMapping?.activityToPhase?.[e.activityType] ?? PHASE_NONE;
        const phase = phaseId !== PHASE_NONE ? row.byPhase.find(ph => ph.phaseId === phaseId) : undefined;
        if (phase) {
            phase.planned += h;
            if (e.result === ResultStatus.HECHO) phase.real += h;
        } else {
            row.unphased.planned += h;
            if (e.result === ResultStatus.HECHO) row.unphased.real += h;
        }
    });

    // Timer (consultantTasks) — integración pendiente, se ignora por ahora.
    void tasks;

    const rows = [...acc.values()];
    rows.forEach(r => { r.health = hoursHealth(r.planned, r.budget); });
    // Orden: primero los que tienen presupuesto, luego por horas reales desc, luego planificadas.
    rows.sort((a, b) =>
        (Number(b.hasBudget) - Number(a.hasBudget)) ||
        (b.real - a.real) ||
        (b.planned - a.planned)
    );
    return rows;
}

/** Totales de cartera para los KPIs del Resumen. */
export function portfolioTotals(rows: ProjectHours[]) {
    const budget  = rows.reduce((s, r) => s + r.budget, 0);
    const planned = rows.reduce((s, r) => s + r.planned, 0);
    const real    = rows.reduce((s, r) => s + r.real, 0);
    const pctBudget = budget > 0 ? (real / budget) * 100 : 0;
    return { budget, planned, real, pctBudget };
}
