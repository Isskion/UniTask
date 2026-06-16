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

export function injectApiKey(dataNode: unknown, schemaNode: SchemaNode, swagger: SwaggerSpec, apiKey: string): void {
    if (!dataNode || typeof dataNode !== 'object' || !schemaNode) return;
    const sNode = resolveSchema(schemaNode, swagger);
    if (sNode.type === 'array' && Array.isArray(dataNode)) {
        (dataNode as unknown[]).forEach(item => injectApiKey(item, sNode.items || {}, swagger, apiKey));
    } else if (sNode.type === 'object' && sNode.properties && !Array.isArray(dataNode)) {
        for (const prop in sNode.properties) {
            if (prop.toLowerCase() === 'apikey') {
                const currentValue = (dataNode as Record<string, unknown>)[prop];
                if (!currentValue || currentValue === "") {
                    (dataNode as Record<string, unknown>)[prop] = apiKey;
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
