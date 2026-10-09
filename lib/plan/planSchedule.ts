/**
 * [Plan] Plazo y esfuerzo para mostrar.
 * - Plazo: días laborables entre comienzo y fin (calendario de Madrid). En los nodos va del comienzo
 *   más temprano al fin más tardío de sus tareas: nunca se suman duraciones (las tareas van en paralelo).
 * - Esfuerzo: días de trabajo (8 h = 1 día) que se muestran en horas.
 */
import { dayKey } from '@/functions/src/projectProgressCore';
import { workdaysBetween } from '@/functions/src/workCalendar';

export const HOURS_PER_DAY = 8;

export function planSpanDays(start: unknown, end: unknown): number | null {
    const s = dayKey(start);
    const e = dayKey(end);
    if (!s || !e || e < s) return null;
    return workdaysBetween(s, e);
}

export function daysToHours(days: unknown): number | null {
    const n = typeof days === 'number' ? days : typeof days === 'string' ? parseFloat(days) : NaN;
    return Number.isFinite(n) ? Math.round(n * HOURS_PER_DAY * 10) / 10 : null;
}
