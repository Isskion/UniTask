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

    // Get data without defval to prevent memory explosion on huge empty worksheet ranges
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

    // Convert rows to objects using headers
    const rows: Record<string, any>[] = [];
    for (let i = 1; i < data.length; i++) {
        const rowData = data[i];
        if (!rowData || rowData.length === 0) continue;

        const rowObj: Record<string, any> = {};
        let hasValue = false;

        headers.forEach((h, index) => {
            let val = rowData[index] ?? '';

            if (val instanceof Date) {
                // Time fractions are usually parsed in late 1899/1900
                if (val.getFullYear() === 1899 || val.getFullYear() === 1900) {
                    const hrs = String(val.getHours()).padStart(2, '0');
                    const mins = String(val.getMinutes()).padStart(2, '0');
                    val = `${hrs}:${mins}`;
                } else {
                    const year = val.getFullYear();
                    const month = String(val.getMonth() + 1).padStart(2, '0');
                    const day = String(val.getDate()).padStart(2, '0');
                    val = `${year}-${month}-${day}`;
                }
            } else if (typeof val === 'string') {
                // #34: Auto data cleanup
                val = cleanCellValue(val);
            }

            rowObj[h] = val;
            if (val !== '') hasValue = true;
        });

        if (hasValue) {
            rows.push(rowObj);
        }
    }

    return { headers, rows };
}

/**
 * Group rows by a key column — merges duplicate rows into one order with
 * multiple items (the core grouping logic from the original app).
 */
export function groupRows(
    rows: Record<string, any>[],
    mapping: Record<string, string>,
): Record<string, any>[] {
    // Determine the key column (mapped to Orden.RefDocumento)
    const keyCol = mapping['Orden.RefDocumento'];
    if (!keyCol) {
        console.warn('[groupRows] No mapping for Orden.RefDocumento, cannot group');
        return rows;
    }

    // Group by key
    const groups = new Map<string, Record<string, any>>();
    const itemsMap = new Map<string, Record<string, any>[]>();

    for (const row of rows) {
        const key = String(row[keyCol] ?? '').trim();
        if (!key) continue;

        if (!groups.has(key)) {
            // Use the first row as the "master" row
            groups.set(key, { ...row });
            itemsMap.set(key, []);
        }

        // Each row (including the first one) becomes an item
        // Store ALL columns so the DetailPanel and XML builder have full data
        const itemData: Record<string, any> = {};
        for (const [col, val] of Object.entries(row)) {
            if (col.startsWith('_')) continue; // skip internal fields
            itemData[col] = val;
        }
        itemsMap.get(key)!.push(itemData);
    }

    // Build result: each group becomes one row with _items attached
    const result: Record<string, any>[] = [];
    for (const [key, masterRow] of groups) {
        const items = itemsMap.get(key) || [];
        masterRow._items = items;
        masterRow._grouped = true;
        masterRow._itemCount = items.length;
        result.push(masterRow);
    }

    return result;
}

/**
 * #34: Clean a cell value — remove invisible characters, normalize whitespace.
 */
function cleanCellValue(val: string): string {
    return val
        .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '') // Zero-width chars, BOM, soft hyphen
        .replace(/\u00A0/g, ' ')                       // Non-breaking space → regular space
        .replace(/\s{2,}/g, ' ')                       // Multiple spaces → single
        .trim();
}
