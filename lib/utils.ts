import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, getISOWeek, getYear } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getWeekNumber(date: Date): number {
    return getISOWeek(date);
}

export function getYearNumber(date: Date): number {
    return getYear(date);
}

export function formatDateId(date: Date | string): string {
    // Robustly handle string inputs if they slip through
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return "INVALID_DATE";
    return format(d, "yyyyMMdd");
}

export function formatReadableDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Fecha inválida";
    return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}
