import { format, startOfWeek, endOfWeek, addDays, getISOWeek, getMonth, getYear } from "date-fns";
import { es } from "date-fns/locale";
import { ActivityType, DayType, ResultStatus, JiraExportRow, MSProjectExportRow, RESULT_CONFIG } from "@/types/agenda";
import { MADRID_HOLIDAYS } from "@/lib/holidays";

const MONTH_NAMES_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// ─── Date Utilities ───────────────────────────────────────────────────────────

/** Returns the Monday of the week containing the given date */
export function getWeekStart(date: Date): Date {
    return startOfWeek(date, { weekStartsOn: 1 });
}

/** Returns the Sunday of the week containing the given date */
export function getWeekEnd(date: Date): Date {
    return endOfWeek(date, { weekStartsOn: 1 });
}

/** Returns ISO date string for Monday of the current week: '2026-05-11' */
export function getCurrentWeekStart(): string {
    return format(getWeekStart(new Date()), 'yyyy-MM-dd');
}

/** Returns array of 7 Date objects (Mon–Sun) for a given week start ISO string */
export function getWeekDays(weekStartIso: string): Date[] {
    const monday = new Date(weekStartIso + 'T00:00:00');
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Returns ISO week number of the year: 19 */
export function getWeekNumber(date: Date): number {
    return getISOWeek(date);
}

/** Returns 'Semana N' (position of this week within its calendar month, 1–5) */
export function getWeekLabel(date: Date): string {
    const dayOfMonth = date.getDate();
    const weekInMonth = Math.ceil(dayOfMonth / 7);
    return `Semana ${weekInMonth}`;
}

/** Returns 'Semana N-MMM YYYY' e.g. 'Semana 2-MAY 2026' */
export function getWeekMonth(date: Date): string {
    const label = getWeekLabel(date);
    const month = MONTH_NAMES_ES[getMonth(date)];
    const year = getYear(date);
    return `${label}-${month} ${year}`;
}

/** Returns 'YYYY-MM' e.g. '2026-05' */
export function getYearMonth(date: Date): string {
    return format(date, 'yyyy-MM');
}

/** Classifies a date as DH, DNH, or FDS */
export function getDayType(date: Date): DayType {
    const dow = date.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) return DayType.FDS;
    const iso = format(date, 'yyyy-MM-dd');
    if (MADRID_HOLIDAYS.includes(iso)) return DayType.DNH;
    return DayType.DH;
}

/** Classifies a week relative to today:
 *  same week → 'Semana Actual'
 *  past       → 'Semana Anterior N' (N weeks ago)
 *  future     → 'Futuro'
 */
export function getWeekMark(weekNumber: number, year: number): string {
    const now = new Date();
    const currentWeek = getISOWeek(now);
    const currentYear = getYear(now);

    if (year > currentYear || (year === currentYear && weekNumber > currentWeek)) return 'Futuro';
    if (year === currentYear && weekNumber === currentWeek) return 'Semana Actual';

    // Calculate difference in weeks
    const current = currentYear * 53 + currentWeek;
    const target  = year * 53 + weekNumber;
    const diff = current - target;
    return diff === 1 ? 'Semana Anterior' : `Semana Anterior ${diff}`;
}

