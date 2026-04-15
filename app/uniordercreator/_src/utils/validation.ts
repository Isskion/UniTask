import { REQUIRED_FIELDS } from '../data/schema';
import { isSuspiciousDate, isValidDateString } from './dateHelpers';

export interface ValidationIssue {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface RowValidationResult {
    rowIndex: number;
    issues: ValidationIssue[];
    isValid: boolean;
}

export interface ValidationReport {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    results: RowValidationResult[];
}

/**
 * Helper to pre-calculate duplicates
 */
export function buildDuplicateMap(rows: Record<string, string>[], mapping: Record<string, string>) {
    const counts = new Map<string, number>();
    const refCol = mapping['Orden.RefDocumento'];
    if (!refCol) return counts;

    for (const r of rows) {
        const val = r[refCol];
        if (val) {
            const key = String(val).trim().toLowerCase();
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    }
    return counts;
}

/**
 * Validate a single order row against the mapping.
 * Checks that required fields are mapped and have data.
 * Checks anomalies, duplicates and date formats.
 */
export function validateOrderRow(
    row: Record<string, string>,
    rowIndex: number,
    mapping: Record<string, string>,
    duplicateMap?: Map<string, number>
): RowValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Campos requeridos
    for (const reqField of REQUIRED_FIELDS) {
        const excelCol = mapping[reqField];
        if (!excelCol) {
            issues.push({
                field: reqField,
                message: `Campo requerido no mapeado: ${reqField}`,
                severity: 'error',
            });
        } else {
            const value = row[excelCol];
            if (value === undefined || value === null || String(value).trim() === '') {
                issues.push({
                    field: reqField,
                    message: `Campo requerido vacío: ${reqField} (columna: ${excelCol})`,
                    severity: 'error',
                });
            }
        }
    }

    // 2. Duplicados (RefDocumento) - #32
    if (duplicateMap) {
        const refCol = mapping['Orden.RefDocumento'];
        if (refCol) {
            const val = row[refCol];
            if (val) {
                const key = String(val).trim().toLowerCase();
                const count = duplicateMap.get(key) || 0;
                if (count > 1) {
                    issues.push({
                        field: 'Orden.RefDocumento',
                        message: `RefDocumento duplicado en el archivo (${count} veces encontradas)`,
                        severity: 'error' // o warning dependiendo de la logica del negocio
                    });
                }
            }
        }
    }

    // 3. Anomalías y Formatos - #33, #53
    for (const [field, excelCol] of Object.entries(mapping)) {
        if (!excelCol || excelCol === '__BOOL_TRUE__' || excelCol === '__BOOL_FALSE__') continue;
        
        const valueStr = String(row[excelCol] ?? '').trim();
        if (!valueStr) continue;

        // Fechas
        if (field.includes('Fecha')) {
            if (!isValidDateString(valueStr)) {
                issues.push({ field, message: `Formato de fecha inválido en ${excelCol}: "${valueStr}"`, severity: 'error' });
            } else {
                const sus = isSuspiciousDate(valueStr);
                if (sus.suspicious) {
                    issues.push({ field, message: `Fecha sospechosa en ${excelCol}: ${sus.reason}`, severity: 'warning' });
                }
            }
        }

        // Coordenadas (Latitud)
        if (field.endsWith('.Latitud') || field.endsWith('.Latitud2')) {
            const lat = parseFloat(valueStr);
            if (isNaN(lat) || lat < -90 || lat > 90) {
                issues.push({ field, message: `Anomalía: Latitud fuera de rango en ${excelCol} (${valueStr})`, severity: 'error' });
            } else if (lat === 0) {
                issues.push({ field, message: `Coordenada 0,0 suele ser inválida (${excelCol})`, severity: 'warning' });
            }
        }
        
        // Coordenadas (Longitud)
        if (field.endsWith('.Longitud') || field.endsWith('.Longitud2')) {
            const lng = parseFloat(valueStr);
            if (isNaN(lng) || lng < -180 || lng > 180) {
                issues.push({ field, message: `Anomalía: Longitud fuera de rango en ${excelCol} (${valueStr})`, severity: 'error' });
            } else if (lng === 0) {
                issues.push({ field, message: `Coordenada 0,0 suele ser inválida (${excelCol})`, severity: 'warning' });
            }
        }
    }

    return {
        rowIndex,
        issues,
        isValid: issues.filter((i) => i.severity === 'error').length === 0,
    };
}

/**
 * Generate a full validation report for all rows.
 */
export function generateValidationReport(
    rows: Record<string, string>[],
    mapping: Record<string, string>,
): ValidationReport {
    const dupMap = buildDuplicateMap(rows, mapping);
    const results = rows.map((row, idx) => validateOrderRow(row, idx, mapping, dupMap));
    const validRows = results.filter((r) => r.isValid).length;

    return {
        totalRows: rows.length,
        validRows,
        invalidRows: rows.length - validRows,
        results,
    };
}

/**
 * Validate a single mapping field — checks if the mapped Excel column has
 * actual data in the loaded rows.
 */
export function validateMappingField(
    fieldPath: string,
    mapping: Record<string, string>,
    rows: Record<string, string>[],
): { status: 'ok' | 'warning' | 'error' | 'unmapped'; reason: string } {
    const excelCol = mapping[fieldPath];

    if (!excelCol) {
        return { status: 'unmapped', reason: 'No mapeado' };
    }

    if (rows.length === 0) {
        return { status: 'warning', reason: 'Sin datos para verificar' };
    }

    const hasData = rows.some((row) => {
        const v = row[excelCol];
        return v !== undefined && v !== null && String(v).trim() !== '';
    });

    if (!hasData) {
        return { status: 'warning', reason: `Columna "${excelCol}" no tiene datos en ninguna fila` };
    }

    // Check if it's a required field
    if (REQUIRED_FIELDS.includes(fieldPath)) {
        const allHaveData = rows.every((row) => {
            const v = row[excelCol];
            return v !== undefined && v !== null && String(v).trim() !== '';
        });
        if (!allHaveData) {
            return { status: 'warning', reason: 'Algunas filas tienen este campo requerido vacío' };
        }
    }

    return { status: 'ok', reason: 'OK' };
}
