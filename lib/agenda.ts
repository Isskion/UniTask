import { db } from "@/lib/firebase";
import {
    collection, addDoc, updateDoc, doc, getDoc,
    query, where, onSnapshot, getDocs,
    serverTimestamp, Timestamp,
} from "firebase/firestore";
import {
    AgendaEntry, AgendaConsultant, ActivityType, ResultStatus,
    JiraExportRow, MSProjectExportRow,
} from "@/types/agenda";
import {
    parseComment, parseHours, normalizeSchedule, buildJiraRecord,
    getDayType, getWeekLabel, getWeekMonth, getWeekNumber, getYearMonth,
    getWeekStart, generateJiraCSV, generateMSProjectCSV, downloadCSV,
    resultToPercent,
} from "@/lib/agenda-utils";
import { format } from "date-fns";

const ENTRIES_COLLECTION    = "agenda_entries";
const CONSULTANTS_COLLECTION = "agenda_consultants";

// ─── Real-time Subscriptions ──────────────────────────────────────────────────

/** Subscribes to all active entries for a given week (Mon ISO string).
 *  Uses only equality filters to avoid requiring composite indexes.
 *  Sorting and isActive filtering are applied client-side.
 */
export function subscribeToWeekEntries(
    tenantId: string,
    weekStartIso: string,
    callback: (entries: AgendaEntry[]) => void
): () => void {
    const q = query(
        collection(db, ENTRIES_COLLECTION),
        where("tenantId",  "==", tenantId),
        where("weekStart", "==", weekStartIso)
    );

    return onSnapshot(q, snap => {
        const entries = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as AgendaEntry))
            .filter(e => e.isActive !== false)
            .sort((a, b) => {
                if (a.consultantOrder !== b.consultantOrder) return a.consultantOrder - b.consultantOrder;
                const da = (a.date as any)?.seconds ?? 0;
                const db_ = (b.date as any)?.seconds ?? 0;
                return da - db_;
            });
        callback(entries);
    }, err => {
        console.error("[agenda] subscribeToWeekEntries error:", err);
        callback([]);
    });
}

/** Subscribes to all active consultants for a tenant.
 *  Sorted client-side by sortOrder to avoid composite index requirement.
 */
export function subscribeToConsultants(
    tenantId: string,
    callback: (consultants: AgendaConsultant[]) => void
): () => void {
    const q = query(
        collection(db, CONSULTANTS_COLLECTION),
        where("tenantId", "==", tenantId)
    );

    return onSnapshot(q, snap => {
        const list = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as AgendaConsultant))
            .filter(c => c.isActive !== false)
            .sort((a, b) => a.sortOrder - b.sortOrder);
        callback(list);
    }, err => {
        console.error("[agenda] subscribeToConsultants error:", err);
        callback([]);
    });
}

// ─── Entry CRUD ───────────────────────────────────────────────────────────────

export interface CreateEntryInput {
    tenantId: string;
    consultantId: string;
    consultantName: string;
    consultantOrder: number;
    region: string;
    date: Date;
    activityType: ActivityType;
    comment: string;
    scheduleRaw: string;
    result: ResultStatus;
    // Project (SAM-scoped — regionId/divisionId come from the project itself)
    projectId?:    string;
    projectName?:  string;
    projectCode?:  string;
    projectColor?: string;
    linkedTaskId?: string;
    createdBy: string;
}

export async function createAgendaEntry(input: CreateEntryInput): Promise<string> {
    const { client, description } = parseComment(input.comment);
    const { scheduleRaw, scheduleStart, scheduleEnd } = normalizeSchedule(input.scheduleRaw);
    const scheduledHours = parseHours(scheduleRaw);
    const jiraRecord     = buildJiraRecord(input.activityType, client, description);
    const weekDate       = getWeekStart(input.date);
    const weekStartIso   = format(weekDate, 'yyyy-MM-dd');
    const dayType        = getDayType(input.date);
    const weekNumber     = getWeekNumber(input.date);
    const weekLabel      = getWeekLabel(input.date);
    const weekMonth      = getWeekMonth(input.date);
    const yearMonth      = getYearMonth(input.date);

    const payload = {
        tenantId:        input.tenantId,
        date:            Timestamp.fromDate(input.date),
        weekStart:       weekStartIso,
        weekLabel,
        weekMonth,
        weekNumber,
        yearMonth,
        dayType,
        consultantId:    input.consultantId,
        consultantName:  input.consultantName,
        consultantOrder: input.consultantOrder,
        region:          input.region,
        activityType:    input.activityType,
        comment:         input.comment,
        client,
        description,
        scheduleRaw,
        scheduleStart,
        scheduleEnd,
        scheduledHours,
        result:          input.result,
        jiraRecord,
        projectId:       input.projectId    || null,
        projectName:     input.projectName  || null,
        projectCode:     input.projectCode  || null,
        projectColor:    input.projectColor || null,
        linkedTaskId:    input.linkedTaskId || null,
        createdBy:       input.createdBy,
        createdAt:       serverTimestamp(),
        updatedAt:       serverTimestamp(),
        isActive:        true,
    };

    const ref = await addDoc(collection(db, ENTRIES_COLLECTION), payload);
    return ref.id;
}

