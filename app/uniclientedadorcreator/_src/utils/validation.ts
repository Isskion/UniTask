/* eslint-disable @typescript-eslint/no-explicit-any */
import { REQUIRED_FIELDS } from '../data/schema';

export interface FieldValidation { field: string; rowIndex: number; message: string; }
export interface ValidationReport { totalRows: number; validRows: number; errors: FieldValidation[]; warnings: FieldValidation[]; }

export function generateValidationReport(rows: any[], mapping: Record<string, string>): ValidationReport {
  const errors: FieldValidation[] = [];
  const warnings: FieldValidation[] = [];
  let validRows = 0;

  rows.forEach((row, i) => {
    let rowValid = true;
    for (const field of REQUIRED_FIELDS) {
      const col = mapping[field];
      const val = col ? row[col] : undefined;
      if (!val || String(val).trim() === '') {
        errors.push({ field, rowIndex: i, message: `Campo requerido vacío: ${field}` });
        rowValid = false;
      }
    }
    const idEstadoCol = mapping['Root.ClienteDador.IdEstado'];
    if (idEstadoCol && row[idEstadoCol] && isNaN(parseInt(String(row[idEstadoCol])))) {
      warnings.push({ field: 'Root.ClienteDador.IdEstado', rowIndex: i, message: 'IdEstado no es un número entero' });
    }
    const idOpCol = mapping['Root.ClienteDador.operaciones.IdOperacion'];
    if (idOpCol && row[idOpCol] && isNaN(parseInt(String(row[idOpCol])))) {
      warnings.push({ field: 'Root.ClienteDador.operaciones.IdOperacion', rowIndex: i, message: 'IdOperacion no es un número entero' });
    }
    if (rowValid) validRows++;
  });

  return { totalRows: rows.length, validRows, errors, warnings };
}

