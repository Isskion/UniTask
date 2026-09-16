/* eslint-disable @typescript-eslint/no-explicit-any */
import { SCHEMA, KNOWN_BOOLEAN_PATHS } from '../data/schema';
import { excelTimeToHHMM, excelSerialToISO, formatToUnigisDate } from '../utils/dateHelpers';

const indent = (level: number) => '  '.repeat(level);
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface BuildXmlContext {
  mapping: Record<string, string>;
  booleanOverrides: Record<string, boolean>;
  token: string;
  dynFieldsConfig: Record<string, string[] | null>;
}

function getLeafValue(row: Record<string, any>, fieldPath: string, tag: string, ctx: BuildXmlContext): string {
  if (ctx.booleanOverrides[fieldPath] === true) return 'true';
  if (ctx.booleanOverrides[fieldPath] === false) return 'false';
  const excelCol = ctx.mapping[fieldPath];
  if (!excelCol) return '';
  const cellValue = row[excelCol];
  if (cellValue === undefined || cellValue === null || cellValue === '') return '';

  if (KNOWN_BOOLEAN_PATHS.includes(fieldPath)) {
    if (typeof cellValue === 'boolean') return cellValue ? 'true' : 'false';
    const s = String(cellValue).trim().toLowerCase();
    if (['true', '1', 'si', 'sí', 'yes', 's', 'y', 'verdadero'].includes(s)) return 'true';
    if (['false', '0', 'no', 'n', 'falso'].includes(s)) return 'false';
    return s;
  }

  const isTimeField = /(InicioHorario|FinHorario|HorarioDesdeTendering|HorarioHastaTendering|HorarioPublicacion)/i.test(tag);
  const isDateField = /(Fecha|Vigencia|Datetime)/i.test(tag) && !isTimeField;
  if (isTimeField) return String(excelTimeToHHMM(cellValue));
  if (cellValue instanceof Date) {
    const y = cellValue.getFullYear(), m = String(cellValue.getMonth() + 1).padStart(2, '0'), d = String(cellValue.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (isDateField && typeof cellValue === 'number') {
    try { return cellValue === 0 ? '' : excelSerialToISO(cellValue); } catch { return String(cellValue); }
  }
  if (isDateField) return formatToUnigisDate(cellValue);
  return String(cellValue).trim();
}

function buildNode(schema: Record<string, any>, path: string, level: number, row: Record<string, any>, ctx: BuildXmlContext): string {
  let xml = '';
  for (const key in schema) {
    if (key.startsWith('_')) continue;
    const val = schema[key];
    const currentPath = path ? `${path}.${key}` : key;
    const tag = key;

    // Arrays genéricos (ej. Conductores → pConductorTransporte)
    if (typeof val === 'object' && val !== null && val._isArray) {
      const items: Record<string, string>[] = [];
      const fields = val._fields || {};

      // 1. Fila con array embebido directo
      if (Array.isArray(row[key]) && row[key].length > 0) {
        row[key].forEach((it: any) => {
          const item: Record<string, string> = {};
          for (const f of Object.keys(fields)) {
            if (it[f] !== undefined && it[f] !== null && String(it[f]).trim() !== '') {
              item[f] = String(it[f]).trim();
            }
          }
          if (Object.keys(item).length > 0) items.push(item);
        });
      }

      // 2. Mapeos indexados: currentPath[1].NroDocumento
      const mappedIndexed = Object.keys(ctx.mapping).filter(k => k.startsWith(currentPath + '['));
      const indices = Array.from(new Set(
        mappedIndexed.map(k => {
          const m = k.match(/\[(\d+)\]/);
          return m ? m[1] : null;
        }).filter(Boolean)
      ));

      if (indices.length > 0) {
        indices.forEach(idx => {
          const item: Record<string, string> = {};
          for (const f of Object.keys(fields)) {
            const pathWithIdx = `${currentPath}[${idx}].${f}`;
            const col = ctx.mapping[pathWithIdx];
            if (col && row[col] !== undefined && row[col] !== null && String(row[col]).trim() !== '') {
              item[f] = String(row[col]).trim();
            }
          }
          if (Object.keys(item).length > 0) items.push(item);
        });
      }

      // 3. Mapeo plano sin índice: currentPath.NroDocumento (un solo conductor por fila)
      if (items.length === 0) {
        const item: Record<string, string> = {};
        for (const f of Object.keys(fields)) {
          const flatPath = `${currentPath}.${f}`;
          const col = ctx.mapping[flatPath];
          if (col && row[col] !== undefined && row[col] !== null && String(row[col]).trim() !== '') {
            item[f] = String(row[col]).trim();
          }
        }
        if (Object.keys(item).length > 0) items.push(item);
      }

      if (items.length > 0) {
        const itemTag = val._itemTag || 'pConductorTransporte';
        xml += `${indent(level)}<unis:${tag}>\n`;
        items.forEach(it => {
          xml += `${indent(level + 1)}<unis:${itemTag}>\n`;
          for (const f of Object.keys(fields)) {
            if (it[f]) {
              xml += `${indent(level + 2)}<unis:${f}>${escapeXml(it[f])}</unis:${f}>\n`;
            }
          }
          xml += `${indent(level + 1)}</unis:${itemTag}>\n`;
        });
        xml += `${indent(level)}</unis:${tag}>\n`;
      }
      continue;
    }

    // Nodo anidado
    if (typeof val === 'object' && val !== null && !val._isArray && val._default === undefined) {
      const childXml = buildNode(val, currentPath, level + 1, row, ctx);
      if (childXml.trim()) xml += `${indent(level)}<unis:${tag}>\n${childXml}${indent(level)}</unis:${tag}>\n`;
      continue;
    }

    // Hoja
    const defaultVal = typeof val === 'object' && val._default !== undefined ? val._default : '';
    let content = getLeafValue(row, currentPath, tag, ctx);
    if (!content && defaultVal) content = defaultVal;
    if (content) xml += `${indent(level)}<unis:${tag}>${escapeXml(content)}</unis:${tag}>\n`;
  }
  return xml;
}

export function buildXml(row: Record<string, any>, ctx: BuildXmlContext): string {
  const transporteSchema = (SCHEMA.Root as any).Transporte;
  const transporteXml = buildNode(transporteSchema, 'Root.Transporte', 4, row, ctx);

  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:unis="http://unisolutions.com.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <unis:CrearTransportes>
      <unis:apiKey>${ctx.token || 'TOKEN'}</unis:apiKey>
      <unis:transportes>
        <unis:pTransporte>
${transporteXml}        </unis:pTransporte>
      </unis:transportes>
    </unis:CrearTransportes>
  </soapenv:Body>
</soapenv:Envelope>`;
}
