/**
 * Date/time helpers — extracted from buildXml helpers in the original app.js.
 * These convert Excel serial numbers (used by SheetJS) to ISO date strings
 * and HHMM integers used by UNIGIS.
 */

/**
 * Convert an Excel serial date number to an ISO 8601 string.
 * Excel dates start from 1900-01-01 (serial = 1).
 */
/**
 * Convert an Excel serial date number to an ISO 8601 string (YYYY-MM-DD).
 * Excel dates start from 1900-01-01 (serial = 1).
 */
export function excelSerialToISO(serial: number): string {
    if (typeof serial !== 'number' || isNaN(serial) || serial <= 0) return '';
    const utcDays = Math.floor(serial - 25569);
    // Use UTC methods on the exact epoch shift to avoid local timezone displacement.
    const dateInfo = new Date(utcDays * 86400 * 1000);
    const year = dateInfo.getUTCFullYear();
    const month = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateInfo.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Robustly format any value (Date, serial, string) into dd-mm-aaaa.
 */
export function formatToUnigisDate(value: any): string {
    if (value === null || value === undefined || value === '') return '';

    let date: Date;

    if (value instanceof Date) {
        date = value;
    } else if (typeof value === 'number') {
        // Handle Excel serials
        // Range check: approx year 1990 (32874) to 2100 (73413)
        if (value >= 30000 && value < 100000) {
            return excelSerialToISO(value);
        } else if (value > 1e12) {
            // Assume timestamp in ms (e.g. 1712668040000)
            date = new Date(value);
        } else {
            // Too small for timestamp, out of range for Excel serial
            return String(value);
        }
    } else {
        const str = String(value).trim();
        if (!str) return '';

        // Explicitly handle DD/MM/YYYY or DD-MM-YYYY (Common in Spain)
        const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1]);
            const month = parseInt(dmyMatch[2]) - 1;
            const year = parseInt(dmyMatch[3]);
            date = new Date(year, month, day);
        } else {
            // Fallback to standard parsing
            date = new Date(str);
        }
    }

    if (isNaN(date.getTime())) return String(value);

    // Filter out unreasonable years (e.g. 2245) resulting from misinterpreting IDs
    const y = date.getFullYear();
    if (y < 1900 || y > 2100) return String(value);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(y);

    return `${year}-${month}-${day}`;
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
