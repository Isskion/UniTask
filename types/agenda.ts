import { Timestamp } from "firebase/firestore";
import { Circle, PauseCircle, CheckCircle2, XCircle, LucideIcon } from "lucide-react";

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ActivityType {
    REUNION_CLIENTE    = 'Reunión Cliente',
    REUNION_UNIGIS     = 'Reunión UNIGIS',
    REUNION_PRESENCIAL = 'Reunión Presencial',
    REUNION_INTERNA    = 'Reunión Interna',
    COMERCIAL          = 'Comercial',
    TAREAS_A_REALIZAR  = 'Tareas a Realizar',
    VACACIONES         = 'Vacaciones',
    VIAJE              = 'Viaje',
    ESPECIAL           = 'Especial',
}

export enum ResultStatus {
    POR_HACER = 'Por Hacer',
    EN_PAUSA  = 'En pausa',
    HECHO     = 'Hecho',
    CANCELADO = 'Cancelado',
}

export enum DayType {
    DH  = 'DH',  // Día Hábil
    DNH = 'DNH', // Día No Hábil (festivo)
    FDS = 'FDS', // Fin de Semana
}

export type ConsultantRegion = string;

// ─── Core Documents ───────────────────────────────────────────────────────────

export interface AgendaEntry {
    id: string;
    tenantId: string;

    // Date & calendar
    date: Timestamp;
    weekStart: string;      // ISO Monday: '2026-05-11'
    weekLabel: string;      // 'Semana 1'
    weekMonth: string;      // 'Semana 1-MAY 2026'
    weekNumber: number;     // ISO week of year
    yearMonth: string;      // '2026-05'
    dayType: DayType;

    // Consultant
    consultantId: string;   // Firebase uid
    consultantName: string;
    consultantOrder: number;
    region: ConsultantRegion;

    // Task
    activityType: ActivityType;
    comment: string;        // raw: 'CLIENTE / DESCRIPCION'
    client: string;         // extracted from comment
    description: string;    // extracted from comment

    // Schedule
    scheduleRaw: string;    // '9:00 A 11:30'
    scheduleStart: string;  // '09:00'
    scheduleEnd: string;    // '11:30'
    scheduledHours: number; // 2.5

    // Division
    divisionId:   string;   // e.g. 'Consultoría'
    divisionName: string;   // display name (same as id for now)

    // Result
    result: ResultStatus;

    // Project
    projectId?:   string;   // Firestore project doc id
    projectName?: string;   // desnormalizado para queries/display
    projectCode?: string;   // código corto (ej: "UNIG")
    projectColor?: string;  // color hex para el badge

    // Integration
    jiraRecord: string;     // 'Reunión Cliente: CLIENTE->DESCRIPCION'
    linkedTaskId?: string;  // optional link to UniTask task

    // Metadata
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isActive: boolean;

    // Import quality flag
    /** True when this entry came from an Excel import whose Fecha_T cell was broken/empty — the
     *  date was inferred from the week + day column and the schedule was dropped (no hours) until
     *  someone confirms the real date (edit it, or delete and re-import once the source is fixed). */
    needsDateReview?: boolean;
}

export interface AgendaConsultant {
    id: string;
    tenantId: string;
    userId: string;         // Firebase uid — links to UserProfile
    name: string;
    sortOrder: number;
    region: ConsultantRegion;  // primary region (display, legacy single-region)
    regions?: string[];        // all regions this consultant covers; '*' means global
    divisions: string[];       // e.g. ['Consultoría'] or ['Consultoría', 'Tecnología']
    isActive: boolean;
    createdAt: Timestamp;
    /** Alternate Excel names that should resolve to this consultant (e.g. nicknames, short names). Stored uppercase. */
    aliases?: string[];
}

// ─── Translation key maps (use with t(ACTIVITY_TKEYS[type])) ─────────────────

export const ACTIVITY_TKEYS: Record<ActivityType, string> = {
    [ActivityType.REUNION_CLIENTE]:    'agenda.actMeetingClient',
    [ActivityType.REUNION_UNIGIS]:     'agenda.actMeetingUnigis',
    [ActivityType.REUNION_PRESENCIAL]: 'agenda.actMeetingPresential',
    [ActivityType.REUNION_INTERNA]:    'agenda.actMeetingInternal',
    [ActivityType.COMERCIAL]:          'agenda.actCommercial',
    [ActivityType.TAREAS_A_REALIZAR]:  'agenda.actTask',
    [ActivityType.VACACIONES]:         'agenda.actVacation',
    [ActivityType.VIAJE]:              'agenda.actTravel',
    [ActivityType.ESPECIAL]:           'agenda.actSpecial',
};

export const RESULT_TKEYS: Record<ResultStatus, string> = {
    [ResultStatus.POR_HACER]: 'agenda.resPending',
    [ResultStatus.EN_PAUSA]:  'agenda.resOnHold',
    [ResultStatus.HECHO]:     'agenda.resDone',
    [ResultStatus.CANCELADO]: 'agenda.resCancelled',
};

export const DAY_TKEYS: Record<DayType, string> = {
    [DayType.DH]:  'agenda.workday',
    [DayType.DNH]: 'agenda.holiday',
    [DayType.FDS]: 'agenda.weekend',
};

// ─── Display Configuration ────────────────────────────────────────────────────

