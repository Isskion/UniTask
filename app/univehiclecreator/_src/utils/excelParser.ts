/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';

export interface ParsedSheet {
    headers: string[];
    rows: Record<string, any>[];
}

/**
 * Parse an Excel file (ArrayBuffer) and return the first sheet's data.
 */
export function parseExcelFile(data: ArrayBuffer): {
    workbook: XLSX.WorkBook;
    sheet: ParsedSheet;
    sheetNames: string[];
} {
    const workbook = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = parseSheet(workbook, firstSheetName);
    return { workbook, sheet, sheetNames: workbook.SheetNames };
}

/**
 * Parse a specific sheet from a workbook.
 */
export function parseSheet(workbook: XLSX.WorkBook, sheetName: string): ParsedSheet {
    const ws = workbook.Sheets[sheetName];
    if (!ws) return { headers: [], rows: [] };

    const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
    if (data.length === 0) return { headers: [], rows: [] };

    // First row is the header
    const rawHeaders = data[0] as any[];
    const headers = rawHeaders
        .map(h => String(h || '').trim())
        .filter(h => h !== '');

    // The rest are rows
    const rows: Record<string, any>[] = [];
    for (let i = 1; i < data.length; i++) {
        const rowData = data[i];
        if (!rowData || rowData.length === 0) continue;

        const rowObj: Record<string, any> = {};
        let hasValue = false;

        headers.forEach((h, index) => {
            const val = rowData[index] ?? '';
            rowObj[h] = val;
            if (val !== '') hasValue = true;
        });

        if (hasValue) {
            rows.push(rowObj);
        }
    }

    return { headers, rows };
}
