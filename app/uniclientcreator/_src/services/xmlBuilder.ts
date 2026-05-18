/* eslint-disable @typescript-eslint/no-explicit-any */
import { SCHEMA } from '../data/schema';
import { excelTimeToHHMM, excelSerialToISO, formatToUnigisDate } from '../utils/dateHelpers';

const indent = (level: number) => '  '.repeat(level);
function escapeXml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export interface BuildXmlContext {
  mapping: Record<string, string>;
  booleanOverrides: Record<string, boolean>;
  token: string;
  dynFieldsConfig: Record<string, string[] | null>;
}

function getLeafValue(row: Record<string,any>, fieldPath: string, tag: string, ctx: BuildXmlContext): string {
  if (ctx.booleanOverrides[fieldPath] === true) return 'true';
  if (ctx.booleanOverrides[fieldPath] === false) return 'false';
  const excelCol = ctx.mapping[fieldPath];
  if (!excelCol) return '';
  const cellValue = row[excelCol];
  if (cellValue === undefined || cellValue === null || cellValue === '') return '';
  const isTimeField = /(InicioHorario|FinHorario)/i.test(tag);
  const isDateField = /(Fecha|Vigencia|Datetime)/i.test(tag) && !isTimeField;
  if (isTimeField) return String(excelTimeToHHMM(cellValue));
  if (cellValue instanceof Date) {
    const y = cellValue.getFullYear(), m = String(cellValue.getMonth()+1).padStart(2,'0'), d = String(cellValue.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  if (isDateField && typeof cellValue === 'number') { try { return cellValue===0?'':excelSerialToISO(cellValue); } catch { return String(cellValue); } }
  if (isDateField) return formatToUnigisDate(cellValue);
  return String(cellValue).trim();
}

function buildNode(schema: Record<string,any>, path: string, level: number, row: Record<string,any>, ctx: BuildXmlContext): string {
  let xml = '';
  for (const key in schema) {
    if (key.startsWith('_')) continue;
    const val = schema[key];
    const currentPath = path ? `${path}.${key}` : key;
    const tag = key;

    // CampoDinamico array
    if (key === 'CampoDinamico' || key === 'CampoDinamicoDomicilio') {
      const dynItems: { Campo: string; Valor: string }[] = [];
      const mappedKeys = Object.keys(ctx.mapping).filter(k => k.startsWith(currentPath + '['));
      mappedKeys.forEach(mappedKey => {
        const idxMatch = mappedKey.match(/\[(\d+)\]\.Campo$/);
        if (!idxMatch) return;
        const idx = idxMatch[1];
        const campoPath = `${currentPath}[${idx}].Campo`;
        const valorPath = `${currentPath}[${idx}].Valor`;
        const campo = ctx.mapping[campoPath] ? String(row[ctx.mapping[campoPath]] || '') : '';
        const valor = ctx.mapping[valorPath] ? String(row[ctx.mapping[valorPath]] || '') : '';
        if (campo || valor) dynItems.push({ Campo: campo, Valor: valor });
      });
      if (dynItems.length > 0) {
        xml += `${indent(level)}<unis:${tag}>\n`;
        dynItems.forEach(d => {
          xml += `${indent(level+1)}<unis:CampoValor>\n`;
          xml += `${indent(level+2)}<unis:Campo>${escapeXml(d.Campo)}</unis:Campo>\n`;
          xml += `${indent(level+2)}<unis:Valor>${escapeXml(d.Valor)}</unis:Valor>\n`;
          xml += `${indent(level+1)}</unis:CampoValor>\n`;
        });
        xml += `${indent(level)}</unis:${tag}>\n`;
      }
      continue;
    }

    // Nested object
    if (typeof val === 'object' && val !== null && !val._isArray && !val._default) {
      const childXml = buildNode(val, currentPath, level+1, row, ctx);
      if (childXml.trim()) xml += `${indent(level)}<unis:${tag}>\n${childXml}${indent(level)}</unis:${tag}>\n`;
      continue;
    }

    // Leaf
    let content = '';
    const defaultVal = typeof val === 'object' && val._default !== undefined ? val._default : '';
    content = getLeafValue(row, currentPath, tag, ctx);
    if (!content && defaultVal) content = defaultVal;
    if (content) xml += `${indent(level)}<unis:${tag}>${escapeXml(content)}</unis:${tag}>\n`;
  }
  return xml;
}

export function buildXml(row: Record<string, any>, ctx: BuildXmlContext): string {
  const clienteSchema = (SCHEMA.Root as any).Cliente;
  const clienteXml = buildNode(clienteSchema, 'Root.Cliente', 4, row, ctx);

  const getField = (path: string) => {
    const col = ctx.mapping[path];
    return col && row[col] ? escapeXml(String(row[col]).trim()) : '';
  };

  const codigoSucursal = getField('Root.CodigoSucursal');
  const codigoOperacion = getField('Root.CodigoOperacion');

  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:unis="http://unisolutions.com.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <unis:CrearClientesOrden>
      <unis:clientes>
        <unis:pCliente>
${clienteXml}        </unis:pCliente>
      </unis:clientes>${codigoSucursal ? `\n      <unis:CodigoSucursal>${codigoSucursal}</unis:CodigoSucursal>` : ''}${codigoOperacion ? `\n      <unis:CodigoOperacion>${codigoOperacion}</unis:CodigoOperacion>` : ''}
      <unis:apiKey>${ctx.token || 'TOKEN'}</unis:apiKey>
    </unis:CrearClientesOrden>
  </soapenv:Body>
</soapenv:Envelope>`;
}