export interface ActivityConfig {
    label: string;   // Spanish fallback label (also used for Jira export format reference)
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
}

export const ACTIVITY_CONFIG: Record<ActivityType, ActivityConfig> = {
    [ActivityType.REUNION_CLIENTE]: {
        label: 'Reunión Cliente',
        color: '#3B82F6',
        bgClass: 'bg-blue-600/20',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-600/40',
    },
    [ActivityType.REUNION_UNIGIS]: {
        label: 'Reunión UNIGIS',
        color: '#EF4444',
        bgClass: 'bg-red-600/20',
        textClass: 'text-red-700',
        borderClass: 'border-red-600/40',
    },
    [ActivityType.REUNION_PRESENCIAL]: {
        label: 'Reunión Presencial',
        color: '#A855F7',
        bgClass: 'bg-purple-600/20',
        textClass: 'text-purple-700',
        borderClass: 'border-purple-600/40',
    },
    [ActivityType.REUNION_INTERNA]: {
        label: 'Reunión Interna',
        color: '#6B7280',
        bgClass: 'bg-zinc-600/20',
        textClass: 'text-zinc-700',
        borderClass: 'border-zinc-600/40',
    },
    [ActivityType.COMERCIAL]: {
        label: 'Comercial',
        color: '#F59E0B',
        bgClass: 'bg-amber-600/20',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-600/40',
    },
    [ActivityType.TAREAS_A_REALIZAR]: {
        label: 'Tarea',
        color: '#F97316',
        bgClass: 'bg-orange-600/20',
        textClass: 'text-orange-700',
        borderClass: 'border-orange-600/40',
    },
    [ActivityType.VACACIONES]: {
        label: 'Vacaciones',
        color: '#10B981',
        bgClass: 'bg-emerald-600/20',
        textClass: 'text-emerald-700',
        borderClass: 'border-emerald-600/40',
    },
    [ActivityType.VIAJE]: {
        label: 'Viaje',
        color: '#06B6D4',
        bgClass: 'bg-cyan-600/20',
        textClass: 'text-cyan-700',
        borderClass: 'border-cyan-600/40',
    },
    [ActivityType.ESPECIAL]: {
        label: 'Especial',
        color: '#8B5CF6',
        bgClass: 'bg-violet-600/20',
        textClass: 'text-violet-700',
        borderClass: 'border-violet-600/40',
    },
};

export interface ResultConfig {
    label: string;
    dotClass: string;
    textClass: string;
    msProjectPercent: number;
}

export const RESULT_CONFIG: Record<ResultStatus, ResultConfig> = {
    [ResultStatus.POR_HACER]: {
        label: 'Por Hacer',
        dotClass: 'bg-zinc-500',
        textClass: 'text-zinc-600',
        msProjectPercent: 0,
    },
    [ResultStatus.EN_PAUSA]: {
        label: 'En pausa',
        dotClass: 'bg-amber-400',
        textClass: 'text-amber-600',
        msProjectPercent: 50,
    },
    [ResultStatus.HECHO]: {
        label: 'Hecho',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-600',
        msProjectPercent: 100,
    },
    [ResultStatus.CANCELADO]: {
        label: 'Cancelado',
        dotClass: 'bg-red-600',
        textClass: 'text-red-600',
        msProjectPercent: 0,
    },
};

// Icono por estado — sustituye el punto de color en tarjetas/lista por algo legible de un vistazo.
export const RESULT_ICON: Record<ResultStatus, LucideIcon> = {
    [ResultStatus.POR_HACER]: Circle,
    [ResultStatus.EN_PAUSA]:  PauseCircle,
    [ResultStatus.HECHO]:     CheckCircle2,
    [ResultStatus.CANCELADO]: XCircle,
};

export const DAY_TYPE_CONFIG: Record<DayType, { label: string; headerBg: string; headerText: string }> = {
    [DayType.DH]: {
        label: 'Día Hábil',
        headerBg: 'bg-zinc-800',
        headerText: 'text-zinc-100',
    },
    [DayType.DNH]: {
        label: 'Festivo',
        headerBg: 'bg-red-900/60',
        headerText: 'text-red-200',
    },
    [DayType.FDS]: {
        label: 'Fin de Semana',
        headerBg: 'bg-zinc-900',
        headerText: 'text-zinc-500',
    },
};

// ─── Filter State ─────────────────────────────────────────────────────────────

export interface AgendaFilters {
    consultantIds: string[];    // empty = all
    activityTypes: ActivityType[];
    results: ResultStatus[];
    region: ConsultantRegion | 'ALL';
    divisions: string[];        // empty = all
}

export const DEFAULT_FILTERS: AgendaFilters = {
    consultantIds: [],
    activityTypes: [],
    results: [],
    region: 'ALL',
    divisions: [],
};

// ─── Export ───────────────────────────────────────────────────────────────────

export interface JiraExportRow {
    fecha: string;
    diaSemana: string;
    consultor: string;
    actividad: string;
    cliente: string;
    registroJira: string;
    horasPlanificadas: number;
    semanaMes: string;
    resultado: string;
}

export interface MSProjectExportRow {
    fecha: string;
    recurso: string;
    tarea: string;
    horasPlanificadas: number;
    porcentajeCompletado: number;
    estado: string;
}
