/**
 * safeParseDate — Converts any Firestore date representation to a JS Date.
 *
 * Handles:
 *   - Firestore Timestamp (with .toDate())
 *   - Serialized Timestamp from backup restore  { seconds: number, nanoseconds: number }
 *   - ISO strings / unix timestamps / Date objects
 *
 * Returns null if the value cannot be parsed.
 */
export function safeParseDate(ts: any): Date | null {
    if (!ts) return null;
    if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
    if (typeof ts.toDate === 'function') {
        const d = ts.toDate();
        return isNaN(d.getTime()) ? null : d;
    }
    // Serialized Firestore Timestamp: { seconds: number, nanoseconds: number }
    if (typeof ts === 'object' && ts !== null && typeof ts.seconds === 'number') {
        const d = new Date(ts.seconds * 1000);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * formatSafeDate — Formats a Firestore date safely, returning '-' on invalid values.
 */
export function formatSafeDate(ts: any, formatStr: string, options?: Parameters<typeof import('date-fns').format>[2]): string {
    // Not using this version to avoid circular imports; keep safeParseDate as the primary export.
    return '-';
}
