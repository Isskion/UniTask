/* ───────────────────────────────────────────
   Swagger Integrator – Engine (Pure Functions)
   Schema resolution, field extraction, deep object assembly.
   ─────────────────────────────────────────── */
import { SchemaNode, SwaggerSpec, SwaggerMethod, SwaggerField, HIDDEN_TAGS } from './types';

// ── Schema Resolution (Swagger $ref) ──────────────

export function resolveSchema(schema: SchemaNode | undefined, swagger: SwaggerSpec): SchemaNode {
    if (!schema) return {};
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/', '').split('/');
        let current: unknown = swagger;
        refPath.forEach(part => { current = current ? (current as Record<string, unknown>)[part] : null; });
        return resolveSchema(current as SchemaNode, swagger);
    }
    if (schema.allOf) {
        const merged: SchemaNode = { type: 'object', properties: {} };
        schema.allOf.forEach(s => {
            const resolved = resolveSchema(s, swagger);
            if (resolved.properties) merged.properties = { ...merged.properties, ...resolved.properties };
            if (resolved.type) merged.type = resolved.type;
        });
        return merged;
    }
    return schema;
}

// ── Parse methods from Swagger spec ───────────────

export function parseSwaggerMethods(swagger: SwaggerSpec): { methods: SwaggerMethod[]; groups: Record<string, SwaggerMethod[]> } {
    const paths = swagger.paths;
    if (!paths) return { methods: [], groups: {} };
    const groups: Record<string, SwaggerMethod[]> = {};
    const methods: SwaggerMethod[] = [];

    Object.keys(paths).forEach(path => {
        Object.keys(paths[path]).forEach(verb => {
            if (verb === 'parameters') return;
            const method = paths[path][verb];
            const tag = (method.tags?.[0]) || 'General';
            if (HIDDEN_TAGS.includes(tag.toLowerCase())) return;

            let name = method.operationId || '';
            if (!name || name.trim().toLowerCase() === 'default') {
                const parts = path.split('/').filter(p => p && !p.startsWith('{'));
                name = parts[parts.length - 1] || '';
                if (name.toLowerCase() === 'v1' || name.toLowerCase() === 'api') {
                    name = parts.length > 1 ? parts[parts.length - 2] : name;
                }
                if (!name) name = verb.toUpperCase();
            }
            const displayName = name.replace('LogisticService_', '').replace(`${tag}_`, '');

            const entry: SwaggerMethod = { path, verb, definition: method, displayName, tag };
            methods.push(entry);
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(entry);
        });
    });

    return { methods, groups };
}

// ── Extract flat fields for Excel mapping ─────────

export function getSwaggerFields(method: SwaggerMethod, swagger: SwaggerSpec): SwaggerField[] {
    const bodyParam = (method.definition.parameters || []).find(p => p.in === 'body');
    if (!bodyParam?.schema) return [];
    const fields: SwaggerField[] = [];
    const resolvedRoot = resolveSchema(bodyParam.schema, swagger);

    function flatten(schema: SchemaNode, prefix = '') {
        const resolved = resolveSchema(schema, swagger);
        if (resolved.type === 'object' && resolved.properties) {
            Object.keys(resolved.properties).forEach(prop => {
                flatten(resolved.properties![prop], prefix ? `${prefix}.${prop}` : prop);
            });
        } else if (resolved.type !== 'array') {
            fields.push({ name: prefix, type: resolved.type || 'string' });
        }
    }

    if (resolvedRoot.type === 'array') flatten(resolvedRoot.items || {});
    else flatten(resolvedRoot);
    return fields.filter(f => f.name.toLowerCase() !== 'apikey');
}

// ── Deep Object Assembly ──────────────────────────

function setDeepValue(target: Record<string, unknown>, pathParts: string[], value: unknown): void {
    let current: Record<string, unknown> = target;
    for (let i = 0; i < pathParts.length; i++) {
        if (i === pathParts.length - 1) { current[pathParts[i]] = value; }
        else { if (!current[pathParts[i]]) current[pathParts[i]] = {}; current = current[pathParts[i]] as Record<string, unknown>; }
    }
}

export function assembleDeepObject(row: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    Object.keys(mapping).forEach(serviceField => {
        const excelCol = mapping[serviceField];
        if (Object.prototype.hasOwnProperty.call(row, excelCol)) setDeepValue(obj, serviceField.split('.'), row[excelCol]);
    });
    Object.keys(row).forEach(col => {
        if (Object.values(mapping).includes(col)) return;
        if (col === 'Template_Key' || col === 'Parent_Key' || row[col] === null || row[col] === undefined || row[col] === '') return;
        setDeepValue(obj, col.split('.'), row[col]);
    });
    return obj;
}

