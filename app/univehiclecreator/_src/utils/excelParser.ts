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
    console.log('[ExcelParser] Starting file parse, size:', data.byteLength, 'bytes');
    try {
        const workbook = XLSX.read(new Uint8Array(data), { 
            type: 'array', 
            cellDates: true,
            cellStyles: false,
            cellFormulas: false
        });
        console.log('[ExcelParser] Workbook sheets:', workbook.SheetNames);
        const firstSheetName = workbook.SheetNames[0];
        const sheet = parseSheet(workbook, firstSheetName);
        console.log('[ExcelParser] Parse complete. Headers:', sheet.headers.length, 'Rows:', sheet.rows.length);
        return { workbook, sheet, sheetNames: workbook.SheetNames };
    } catch (err: any) {
        console.error('[ExcelParser] Error parsing Excel file:', err);
        throw new Error(`Error al procesar el archivo Excel: ${err.message || err}`);
    }
}

/**
 * Parse a specific sheet from a workbook.
 */
export function parseSheet(workbook: XLSX.WorkBook, sheetName: string): ParsedSheet {
    const ws = workbook.Sheets[sheetName];
    if (!ws) {
        console.warn('[ExcelParser] Sheet not found:', sheetName);
        return { headers: [], rows: [] };
    }

    const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false });
    if (data.length === 0) return { headers: [], rows: [] };

    // First row is the header
    const rawHeaders = data[0] as any[];
    const headers = (rawHeaders || [])
        .map(h => String(h ?? '').trim())
        .filter(h => h !== '');

    if (headers.length === 0) {
        console.warn('[ExcelParser] No valid headers found in row 1');
        return { headers: [], rows: [] };
    }

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
