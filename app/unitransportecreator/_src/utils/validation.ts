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
    const idEstadoCol = mapping['Root.Transporte.IdEstado'];
    if (idEstadoCol && row[idEstadoCol] && isNaN(parseInt(String(row[idEstadoCol])))) {
      warnings.push({ field: 'Root.Transporte.IdEstado', rowIndex: i, message: 'IdEstado no es un número entero' });
    }
    const cuitCol = mapping['Root.Transporte.Cuit'];
    if (cuitCol && row[cuitCol] && !/^[0-9A-Za-z-]+$/.test(String(row[cuitCol]).trim())) {
      warnings.push({ field: 'Root.Transporte.Cuit', rowIndex: i, message: 'CUIT contiene caracteres inusuales' });
    }
    if (rowValid) validRows++;
  });

  return { totalRows: rows.length, validRows, errors, warnings };
}

