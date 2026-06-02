import { REQUIRED_FIELDS } from '../data/schema';

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
 * Validate a single vehicle row against the mapping.
 * Checks that required fields are mapped and have data.
 */
export function validateVehicleRow(
    row: Record<string, string>,
    rowIndex: number,
    mapping: Record<string, string>,
): RowValidationResult {
    const issues: ValidationIssue[] = [];

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
    const results = rows.map((row, idx) => validateVehicleRow(row, idx, mapping));
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