export interface UpdateEntryInput {
    activityType?: ActivityType;
    comment?: string;
    scheduleRaw?: string;
    result?: ResultStatus;
    projectId?:    string | null;
    projectName?:  string | null;
    projectCode?:  string | null;
    projectColor?: string | null;
    linkedTaskId?: string;
}

export async function updateAgendaEntry(id: string, input: UpdateEntryInput): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (input.activityType !== undefined) updates.activityType = input.activityType;
    if (input.result       !== undefined) updates.result       = input.result;
    if (input.linkedTaskId !== undefined) updates.linkedTaskId = input.linkedTaskId;
    if (input.projectId    !== undefined) updates.projectId    = input.projectId;
    if (input.projectName  !== undefined) updates.projectName  = input.projectName;
    if (input.projectCode  !== undefined) updates.projectCode  = input.projectCode;
    if (input.projectColor !== undefined) updates.projectColor = input.projectColor;

    if (input.comment !== undefined) {
        const { client, description } = parseComment(input.comment);
        updates.comment     = input.comment;
        updates.client      = client;
        updates.description = description;
        const activity = input.activityType as ActivityType | undefined;
        if (activity) updates.jiraRecord = buildJiraRecord(activity, client, description);
    }

    if (input.scheduleRaw !== undefined) {
        const { scheduleRaw, scheduleStart, scheduleEnd } = normalizeSchedule(input.scheduleRaw);
        updates.scheduleRaw    = scheduleRaw;
        updates.scheduleStart  = scheduleStart;
        updates.scheduleEnd    = scheduleEnd;
        updates.scheduledHours = parseHours(scheduleRaw);
    }

    await updateDoc(doc(db, ENTRIES_COLLECTION, id), updates);
}

export async function deleteAgendaEntry(id: string): Promise<void> {
    await updateDoc(doc(db, ENTRIES_COLLECTION, id), {
        isActive:  false,
        updatedAt: serverTimestamp(),
    });
}

// ─── Consultant CRUD ──────────────────────────────────────────────────────────

export async function createConsultant(data: Omit<AgendaConsultant, 'id' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, CONSULTANTS_COLLECTION), {
        ...data,
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateConsultant(id: string, data: Partial<Pick<AgendaConsultant, 'name' | 'sortOrder' | 'region' | 'isActive'>>): Promise<void> {
    await updateDoc(doc(db, CONSULTANTS_COLLECTION, id), data);
}

export async function getConsultants(tenantId: string): Promise<AgendaConsultant[]> {
    const q = query(
        collection(db, CONSULTANTS_COLLECTION),
        where("tenantId", "==", tenantId)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as AgendaConsultant))
        .filter(c => c.isActive !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportJira(entries: AgendaEntry[], filename?: string): void {
    const rows: JiraExportRow[] = entries
        .filter(e => e.isActive)
        .map(e => {
            const date = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string);
            return {
                fecha:             format(date, 'dd/MM/yyyy'),
                diaSemana:         format(date, 'EEEE', { locale: undefined }).toUpperCase(),
                consultor:         e.consultantName,
                actividad:         e.activityType,
                cliente:           e.client,
                registroJira:      e.jiraRecord,
                horasPlanificadas: e.scheduledHours,
                semanaMes:         e.weekMonth,
                resultado:         e.result,
            };
        });

    const csv = generateJiraCSV(rows);
    downloadCSV(csv, filename || `jira-export-${format(new Date(), 'yyyyMMdd')}.csv`);
}

export function exportMSProject(entries: AgendaEntry[], filename?: string): void {
    const rows: MSProjectExportRow[] = entries
        .filter(e => e.isActive)
        .map(e => {
            const date = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string);
            return {
                fecha:                format(date, 'dd/MM/yyyy'),
                recurso:              e.consultantName,
                tarea:                e.jiraRecord,
                horasPlanificadas:    e.scheduledHours,
                porcentajeCompletado: resultToPercent(e.result),
                estado:               e.result,
            };
        });

    const csv = generateMSProjectCSV(rows);
    downloadCSV(csv, filename || `msproject-export-${format(new Date(), 'yyyyMMdd')}.csv`);
}

// ─── SAM Masters ──────────────────────────────────────────────────────────────

export interface SAMRegion { id: string; name: string; }

export async function loadSAMRegions(tenantId: string): Promise<SAMRegion[]> {
    try {
        const snap = await getDoc(doc(db, 'global_data', `regions_${tenantId}`));
        if (!snap.exists()) return [];
        return (snap.data().items as SAMRegion[]) || [];
    } catch (err) {
        console.error('[agenda] loadSAMRegions:', err);
        return [];
    }
}

