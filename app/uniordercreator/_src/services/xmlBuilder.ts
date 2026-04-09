/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * xmlBuilder.ts — Full port of the original buildXml() function from app.js.
 * Generates SOAP XML envelopes for CrearOrdenesPedido.
 */

import { SCHEMA } from '../data/schema';
import { formatToUnigisDate, excelTimeToHHMM } from '../utils/dateHelpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const indent = (level: number) => '  '.repeat(level);

function escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Internal helpers excelSerialToISO and excelTimeToHHMM have been moved to ../utils/dateHelpers.

// ─── detectArrayIndices ───────────────────────────────────────────────────────

export function detectArrayIndices(
    row: Record<string, any>,
    arrayName: string,
    mapping: Record<string, string>,
): number[] {
    const indices = new Set<number>();
    const colPattern = new RegExp(`^${arrayName}\\[(\\d+)\\]\\.`);
    const mapPattern = new RegExp(`(?:^|Orden\\.)${arrayName}\\[(\\d+)\\]\\.`);

    for (const col in row) {
        const match = col.match(colPattern);
        if (match) indices.add(parseInt(match[1]));
    }

    for (const mappedPath in mapping) {
        const match = mappedPath.match(mapPattern);
        if (match) {
            const excelCol = mapping[mappedPath];
            if (row[excelCol] !== undefined || excelCol) {
                indices.add(parseInt(match[1]));
            }
        }
    }

    if (indices.size === 0) {
        const hasAnyMapping = Object.keys(mapping).some(
            (path) => path.includes(`${arrayName}.`) || path.includes(`${arrayName}[`),
        );
        if (hasAnyMapping) indices.add(0);
    }

    return Array.from(indices).sort((a, b) => a - b);
}

// ─── transformDynamicFields ───────────────────────────────────────────────────

function transformDynamicFields(
    data: Record<string, any>,
    dynFieldsConfig: Record<string, string[] | null>,
    sourceScope = 'main',
): void {
    if (!data) return;

    const normalizedScope = sourceScope === 'main' ? 'main' : sourceScope.trim().toUpperCase();
    const bucket = normalizedScope === 'main' ? 'ROOT' : normalizedScope;

    if (!data._dynScopes) data._dynScopes = { ROOT: [] };
    data._dynScopes[bucket] = [];

    let selectedColumns = dynFieldsConfig[normalizedScope] ?? null;
    if (!selectedColumns && dynFieldsConfig['main']) {
        selectedColumns = dynFieldsConfig['main'];
    }

    Object.keys(data).forEach((key) => {
        const upperKey = key.toUpperCase();

        // Root scope Dyn_ fields
        if (upperKey.startsWith('DYN_') && !key.includes('.')) {
            const keyUpper = key.toUpperCase();
            const isSelected =
                selectedColumns === null ||
                (selectedColumns && selectedColumns.some((col) => col.toUpperCase() === keyUpper));
            if (!isSelected) return;

            const valor = data[key];
            if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
                const exists = data._dynScopes[bucket].find((f: any) => f.Campo === key);
                if (!exists) {
                    data._dynScopes[bucket].push({ Campo: key, Valor: String(valor) });
                }
            }
        }
        // Child scope: contains .DYN_
        else if (upperKey.includes('.DYN_')) {
            const parts = key.split('.');
            const dynIndex = parts.findIndex((p) => p.toUpperCase().startsWith('DYN_'));
            if (dynIndex > 0) {
                const scope = parts[dynIndex - 1];
                const dynPart = parts[dynIndex];
                const scopeKey = scope.trim().toUpperCase();
                const scopeSelectedColumns = dynFieldsConfig[scopeKey];

                if (scopeSelectedColumns !== undefined && scopeSelectedColumns !== null) {
                    const fieldNameUpper = dynPart.toUpperCase();
                    const isSelected = scopeSelectedColumns.some((col) => col.toUpperCase() === fieldNameUpper);
                    if (!isSelected) return;
                }

                if (!data._dynScopes[scopeKey]) data._dynScopes[scopeKey] = [];
                const exists = data._dynScopes[scopeKey].find((f: any) => f.Campo === dynPart);
                if (!exists) {
                    data._dynScopes[scopeKey].push({ Campo: dynPart, Valor: data[key] });
                }
            }
        }
    });
}

// ─── Context interface ────────────────────────────────────────────────────────

export interface BuildXmlContext {
    mapping: Record<string, string>;
    booleanOverrides: Record<string, boolean>;
    token: string;
    dynFieldsConfig: Record<string, string[] | null>;
    multiSheetEnabled: boolean;
    multiSheetConfig: {
        relations: Array<{ sheet: string; key: string; targetPath: string; itemTag: string }>;
    };
    getRelatedItems: (row: Record<string, any>, relation: any) => Record<string, any>[];
}

