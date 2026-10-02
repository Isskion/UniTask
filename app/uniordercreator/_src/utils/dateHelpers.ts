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

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local wall-clock → xs:dateTime sin zona (YYYY-MM-DDTHH:mm:ss). Nunca toISOString (desplaza a UTC). */
function toUnigisDateTime(d: Date): string {
    // SheetJS con cellDates puede devolver horas con desfase de segundos → redondear al segundo.
    const r = new Date(Math.round(d.getTime() / 1000) * 1000);
    return `${r.getFullYear()}-${pad2(r.getMonth() + 1)}-${pad2(r.getDate())}T${pad2(r.getHours())}:${pad2(r.getMinutes())}:${pad2(r.getSeconds())}`;
}

/**
 * Formatea cualquier valor (Date, serial Excel con fracción horaria, string) como xs:dateTime
 * `YYYY-MM-DDTHH:mm:ss`, conservando la hora si viene y usando 00:00:00 si solo hay fecha.
 * Los campos dateTime del WSDL de UNIGIS (Fecha, FechaRecoleccion, Datetime1…) requieren hora.
 * Devuelve el valor original como string si no se reconoce como fecha.
 */
export function formatToUnigisDateTime(value: any): string {
    if (value === null || value === undefined || value === '' || value === 0) return '';

    let date: Date | null = null;

    if (value instanceof Date) {
        date = value;
    } else if (typeof value === 'number') {
        // Serial Excel (≈1982–2173): parte entera = día, fracción = hora
        if (value >= 30000 && value < 100000) {
            const totalSeconds = Math.round((value - 25569) * 86400);
            const u = new Date(totalSeconds * 1000);
            date = new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), u.getUTCHours(), u.getUTCMinutes(), u.getUTCSeconds());
        } else if (value > 1e12) {
            date = new Date(value);
        } else {
            return String(value);
        }
    } else {
        const str = String(value).trim();
        if (!str) return '';

        // DD/MM/YYYY o DD-MM-YYYY con hora opcional "HH:mm[:ss]"
        const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        // YYYY-MM-DD con hora opcional — se interpreta como hora local tal cual (sin zona)
        const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        if (dmy) {
            date = new Date(+dmy[3], +dmy[2] - 1, +dmy[1], +(dmy[4] || 0), +(dmy[5] || 0), +(dmy[6] || 0));
        } else if (ymd) {
            date = new Date(+ymd[1], +ymd[2] - 1, +ymd[3], +(ymd[4] || 0), +(ymd[5] || 0), +(ymd[6] || 0));
        } else {
            date = new Date(str);
        }
    }

    if (!date || isNaN(date.getTime())) return String(value);
    const y = date.getFullYear();
    if (y < 1900 || y > 2100) return String(value);

    return toUnigisDateTime(date);
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

/**
 * Validador de Fechas
 * Comprueba robustamente si un valor se puede interpretar como una fecha válida,
 * o si es una fecha sospechosa/atípica (ej: Año 1900, Año 2100).
 */

export function isValidDateString(val: string): boolean {
    if (!val || val.trim() === '') return false;

    // Reject common bad strings
    if (val === '0' || val.toLowerCase() === 'null' || val.toLowerCase() === 'undefined') return false;

    const d = new Date(val);
    if (isNaN(d.getTime())) {
        // Try other common formats if JS Date parse fails
        // DD/MM/YYYY
        const dmyMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmyMatch) {
            const [, dStr, mStr, yStr] = dmyMatch;
            const parsed = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
            return !isNaN(parsed.getTime());
        }
        return false;
    }
    return true;
}

export function isSuspiciousDate(val: string): { suspicious: boolean; reason?: string } {
    if (!val || val.trim() === '') return { suspicious: false };

    let d = new Date(val);
    if (isNaN(d.getTime())) {
        const dmyMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmyMatch) {
            const [, dStr, mStr, yStr] = dmyMatch;
            d = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
        } else {
             return { suspicious: true, reason: 'Formato de fecha irreconocible' };
        }
    }

    const year = d.getFullYear();
    // Excel base date errors or defaults usually end up in 1899 or 1900
    if (year <= 1900) return { suspicious: true, reason: `Año muy antiguo (${year}) - Probable error de origen` };
    
    // Far future error
    if (year >= 2100) return { suspicious: true, reason: `Año muy futuro (${year}) - Probable error de origen` };

    return { suspicious: false };
}