export function enforceSchemaArrays(dataObj: Record<string, unknown>, schemaProps: Record<string, SchemaNode>, swagger: SwaggerSpec): Record<string, unknown> {
    if (!dataObj || typeof dataObj !== 'object') return dataObj;
    Object.keys(schemaProps).forEach(propKey => {
        const field = resolveSchema(schemaProps[propKey], swagger);
        if (field.type === 'array') {
            if (dataObj[propKey] !== undefined && !Array.isArray(dataObj[propKey])) {
                const itemSchema = resolveSchema(field.items || {}, swagger);
                dataObj[propKey] = itemSchema.type === 'object'
                    ? [enforceSchemaArrays(dataObj[propKey] as Record<string, unknown>, itemSchema.properties || {}, swagger)]
                    : [dataObj[propKey]];
            }
        } else if (field.type === 'object' && field.properties && dataObj[propKey]) {
            enforceSchemaArrays(dataObj[propKey] as Record<string, unknown>, field.properties, swagger);
        }
    });
    return dataObj;
}

// ── ApiKey auto-injection ─────────────────────────

export function extractStaticApiKeyFromToken(token: string): string | null {
    if (!token || !token.includes('@')) return null;
    try {
        const base64Part = token.split('@')[0].replace(/[^A-Za-z0-9+/=]/g, '');
        let binaryString = '';
        if (typeof atob === 'function') {
            binaryString = atob(base64Part);
        } else {
            binaryString = Buffer.from(base64Part, 'base64').toString('binary');
        }
        
        let decoded = "";
        for (let i = 0; i < binaryString.length; i += 2) {
            const charCode = binaryString.charCodeAt(i) + (binaryString.charCodeAt(i + 1) << 8);
            if (charCode > 0) decoded += String.fromCharCode(charCode);
        }
        
        if (!decoded.includes('!')) {
            decoded = binaryString;
        }
        
        if (decoded.includes('!')) {
            const parts = decoded.split('!');
            const potentialKey = parts[parts.length - 1];
            if (potentialKey && potentialKey.includes('-')) {
                return potentialKey.trim();
            }
        }
    } catch (e) {
        console.warn("Error al extraer ApiKey del token:", e);
    }
    return null;
}

export function sanitizeApiKeyInObject(node: any, targetKey: string): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
        node.forEach(item => sanitizeApiKeyInObject(item, targetKey));
    } else {
        for (const key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
                const lowKey = key.toLowerCase();
                if (lowKey === 'apikey') {
                    const val = node[key];
                    const isLongToken = val && typeof val === 'string' && val.includes('@');
                    if (!val || val === "" || isLongToken) {
                        node[key] = targetKey;
                        if (key !== 'ApiKey') {
                            node['ApiKey'] = targetKey;
                        }
                    }
                } else if (typeof node[key] === 'object' && node[key] !== null) {
                    sanitizeApiKeyInObject(node[key], targetKey);
                }
            }
        }
    }
}

export function injectApiKey(dataNode: unknown, schemaNode: SchemaNode, swagger: SwaggerSpec, apiKey: string): void {
    if (!dataNode || typeof dataNode !== 'object' || !schemaNode) return;
    const sNode = resolveSchema(schemaNode, swagger);
    const staticApiKey = extractStaticApiKeyFromToken(apiKey);

    if (sNode.type === 'array' && Array.isArray(dataNode)) {
        (dataNode as unknown[]).forEach(item => injectApiKey(item, sNode.items || {}, swagger, apiKey));
    } else if (sNode.type === 'object' && sNode.properties && !Array.isArray(dataNode)) {
        for (const prop in sNode.properties) {
            if (prop.toLowerCase() === 'apikey') {
                const currentValue = (dataNode as Record<string, unknown>)[prop];
                const isLongToken = currentValue && typeof currentValue === 'string' && currentValue.includes('@');
                if (!currentValue || currentValue === "" || isLongToken) {
                    (dataNode as Record<string, unknown>)[prop] = staticApiKey || apiKey;
                }
            } else {
                const childSchema = resolveSchema(sNode.properties[prop], swagger);
                if ((childSchema.type === 'object' || childSchema.type === 'array') && (dataNode as Record<string, unknown>)[prop]) {
                    injectApiKey((dataNode as Record<string, unknown>)[prop], sNode.properties[prop], swagger, apiKey);
                }
            }
        }
    }
}