// ─── buildXml ─────────────────────────────────────────────────────────────────

export function buildXml(row: Record<string, any>, ctx: BuildXmlContext): string {
    // Apply dynamic field transformation
    transformDynamicFields(row, ctx.dynFieldsConfig);

    // ── buildArrayItem (recursive) ────────────────────────────────────────
    const buildArrayItem = (
        itemSchema: Record<string, any>,
        basePath: string,
        itemLevel: number,
        dataSource: Record<string, any>,
        scopePrefix: string | null = null,
    ): string => {
        let itemXml = '';

        transformDynamicFields(dataSource, ctx.dynFieldsConfig, scopePrefix || 'main');

        for (const itemKey in itemSchema) {
            if (itemKey.startsWith('_')) continue;

            const itemVal = itemSchema[itemKey];
            const itemCurrentPath = `${basePath}.${itemKey}`;
            const itemTag = itemKey;

            // SPECIAL: CampoDinamico
            if (itemKey === 'CampoDinamico') {
                let dynItems: any[] = [];
                let scope: string | null = null;

                const normalizedScopePrefix = scopePrefix ? scopePrefix.toUpperCase() : null;
                if (normalizedScopePrefix && dataSource._dynScopes?.[normalizedScopePrefix]) {
                    scope = normalizedScopePrefix;
                }
                if (!scope) {
                    const parts = itemCurrentPath.split('.');
                    if (parts.length > 1) scope = parts[parts.length - 2];
                }
                if (scope === 'Orden') scope = 'ROOT';

                if (scope && dataSource._dynScopes?.[scope]) {
                    dynItems = [...dataSource._dynScopes[scope]];
                }
                if (dynItems.length === 0 && scope?.includes('[')) {
                    const stripped = scope.replace(/\[\d+\]/g, '');
                    if (dataSource._dynScopes?.[stripped]) {
                        dynItems = [...dataSource._dynScopes[stripped]];
                    }
                }
                if (dataSource[itemKey] && Array.isArray(dataSource[itemKey])) {
                    dataSource[itemKey].forEach((item: any) => {
                        if (!dynItems.find((d: any) => d.Campo === item.Campo)) dynItems.push(item);
                    });
                }

                if (dynItems.length > 0) {
                    itemXml += `${indent(itemLevel)}<unis:${itemTag}>\n`;
                    dynItems.forEach((d: any) => {
                        if (d.Campo || d.Valor) {
                            itemXml += `${indent(itemLevel + 1)}<unis:${itemVal._itemTag}>\n`;
                            itemXml += `${indent(itemLevel + 2)}<unis:Campo>${escapeXml(String(d.Campo || ''))}</unis:Campo>\n`;
                            itemXml += `${indent(itemLevel + 2)}<unis:Valor>${escapeXml(String(d.Valor || ''))}</unis:Valor>\n`;
                            itemXml += `${indent(itemLevel + 1)}</unis:${itemVal._itemTag}>\n`;
                        }
                    });
                    itemXml += `${indent(itemLevel)}</unis:${itemTag}>\n`;
                }
                continue;
            }

            // Generic Nested Array
            if (typeof itemVal === 'object' && itemVal !== null && itemVal._isArray) {
                let childArray: any[] = [];
                let isFlatData = false;
                let nextScope: string | null = null;

                const relation = ctx.multiSheetEnabled
                    ? ctx.multiSheetConfig.relations.find((r) => r.targetPath === itemCurrentPath)
                    : null;

                if (relation) {
                    childArray = ctx.getRelatedItems(dataSource, relation);
                    nextScope = relation.sheet.trim().toUpperCase();
                } else {
                    childArray = dataSource[itemKey];
                    if (!childArray || !Array.isArray(childArray)) {
                        const indices = detectArrayIndices(dataSource, itemKey, ctx.mapping);
                        childArray = indices.map((i) => ({ _index: i, ...dataSource }));
                        isFlatData = true;
                    }
                    if (isFlatData) {
                        nextScope = scopePrefix ? `${scopePrefix}.${itemKey}` : itemKey;
                    }
                }

                if (childArray && Array.isArray(childArray) && childArray.length > 0) {
                    let arrayXml = '';
                    childArray.forEach((childItem) => {
                        const nextPath = isFlatData
                            ? `${itemCurrentPath}[${childItem._index}]`
                            : itemCurrentPath;
                        const childXml = buildArrayItem(itemVal._fields, nextPath, itemLevel + 2, childItem, nextScope);
                        if (childXml?.trim().length) {
                            arrayXml += `${indent(itemLevel + 1)}<unis:${itemVal._itemTag}>\n`;
                            arrayXml += childXml;
                            arrayXml += `${indent(itemLevel + 1)}</unis:${itemVal._itemTag}>\n`;
                        }
                    });
                    if (arrayXml.length > 0) {
                        itemXml += `${indent(itemLevel)}<unis:${itemTag}>\n`;
                        itemXml += arrayXml;
                        itemXml += `${indent(itemLevel)}</unis:${itemTag}>\n`;
                    }
                }
                continue;
            }

            // Nested Object
            if (typeof itemVal === 'object' && itemVal !== null && !itemVal._isArray && !itemVal._default) {
                const nestedXml = buildArrayItem(itemVal, itemCurrentPath, itemLevel + 1, dataSource, null);
                if (nestedXml.trim()) {
                    itemXml += `${indent(itemLevel)}<unis:${itemTag}>\n${nestedXml}${indent(itemLevel)}</unis:${itemTag}>\n`;
                }
                continue;
            }

            // Leaf
            let content = '';
            const defaultVal = typeof itemVal === 'object' && itemVal._default !== undefined ? itemVal._default : '';
            let mappingKey = itemCurrentPath;
            let mappingValue = ctx.mapping[mappingKey];
            if (!mappingValue) {
                const genericPath = itemCurrentPath.replace(/\[\d+\]/g, '');
                mappingValue = ctx.mapping[genericPath];
            }
            if (mappingValue) {
                const colName = mappingValue;
                if (dataSource[colName] !== undefined) {
                    content = String(dataSource[colName]).trim();
                } else if (colName.includes('.')) {
                    const stripped = colName.split('.').pop()!;
                    if (dataSource[stripped] !== undefined) content = String(dataSource[stripped]).trim();
                }
            }
            if (!content && dataSource[itemTag] !== undefined) {
                content = String(dataSource[itemTag]).trim();
            }
            if (!content && defaultVal) content = defaultVal;
            if (content) {
                itemXml += `${indent(itemLevel)}<unis:${itemTag}>${escapeXml(content)}</unis:${itemTag}>\n`;
            }
        }
        return itemXml;
    };

    // ── buildNode (top-level recursive) ───────────────────────────────────
    const buildNode = (schema: Record<string, any>, path: string, level: number): string => {
        let xml = '';

        for (const key in schema) {
            if (key.startsWith('_')) continue;

            const val = schema[key];
            const currentPath = path ? `${path}.${key}` : key;
            const tag = key;

            // 1. CampoDinamico
            if (key === 'CampoDinamico') {
                let dynItems: any[] = [];
                let scope = 'ROOT';
                const parts = currentPath.split('.');
                if (parts.length > 1) scope = parts[parts.length - 2];
                if (scope === 'Orden') scope = 'ROOT';

                // Method 1: Auto-detected from Dyn_ prefix
                if (row._dynScopes?.[scope]) {
                    dynItems = [...row._dynScopes[scope]];
                }

                // Method 2: Explicitly mapped
                const dynIndices = detectArrayIndices(row, 'CampoDinamico', ctx.mapping);
                dynIndices.forEach((idx) => {
                    const campoPath = `${currentPath}[${idx}].Campo`;
                    const valorPath = `${currentPath}[${idx}].Valor`;
                    const campoMapping = ctx.mapping[campoPath];
                    const valorMapping = ctx.mapping[valorPath];
                    if (campoMapping || valorMapping) {
                        const campo = campoMapping ? row[campoMapping] : '';
                        const valor = valorMapping ? row[valorMapping] : '';
                        if (campo || valor) {
                            if (!dynItems.find((d: any) => d.Campo === campo)) {
                                dynItems.push({ Campo: String(campo || ''), Valor: String(valor || '') });
                            }
                        }
                    }
                });

                // Method 3: Direct array
                if (row[key] && Array.isArray(row[key])) {
                    row[key].forEach((item: any) => {
                        if (!dynItems.find((d: any) => d.Campo === item.Campo)) dynItems.push(item);
                    });
                }

                if (dynItems.length > 0) {
                    xml += `${indent(level)}<unis:${tag}>\n`;
                    dynItems.forEach((d: any) => {
                        if (d.Campo || d.Valor) {
                            xml += `${indent(level + 1)}<unis:${val._itemTag}>\n`;
                            xml += `${indent(level + 2)}<unis:Campo>${escapeXml(String(d.Campo || ''))}</unis:Campo>\n`;
                            xml += `${indent(level + 2)}<unis:Valor>${escapeXml(String(d.Valor || ''))}</unis:Valor>\n`;
                            xml += `${indent(level + 1)}</unis:${val._itemTag}>\n`;
                        }
                    });
                    xml += `${indent(level)}</unis:${tag}>\n`;
                }
                continue;
            }

            // 2. Generic Array
            if (typeof val === 'object' && val !== null && val._isArray) {
                let itemsToProcess: any[] = [];
                let useRelatedData = false;
                let scopePrefix: string | null = null;

                const relation = ctx.multiSheetEnabled
                    ? ctx.multiSheetConfig.relations.find((r) => r.targetPath === currentPath)
                    : null;

                if (relation) {
                    itemsToProcess = ctx.getRelatedItems(row, relation);
                    useRelatedData = true;
                    scopePrefix = relation.sheet;
                } else if (row[key] && Array.isArray(row[key])) {
                    itemsToProcess = row[key];
                } else {
                    const indices = detectArrayIndices(row, tag, ctx.mapping);
                    scopePrefix = tag;
                    if (indices.length > 0) {
                        itemsToProcess = indices.map((i) => ({ _index: i, ...row }));
                    }
                }

                if (itemsToProcess.length > 0) {
                    xml += `${indent(level)}<unis:${tag}>\n`;
                    itemsToProcess.forEach((itemData, idx) => {
                        const source = useRelatedData || (row[key] && Array.isArray(row[key])) ? itemData : itemData;
                        const index = useRelatedData || (row[key] && Array.isArray(row[key])) ? idx : itemData._index;
                        const itemXml = buildArrayItem(val._fields, `${currentPath}[${index}]`, level + 2, source, scopePrefix);
                        if (itemXml.trim()) {
                            xml += `${indent(level + 1)}<unis:${val._itemTag}>\n`;
                            xml += itemXml;
                            xml += `${indent(level + 1)}</unis:${val._itemTag}>\n`;
                        }
                    });
                    xml += `${indent(level)}</unis:${tag}>\n`;
                }
                continue;
            }

            // 3. Nested Object
            if (typeof val === 'object' && val !== null && (!val._default || val._fields)) {
                const isLeafObject = val._default !== undefined && !val._fields && Object.keys(val).length === 1;
                if (!isLeafObject) {
                    const childXml = buildNode(val, currentPath, level + 1);
                    if (childXml.trim()) {
                        xml += `${indent(level)}<unis:${tag}>\n${childXml}${indent(level)}</unis:${tag}>\n`;
                    }
                    continue;
                }
            }

            // 4. Leaf Node
            let content = '';
            let defaultVal = '';
            if (typeof val === 'object' && val._default !== undefined) defaultVal = val._default;

            // Boolean overrides
            if (ctx.booleanOverrides[currentPath] === true) content = 'true';
            else if (ctx.booleanOverrides[currentPath] === false) content = 'false';
            else if (ctx.mapping[currentPath]) {
                const excelCol = ctx.mapping[currentPath];
                const cellValue = row[excelCol];

                const isDateField = /(Fecha|Vigencia|Datetime)/i.test(key) && !key.toLowerCase().includes('horario');
                const isTimeField = /(InicioHorario|FinHorario)/i.test(key);
                const isBooleanField =
                    val === 'bool' ||
                    (key.toLowerCase().startsWith('es') && key.toLowerCase() !== 'estado') ||
                    key.toLowerCase().startsWith('is');

                if (isTimeField) {
                    content = String(excelTimeToHHMM(cellValue));
                } else if (isDateField) {
                    content = formatToUnigisDate(cellValue);
                } else if (isBooleanField) {
                    if (cellValue === true || cellValue === 1) content = 'true';
                    else if (cellValue === false || cellValue === 0) content = 'false';
                    else {
                        const s = String(cellValue).toLowerCase().trim();
                        if (['true', 'si', 'yes', '1', 's'].includes(s)) content = 'true';
                        else if (['false', 'no', '0', 'n'].includes(s)) content = 'false';
                    }
                } else if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
                    content = String(cellValue).trim();
                }
            }

            if (!content && defaultVal) content = defaultVal;

            if (content) {
                xml += `${indent(level)}<unis:${tag}>${escapeXml(content)}</unis:${tag}>\n`;
            }
        }
        return xml;
    };

    // ── Build the full SOAP envelope ──────────────────────────────────────
    const orderXml = buildNode(SCHEMA.Orden, 'Orden', 2);

    return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:unis="http://unisolutions.com.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <unis:CrearOrdenesPedido>
      <unis:apiKey>${ctx.token || 'TOKEN'}</unis:apiKey>
      <unis:pedidos>
        <unis:pOrdenPedido>
${orderXml}        </unis:pOrdenPedido>
      </unis:pedidos>
    </unis:CrearOrdenesPedido>
  </soapenv:Body>
</soapenv:Envelope>`;
}
