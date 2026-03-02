/**
 * Date/time helpers — extracted from buildXml helpers in the original app.js.
 * These convert Excel serial numbers (used by SheetJS) to ISO date strings
 * and HHMM integers used by UNIGIS.
 */

/**
 * Convert an Excel serial date number to an ISO 8601 string.
 * Excel dates start from 1900-01-01 (serial = 1).
 */
export function excelSerialToISO(serial: number): string {
    if (typeof serial !== 'number' || isNaN(serial)) return '';
    // Excel epoch: 1899-12-30 (accounting for the 1900 leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const msPerDay = 86400000;
    const date = new Date(excelEpoch.getTime() + serial * msPerDay);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Convert an Excel time fraction or "HH:MM" string to an HHMM integer
 * (e.g., 0.75 → 1800 for 18:00, "14:30" → 1430).
 */
export function excelTimeToHHMM(value: string | number): number | string {
    if (value === null || value === undefined || value === '') return '';

    // Already a number (Excel time fraction 0-1 or already HHMM integer)
    if (typeof value === 'number') {
        if (value >= 0 && value < 1) {
            // Time fraction → hours
            const totalMinutes = Math.round(value * 1440);
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            return h * 100 + m;
        }
        // Already HHMM (e.g., 1430)
        if (value >= 0 && value <= 2359) return Math.round(value);
        return value;
    }

    // String "HH:MM" → HHMM
    const str = String(value).trim();
    const match = str.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
        return parseInt(match[1]) * 100 + parseInt(match[2]);
    }

    // Try plain number string
    const num = parseFloat(str);
    if (!isNaN(num)) return excelTimeToHHMM(num);

    return str;
}

/**
 * Detect if a value looks like a date and try to normalise it.
 * Returns ISO date string if detected, or the original value.
 */
export function normalizeDate(value: string | number): string {
    if (typeof value === 'number') return excelSerialToISO(value);
    const str = String(value).trim();
    // If already ISO-ish, return as-is
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str;
    // Try common formats
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return str;
}