/** Formats decimal hours as human-readable: 2.5 → '2h 30m', 1 → '1h', 0.5 → '30m' */
export function formatHours(hours: number): string {
    if (!hours || hours <= 0) return '';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

/** Formats a Date as short day header: 'LUN 11/05' */
export function formatDayHeader(date: Date): { abbr: string; num: string; month: string } {
    return {
        abbr: format(date, 'EEE', { locale: es }).toUpperCase().slice(0, 3),
        num:  format(date, 'd'),
        month: format(date, 'MMM', { locale: es }).toUpperCase().slice(0, 3),
    };
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

/** Parses 'HH:MM A HH:MM' → decimal hours (0 on error) */
export function parseHours(schedule: string): number {
    if (!schedule) return 0;
    const normalized = schedule.toUpperCase().trim().replace(/\s+/g, ' ');
    const parts = normalized.split(/\s+A\s+/);
    if (parts.length !== 2) return 0;

    const parseTime = (t: string): number => {
        const [h, m] = t.trim().split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return NaN;
        return h * 60 + m;
    };

    const start = parseTime(parts[0]);
    const end   = parseTime(parts[1]);
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.round(((end - start) / 60) * 100) / 100;
}

/** Normalizes a raw schedule string to 'HH:MM A HH:MM' */
export function normalizeSchedule(raw: string): { scheduleRaw: string; scheduleStart: string; scheduleEnd: string } {
    if (!raw) return { scheduleRaw: '', scheduleStart: '', scheduleEnd: '' };
    const normalized = raw.toUpperCase().trim().replace(/\s+/g, ' ');
    const parts = normalized.split(/\s+A\s+/);
    if (parts.length !== 2) return { scheduleRaw: normalized, scheduleStart: '', scheduleEnd: '' };

    const padTime = (t: string): string => {
        const [h, m] = t.trim().split(':');
        return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
    };

    const start = padTime(parts[0]);
    const end   = padTime(parts[1]);
    return { scheduleRaw: `${start} A ${end}`, scheduleStart: start, scheduleEnd: end };
}

/** Parses 'CLIENTE / DESCRIPCION' → { client, description }
 *  Handles entries without slash (e.g. 'Vacaciones', 'Viaje Corporativo')
 */
export function parseComment(comment: string): { client: string; description: string } {
    if (!comment) return { client: '', description: '' };
    const idx = comment.indexOf(' / ');
    if (idx === -1) {
        const upper = comment.trim().toUpperCase();
        return { client: upper, description: upper };
    }
    return {
        client:      comment.substring(0, idx).trim().toUpperCase(),
        description: comment.substring(idx + 3).trim().toUpperCase(),
    };
}

/** Generates Jira worklog record: 'Tipo: CLIENTE->DESCRIPCION' */
export function buildJiraRecord(activity: ActivityType, client: string, description: string): string {
    const label = activity === ActivityType.TAREAS_A_REALIZAR ? 'Tarea' : activity;
    if (!client && !description) return label;
    if (!description || description === client) return `${label}: ${client}`;
    return `${label}: ${client}->${description}`;
}

// ─── Export Generators ────────────────────────────────────────────────────────

/** Converts AgendaEntry-shaped objects to Jira CSV string */
export function generateJiraCSV(rows: JiraExportRow[]): string {
    const headers = ['Fecha', 'Día', 'Consultor', 'Actividad', 'Cliente', 'Registro Jira', 'Horas Planificadas', 'Semana-Mes', 'Resultado'];
    const lines = [
        headers.join(';'),
        ...rows.map(r => [
            r.fecha,
            r.diaSemana,
            r.consultor,
            r.actividad,
            r.cliente,
            r.registroJira,
            r.horasPlanificadas.toFixed(2).replace('.', ','),
            r.semanaMes,
            r.resultado,
        ].join(';')),
    ];
    return lines.join('\n');
}

/** Converts entries to MS Project CSV string */
export function generateMSProjectCSV(rows: MSProjectExportRow[]): string {
    const headers = ['Fecha', 'Recurso', 'Tarea', 'Horas', '% Completado', 'Estado'];
    const lines = [
        headers.join(';'),
        ...rows.map(r => [
            r.fecha,
            r.recurso,
            r.tarea,
            r.horasPlanificadas.toFixed(2).replace('.', ','),
            r.porcentajeCompletado,
            r.estado,
        ].join(';')),
    ];
    return lines.join('\n');
}

/** Triggers a browser download of a text file */
export function downloadCSV(content: string, filename: string): void {
    const bom = '﻿'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/** Maps ResultStatus to MS Project % complete */
export function resultToPercent(result: ResultStatus): number {
    return RESULT_CONFIG[result]?.msProjectPercent ?? 0;
}

/** Validates schedule format; returns error string or null */
export function validateSchedule(raw: string): string | null {
    if (!raw) return null;
    const hours = parseHours(raw);
    if (hours === 0 && raw.trim().length > 0) return 'Formato inválido. Use HH:MM A HH:MM (ej: 9:00 A 11:30)';
    if (hours > 24) return 'El horario supera 24 horas';
    return null;
}
