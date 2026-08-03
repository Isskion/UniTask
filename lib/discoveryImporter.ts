import * as XLSX from 'xlsx';
import { updateFieldResponse, appendTableRow } from './discovery';

// Modo original: cada columna del Excel sobrescribe un campo escalar distinto (para formularios
// de una sola fila, tipo "ficha de cliente"). Se conserva por compatibilidad.
export interface ScalarMappingConfig {
    mode: 'scalar';
    mapping: Record<string, { sectionId: string, fieldId: string }>;
}

// Modo tabla: CADA FILA del Excel se acumula como una fila de un campo tipo 'table' (catálogo de
// vehículos, tarifas...). columnMap traduce cabecera de Excel -> id de columna del campo tabla.
// Antes de esto, el importador trataba cada fila como una sobrescritura del mismo campo escalar
// (updateFieldResponse), así que con un catálogo de N filas solo sobrevivía la última.
export interface TableMappingConfig {
    mode: 'table';
    sectionId: string;
    fieldId: string;
    columnMap: Record<string, string>;
}

export type DiscoveryImportConfig = ScalarMappingConfig | TableMappingConfig;

export async function processDiscoveryExcelUpload(
    file: File,
    tenantId: string,
    projectId: string,
    uid: string,
    config: DiscoveryImportConfig
): Promise<{ success: number, errors: string[] }> {

    // Strict MIME & Header Validation
    if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
        file.type !== 'application/vnd.ms-excel') {
        throw new Error("Invalid file type. Only Excel files are allowed.");
    }
    
    // Read First 4 bytes to check magic numbers (PK.. for docx/xlsx, or D0CF11E0 for legacy xls)
    const magicBuffer = await file.slice(0, 4).arrayBuffer();
    const magicArr = new Uint8Array(magicBuffer);
    const magicHex = Array.from(magicArr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // ZIP magic number (xlsx)
    if (magicHex !== '504B0304' && magicHex !== 'D0CF11E0') {
        throw new Error("File content validation failed. The file is not a valid Excel document.");
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    if (workbook.SheetNames.length === 0) {
        throw new Error("Excel file is empty");
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    let successCount = 0;
    const errors: string[] = [];

    if (config.mode === 'table') {
        // Una fila de Excel = una fila acumulada en el campo tabla (no se sobrescriben entre sí).
        for (let i = 0; i < rows.length; i++) {
            const excelRow = rows[i];
            const tableRow: Record<string, any> = {};
            for (const [excelCol, targetColId] of Object.entries(config.columnMap)) {
                if (excelRow[excelCol] !== undefined && excelRow[excelCol] !== null) {
                    tableRow[targetColId] = excelRow[excelCol];
                }
            }
            if (Object.keys(tableRow).length === 0) {
                errors.push(`Fila ${i + 2}: ninguna columna coincide con el mapeo, se omite.`);
                continue;
            }
            try {
                await appendTableRow(tenantId, projectId, config.sectionId, config.fieldId, tableRow, uid);
                successCount++;
            } catch (e: any) {
                errors.push(`Fila ${i + 2}: ${e.message}`);
            }
        }
    } else {
        // Modo escalar original: cada columna sobrescribe un campo distinto (última fila gana).
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            for (const [colName, target] of Object.entries(config.mapping)) {
                if (row[colName] !== undefined && row[colName] !== null) {
                    try {
                        await updateFieldResponse(projectId, target.sectionId, tenantId, target.fieldId, row[colName], uid);
                        successCount++;
                    } catch (e: any) {
                        errors.push(`Row ${i + 2}, Column '${colName}': ${e.message}`);
                    }
                }
            }
        }
    }

    return { success: successCount, errors };
}
