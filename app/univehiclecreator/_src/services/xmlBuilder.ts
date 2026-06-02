/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * xmlBuilder.ts — Builds SOAP XML envelopes for CrearVehiculos.
 */

import { SCHEMA } from '../data/schema';

const indent = (level: number) => '  '.repeat(level);

function escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function excelSerialToISO(serial: number): string {
    if (!serial || serial === 0) return '';
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const fractionalDay = serial - Math.floor(serial) + 0.0000001;
    let totalSeconds = Math.floor(86400 * fractionalDay);
    const seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    const hours = Math.floor(totalSeconds / (60 * 60));
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const d = new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
    return d.toISOString();
}

export function detectArrayIndices(
    row: Record<string, any>,
    arrayName: string,
    mapping: Record<string, string>,
): number[] {
    const indices = new Set<number>();
    const colPattern = new RegExp(`^${arrayName}\\[(\\d+)\\]\\.`);
    const mapPattern = new RegExp(`(?:^|Vehiculo\\.)${arrayName}\\[(\\d+)\\]\\.`);

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
        } else if (upperKey.includes('.DYN_')) {
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

export interface BuildXmlContext {
    mapping: Record<string, string>;
    booleanOverrides: Record<string, boolean>;
    token: string;
    dynFieldsConfig: Record<string, string[] | null>;
}

export function buildXml(row: Record<string, any>, ctx: BuildXmlContext): string {
    transformDynamicFields(row, ctx.dynFieldsConfig);

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

            // SPECIAL: CampoDinamico / EntidadIntegracion
            if (itemKey === 'CampoDinamico' || itemKey === 'EntidadIntegracion') {
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
                if (scope === 'Vehiculo') scope = 'ROOT';

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
                let childArray = dataSource[itemKey];
                let isFlatData = false;
                let nextScope: string | null = null;

                if (!childArray || !Array.isArray(childArray)) {
                    const indices = detectArrayIndices(dataSource, itemKey, ctx.mapping);
                    childArray = indices.map((i) => ({ _index: i, ...dataSource }));
                    isFlatData = true;
                }
                if (isFlatData) {
                    nextScope = scopePrefix ? `${scopePrefix}.${itemKey}` : itemKey;
                }

                if (childArray && Array.isArray(childArray) && childArray.length > 0) {
                    let arrayXml = '';
                    childArray.forEach((childItem) => {
                        const nextPath = isFlatData
                            ? `${itemCurrentPath}[${childItem._index}]`
                            : itemCurrentPath;
                        
                        if (itemVal._itemTag === 'string' || typeof childItem !== 'object') {
                            const valToUse = typeof childItem === 'object' ? (childItem._value ?? '') : childItem;
                            if (valToUse !== undefined && valToUse !== null && valToUse !== '') {
                                arrayXml += `${indent(itemLevel + 1)}<unis:${itemVal._itemTag}>${escapeXml(String(valToUse))}</unis:${itemVal._itemTag}>\n`;
                            }
                        } else {
                            const childXml = buildArrayItem(itemVal._fields, nextPath, itemLevel + 2, childItem, nextScope);
                            if (childXml?.trim().length) {
                                arrayXml += `${indent(itemLevel + 1)}<unis:${itemVal._itemTag}>\n`;
                                arrayXml += childXml;
                                arrayXml += `${indent(itemLevel + 1)}</unis:${itemVal._itemTag}>\n`;
                            }
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

            // 1. CampoDinamico / EntidadIntegracion
            if (key === 'CampoDinamico' || key === 'EntidadIntegracion') {
                let dynItems: any[] = [];
                let scope = 'ROOT';
                const parts = currentPath.split('.');
                if (parts.length > 1) scope = parts[parts.length - 2];
                if (scope === 'Vehiculo') scope = 'ROOT';

                if (row._dynScopes?.[scope]) {
                    dynItems = [...row._dynScopes[scope]];
                }

                const dynIndices = detectArrayIndices(row, key, ctx.mapping);
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
                let scopePrefix: string | null = null;

                if (row[key] && Array.isArray(row[key])) {
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
                        const index = row[key] && Array.isArray(row[key]) ? idx : itemData._index;
                        
                        if (val._itemTag === 'string' || typeof itemData !== 'object') {
                            const valToUse = typeof itemData === 'object' ? (itemData._value ?? '') : itemData;
                            if (valToUse !== undefined && valToUse !== null && valToUse !== '') {
                                xml += `${indent(level + 1)}<unis:${val._itemTag}>${escapeXml(String(valToUse))}</unis:${val._itemTag}>\n`;
                            }
                        } else {
                            const itemXml = buildArrayItem(val._fields, `${currentPath}[${index}]`, level + 2, itemData, scopePrefix);
                            if (itemXml.trim()) {
                                xml += `${indent(level + 1)}<unis:${val._itemTag}>\n`;
                                xml += itemXml;
                                xml += `${indent(level + 1)}</unis:${val._itemTag}>\n`;
                            }
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

                const isDateField = /(Fecha|Vigencia)/i.test(key);
                const isBooleanField =
                    val === 'bool' ||
                    (key.toLowerCase().startsWith('es') && key.toLowerCase() !== 'estado') ||
                    key.toLowerCase().startsWith('is') ||
                    key.toLowerCase().startsWith('integrar') ||
                    key.toLowerCase().startsWith('habilitado');

                if (cellValue instanceof Date) {
                    content = cellValue.toISOString();
                } else if (isDateField && typeof cellValue === 'number') {
                    try { content = cellValue === 0 ? '' : excelSerialToISO(cellValue); }
                    catch { content = String(cellValue).trim(); }
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

    const vehicleXml = buildNode(SCHEMA.Vehiculo, 'Vehiculo', 4);

    return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:unis="http://unisolutions.com.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <unis:CrearVehiculos>
      <unis:apiKey>${ctx.token || 'TOKEN'}</unis:apiKey>
      <unis:vehiculos>
        <unis:pVehiculo>
${vehicleXml}        </unis:pVehiculo>
      </unis:vehiculos>
    </unis:CrearVehiculos>
  </soapenv:Body>
</soapenv:Envelope>`;
}
