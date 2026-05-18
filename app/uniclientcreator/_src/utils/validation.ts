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
    const lat = mapping['Root.Cliente.Latitud'] ? row[mapping['Root.Cliente.Latitud']] : undefined;
    const lng = mapping['Root.Cliente.Longitud'] ? row[mapping['Root.Cliente.Longitud']] : undefined;
    if (lat && isNaN(parseFloat(String(lat)))) warnings.push({ field: 'Root.Cliente.Latitud', rowIndex: i, message: 'Latitud no numérica' });
    if (lng && isNaN(parseFloat(String(lng)))) warnings.push({ field: 'Root.Cliente.Longitud', rowIndex: i, message: 'Longitud no numérica' });
    if (rowValid) validRows++;
  });

  return { totalRows: rows.length, validRows, errors, warnings };
}
