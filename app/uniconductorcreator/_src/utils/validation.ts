/* eslint-disable @typescript-eslint/no-explicit-any */
import { REQUIRED_FIELDS, MAX_TRANSPORTES, MAX_OPERACIONES, TIPO_DOCUMENTO_VALUES, TIPO_CONDUCTOR_VALUES } from '../data/schema';

export interface FieldValidation { field: string; rowIndex: number; message: string; }
export interface ValidationReport { totalRows: number; validRows: number; errors: FieldValidation[]; warnings: FieldValidation[]; }

const VALID_TIPO_DOCUMENTO = new Set(TIPO_DOCUMENTO_VALUES.map((v) => v.value));
const VALID_TIPO_CONDUCTOR = new Set(TIPO_CONDUCTOR_VALUES.map((v) => v.value));

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

    const tipoDocCol = mapping['Root.Conductor.TipoDocumento'];
    if (tipoDocCol && row[tipoDocCol] && !VALID_TIPO_DOCUMENTO.has(String(row[tipoDocCol]).trim().toUpperCase())) {
      warnings.push({ field: 'Root.Conductor.TipoDocumento', rowIndex: i, message: `TipoDocumento "${row[tipoDocCol]}" no está entre los valores conocidos (${Array.from(VALID_TIPO_DOCUMENTO).join(', ')}) — puede que UNIGIS lo rechace.` });
    }

    const tipoCondCol = mapping['Root.Conductor.TipoConductor'];
    if (tipoCondCol && row[tipoCondCol] && !VALID_TIPO_CONDUCTOR.has(String(row[tipoCondCol]).trim().toUpperCase())) {
      warnings.push({ field: 'Root.Conductor.TipoConductor', rowIndex: i, message: `TipoConductor "${row[tipoCondCol]}" no está entre los valores conocidos (${Array.from(VALID_TIPO_CONDUCTOR).join(', ')}) — puede que UNIGIS lo rechace.` });
    }

    for (let n = 1; n <= MAX_OPERACIONES; n++) {
      const idOpCol = mapping[`Root.Conductor.operaciones[${n}].IdOperacion`];
      if (idOpCol && row[idOpCol] && isNaN(parseInt(String(row[idOpCol])))) {
        warnings.push({ field: `Root.Conductor.operaciones[${n}].IdOperacion`, rowIndex: i, message: `Operación ${n}: IdOperacion no es un número entero` });
      }
    }

    for (let n = 1; n <= MAX_TRANSPORTES; n++) {
      const refCol = mapping[`Root.Conductor.transportes[${n}].Referencia`];
      const habAdminCol = mapping[`Root.Conductor.transportes[${n}].HabilitadoAdministrativo`];
      const habOpCol = mapping[`Root.Conductor.transportes[${n}].HabilitadoOperativo`];
      if (!refCol && (habAdminCol || habOpCol)) {
        warnings.push({ field: `Root.Conductor.transportes[${n}].Referencia`, rowIndex: i, message: `Transporte ${n}: habilitaciones mapeadas sin la Referencia del transporte — el item no se enviará.` });
      }
    }

    if (rowValid) validRows++;
  });

  return { totalRows: rows.length, validRows, errors, warnings };
}
