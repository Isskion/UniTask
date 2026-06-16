'use client';
/* ───────────────────────────────────────────
   Swagger (REST) Integrator – Main Page
   Self-contained page for UNIGIS REST/Swagger integration.
   ─────────────────────────────────────────── */
import React, { useState, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
    LogEntry, SwaggerSpec, SwaggerMethod, UNIGIS_ERRORS, SchemaNode,
} from './lib/types';
import {
    resolveSchema, parseSwaggerMethods, getSwaggerFields,
    assembleDeepObject, enforceSchemaArrays, injectApiKey,
    extractStaticApiKeyFromToken, sanitizeApiKeyInObject,
} from './lib/swagger-engine';

/* ── Helper: add log ───────────────────────────── */
let logIdCounter = 0;
function createLog(msg: string, type: LogEntry['type']): LogEntry {
    return { id: ++logIdCounter, msg, type, time: new Date().toLocaleTimeString() };
}

export default function UniSwaggerPage() {
    const [swagger, setSwagger] = useState<SwaggerSpec | null>(null);
    const [methods, setMethods] = useState<SwaggerMethod[]>([]);
    const [groups, setGroups] = useState<Record<string, SwaggerMethod[]>>({});
    const [selectedMethod, setSelectedMethod] = useState<SwaggerMethod | null>(null);
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const [requestBody, setRequestBody] = useState<Record<string, unknown>>({});
    const [excelData, setExcelData] = useState<Record<string, unknown>[] | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isAsync, setIsAsync] = useState(false);

    // UI state
    const [loginUrl, setLoginUrl] = useState('https://');
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [remember, setRemember] = useState(false);
    const [methodSearch, setMethodSearch] = useState('');
    const [formSearch, setFormSearch] = useState('');
    const [mappingSearch, setMappingSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'unitary' | 'mass' | 'example'>('unitary');
    const [jsonResponse, setJsonResponse] = useState('');
    const [progress, setProgress] = useState({ count: 0, total: 0, visible: false });
    const [loadingSwagger, setLoadingSwagger] = useState(false);
    const [jsonModalOpen, setJsonModalOpen] = useState(false);
    const [jsonModalText, setJsonModalText] = useState('');
    const [pasteModalOpen, setPasteModalOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [jsonPreviewOverride, setJsonPreviewOverride] = useState<string | null>(null);
    const cancelRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── Restore saved login ─────────────────────── */
    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('unigis_swagger_login');
            if (saved) {
                const d = JSON.parse(saved);
                if (d.url) setLoginUrl(d.url);
                if (d.user) setLoginUser(d.user);
                if (d.pass) setLoginPass(d.pass);
                setRemember(true);
            }
        } catch { /* ignore */ }
    }, []);

    const addLog = useCallback((msg: string, type: LogEntry['type']) => {
        setLogs(prev => [createLog(msg, type), ...prev.slice(0, 199)]);
    }, []);

    /* ── Login ───────────────────────────────────── */
    const handleLogin = useCallback(async () => {
        if (!loginUrl || !loginUser || !loginPass) { setLoginError('URL, Usuario y Contraseña son requeridos.'); return; }
        setLoginError(''); setLoginLoading(true);
        try {
            const base = loginUrl.endsWith('/') ? loginUrl.slice(0, -1) : loginUrl;
            const loginEndpoint = `${base}/Mapi/SOAP/Auth/service.asmx/Login`;
            const proxyUrl = `/api/unigis/proxy?url=${encodeURIComponent(loginEndpoint)}`;
            const response = await fetch(proxyUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: loginUser, password: loginPass, system: 'MAPI' }),
            });
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
            let data: Record<string, unknown> = JSON.parse(await response.text());
            if (data?.d) data = typeof data.d === 'string' ? JSON.parse(data.d as string) : data.d as Record<string, unknown>;

            const ok = data.Result === true || (data.Result && String(data.Result) !== 'False' && String(data.Result) !== '0');
            if (ok && (data.MapiToken || data.ApiKeyToken || data.Token || data.JMT)) {
                if (remember) localStorage.setItem('unigis_swagger_login', JSON.stringify({ url: loginUrl, user: loginUser, pass: loginPass }));
                else localStorage.removeItem('unigis_swagger_login');
                const token = String(data.MapiToken || data.ApiKeyToken || data.Token || data.JMT || '');
                setApiKey(token); setBaseUrl(base); setIsLoggedIn(true); setUserName(loginUser);
                addLog('Sesión iniciada correctamente', 'success');
                loadSwaggerDef(base);
            } else {
                throw new Error((data.Message || data.error || 'Credenciales inválidas') as string);
            }
        } catch (err: unknown) { setLoginError(err instanceof Error ? err.message : 'Error al conectar.'); }
        finally { setLoginLoading(false); }
    }, [loginUrl, loginUser, loginPass, remember, addLog]);

    /* ── Logout ──────────────────────────────────── */
    const handleLogout = useCallback(() => {
        setSwagger(null); setMethods([]); setGroups({}); setSelectedMethod(null);
        setBaseUrl(''); setApiKey(''); setIsLoggedIn(false); setUserName('');
        setRequestBody({}); setExcelData(null); setMapping({}); setJsonResponse('');
        addLog('Sesión cerrada', 'info');
    }, [addLog]);

    /* ── Load Swagger Definition ─────────────────── */
    const loadSwaggerDef = useCallback(async (base: string) => {
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;

        // Parse base to see if it has a sub-path (e.g. https://eu-test.unigis.com/europastry)
        let rootDomain = cleanBase;
        let subPath = '';
        try {
            const urlObj = new URL(cleanBase);
            rootDomain = urlObj.origin;
            subPath = urlObj.pathname !== '/' ? urlObj.pathname : '';
        } catch (e) { /* ignore parse error */ }

        // Múltiples variaciones para intentar localizar el swagger.json
        const possibleSuffixes = [
            '/swagger/docs/v1',
            '/api/swagger/docs/v1',
            '/swagger/v1/swagger.json',
            '/api/swagger/v1/swagger.json',
            '/docs/swagger.json'
        ];

        const urlsToTry: string[] = [];

        // Priority 1: Subpath + Suffix (e.g., /europastry/swagger/v1/swagger.json)
        if (subPath) {
            for (const suffix of possibleSuffixes) {
                urlsToTry.push(`${cleanBase}${suffix}`);
            }
        }

        // Priority 2: Root Domain + Suffix (Fallback)
        for (const suffix of possibleSuffixes) {
            urlsToTry.push(`${rootDomain}${suffix}`);
        }

        // Distinct list
        const uniqueUrlsToTry = Array.from(new Set(urlsToTry));

        setLoadingSwagger(true);
        let spec: SwaggerSpec | null = null;
        let loadedUrl = '';

        for (const url of uniqueUrlsToTry) {
            try {
                addLog(`Intentando cargar Swagger desde: ${url}`, 'info');
                const proxyUrl = `/api/unigis/proxy?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);

                if (response.ok) {
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('application/json') || url.endsWith('.json')) {
                        const text = await response.text();
                        try {
                            spec = JSON.parse(text);
                            loadedUrl = url;
                            break;
                        } catch (parseError) {
                            // Valid response, but not valid JSON
                        }
                    }
                }
            } catch (err) {
                // Ignore and try the next URL
                console.warn(`Falló cargar Swagger desde ${url}`);
            }
        }

        if (spec) {
            try {
                setSwagger(spec);
                const { methods: m, groups: g } = parseSwaggerMethods(spec);
                setMethods(m); setGroups(g);
                // Auto-expand first group or 'Logistic'
                const firstKey = Object.keys(g).find(k => k.toLowerCase().includes('logistic')) || Object.keys(g)[0];
                if (firstKey) setExpandedGroups({ [firstKey]: true });
                addLog(`Swagger cargado (${loadedUrl}): ${m.length} métodos en ${Object.keys(g).length} grupos`, 'success');
            } catch (err) {
                addLog('El JSON de Swagger se cargó pero hubo un error al procesarlo.', 'error');
                console.error(err);
            }
        } else {
            addLog('No se pudo cargar el Swagger de ninguna URL conocida. Intenta con "Pegar JSON".', 'error');
        }

        setLoadingSwagger(false);
    }, [addLog]);

    /* ── Paste Swagger JSON ──────────────────────── */
    const handlePasteSwagger = useCallback(() => {
        try {
            const spec: SwaggerSpec = JSON.parse(pasteText);
            setSwagger(spec);
            const { methods: m, groups: g } = parseSwaggerMethods(spec);
            setMethods(m); setGroups(g);
            const firstKey = Object.keys(g)[0];
            if (firstKey) setExpandedGroups({ [firstKey]: true });
            setPasteModalOpen(false);
            addLog('Swagger cargado desde JSON pegado', 'success');
        } catch { addLog('JSON inválido', 'error'); }
    }, [pasteText, addLog]);

    /* ── Select Method ───────────────────────────── */
    const selectMethod = useCallback((method: SwaggerMethod) => {
        setSelectedMethod(method); setMapping({}); setRequestBody({});
        setActiveTab('unitary'); setJsonResponse('');
        setIsAsync(method.tag.toLowerCase() === 'logisticasync');
        setJsonPreviewOverride(null);
    }, []);

    /* ── Update form field ───────────────────────── */
    const updateField = useCallback((path: string[], value: unknown) => {
        setRequestBody(prev => {
            const newBody = JSON.parse(JSON.stringify(prev));
            let current: Record<string, unknown> = newBody;
            for (let i = 0; i < path.length - 1; i++) {
                if (!current[path[i]]) current[path[i]] = {};
                current = current[path[i]] as Record<string, unknown>;
            }
            current[path[path.length - 1]] = value;
            return newBody;
        });
    }, []);

    /* ── Send Unitary ────────────────────────────── */
    const sendUnitary = useCallback(async () => {
        if (!selectedMethod || !swagger) return;
        addLog(`Enviando petición a ${selectedMethod.path}...`, 'info');
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        let targetUrl = cleanBase + selectedMethod.path;
        if (isAsync) {
            let methodName = selectedMethod.definition.operationId || '';
            if (!methodName || methodName.trim().toLowerCase() === 'default') {
                const parts = selectedMethod.path.split('/').filter(p => p && !p.startsWith('{'));
                methodName = parts[parts.length - 1] || selectedMethod.verb.toUpperCase();
            }
            targetUrl = `${cleanBase}/Mapi/SOAP/LogisticAsync/${methodName}`;
        }

        // Auto-inject ApiKey
        const body = JSON.parse(JSON.stringify(requestBody));
        const bodyParam = (selectedMethod.definition.parameters || []).find(p => p.in === 'body');
        if (bodyParam?.schema && apiKey) injectApiKey(body, bodyParam.schema, swagger, apiKey);

        const staticKey = extractStaticApiKeyFromToken(apiKey);
        const targetKey = staticKey || apiKey;
        if (body && targetKey) {
            if (Array.isArray(body)) {
                body.forEach(item => {
                    if (item && typeof item === 'object') {
                        const currentKey = (item as any).ApiKey || (item as any).apiKey;
                        const isLongToken = currentKey && typeof currentKey === 'string' && currentKey.includes('@');
                        if (!currentKey || currentKey === "" || isLongToken) {
                            (item as any).ApiKey = targetKey;
                        }
                    }
                });
            } else if (typeof body === 'object') {
                const currentRootKey = (body as any).ApiKey || (body as any).apiKey;
                const isLongToken = currentRootKey && typeof currentRootKey === 'string' && currentRootKey.includes('@');
                if (!currentRootKey || currentRootKey === "" || isLongToken) {
                    (body as any).ApiKey = targetKey;
                }
            }
            sanitizeApiKeyInObject(body, targetKey);
        }

        try {
            let headerApiKey = targetKey;
            if (body && typeof body === 'object') {
                const node = Array.isArray(body) ? body[0] : body;
                if (node && typeof node === 'object') {
                    if ((node as any).ApiKey) headerApiKey = String((node as any).ApiKey);
                    else if ((node as any).apiKey) headerApiKey = String((node as any).apiKey);
                }
            }
            const isGetOrHead = ['GET', 'HEAD'].includes(selectedMethod.verb.toUpperCase());
            const fetchInit: RequestInit = {
                method: selectedMethod.verb.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    'ApiKey': headerApiKey,
                    'X-ApiKey': headerApiKey,
                    'MapiToken': apiKey,
                    'Authorization': `Bearer ${apiKey}`,
                    'Token': apiKey
                }
            };
            if (!isGetOrHead) {
                fetchInit.body = JSON.stringify(body);
            }

            const resp = await fetch(`/api/unigis/proxy?url=${encodeURIComponent(targetUrl)}`, fetchInit);
            const rawResp = await resp.text();
            let parsed: unknown;
            try { parsed = JSON.parse(rawResp); } catch { parsed = rawResp; }
            setJsonResponse(JSON.stringify(parsed, null, 2));
            setActiveTab('example');

            if (typeof parsed === 'object' && parsed !== null) {
                const code = String((parsed as Record<string, unknown>).Result ?? (parsed as Record<string, unknown>).result ?? '');
                if (code && UNIGIS_ERRORS[code]) {
                    addLog(`Petición: ${Number(code) === 1 ? '✅ OK' : `⚠️ ${UNIGIS_ERRORS[code]} (${code})`}`, Number(code) === 1 ? 'success' : 'warning');
                } else { addLog(`Petición: HTTP ${resp.status}`, resp.ok ? 'success' : 'error'); }
            } else { addLog(`Petición: HTTP ${resp.status}`, resp.ok ? 'success' : 'error'); }
        } catch (err) { addLog('Error de red.', 'error'); console.error(err); }
    }, [selectedMethod, swagger, requestBody, apiKey, baseUrl, isAsync, addLog]);

    /* ── Excel Upload ────────────────────────────── */
    const handleExcel = useCallback((file: File | undefined) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheets: Record<string, Record<string, unknown>[]> = {};
            workbook.SheetNames.forEach(n => { sheets[n] = XLSX.utils.sheet_to_json(workbook.Sheets[n]); });
            const mainData = sheets[workbook.SheetNames[0]] || [];
            setExcelData(mainData);
            addLog(`Excel cargado: ${mainData.length} filas`, 'success');
        };
        reader.readAsArrayBuffer(file);
    }, [addLog]);

    /* ── Mass Integration ────────────────────────── */
    const startMass = useCallback(async () => {
        if (!excelData || !selectedMethod || !swagger) return;
        const bodyParam = (selectedMethod.definition.parameters || []).find(p => p.in === 'body');
        if (!bodyParam?.schema) return;
        const rootSchema = resolveSchema(bodyParam.schema, swagger);
        const total = excelData.length;
        addLog(`Iniciando integración masiva de ${total} registros...`, 'success');

        // Intentar obtener la ApiKey estática de la plantilla de request unitaria
        let templateApiKey = "";
        if (requestBody) {
            if (Array.isArray(requestBody) && requestBody.length > 0 && typeof requestBody[0] === 'object') {
                const first = requestBody[0] as any;
                if (first.ApiKey) templateApiKey = String(first.ApiKey);
                else if (first.apiKey) templateApiKey = String(first.apiKey);
            } else if (typeof requestBody === 'object') {
                const rb = requestBody as any;
                if (rb.ApiKey) templateApiKey = String(rb.ApiKey);
                else if (rb.apiKey) templateApiKey = String(rb.apiKey);
            }
        }
        // Si la api key de la plantilla es un token largo, extraer la estática:
        if (templateApiKey && templateApiKey.includes('@')) {
            const decodedKey = extractStaticApiKeyFromToken(templateApiKey);
            if (decodedKey) templateApiKey = decodedKey;
        }

        cancelRef.current = false;
        setProgress({ count: 0, total, visible: true });
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        let processed = 0;
        const limit = 20;
        for (let i = 0; i < total; i += limit) {
            if (cancelRef.current) { addLog(`Cancelado en registro ${i}.`, 'warning'); break; }
            const batch = excelData.slice(i, i + limit);
            await Promise.all(batch.map(async (row, idx) => {
                let request: any;
                if (rootSchema.type === 'array') {
                    const itemSchema = resolveSchema(rootSchema.items || {}, swagger);
                    let draft = assembleDeepObject(row, mapping);
                    draft = enforceSchemaArrays(draft, itemSchema.properties || {}, swagger);
                    if (templateApiKey && !draft.ApiKey && !draft.apiKey) {
                        draft.ApiKey = templateApiKey;
                    }
                    request = [draft];
                } else {
                    let draft = assembleDeepObject(row, mapping);
                    draft = enforceSchemaArrays(draft, rootSchema.properties || {}, swagger);
                    if (templateApiKey && !draft.ApiKey && !draft.apiKey) {
                        draft.ApiKey = templateApiKey;
                    }
                    request = draft;
                }
                if (apiKey && bodyParam.schema) injectApiKey(request, bodyParam.schema, swagger, apiKey);

                const staticKey = extractStaticApiKeyFromToken(apiKey);
                const targetKey = staticKey || apiKey;
                if (request && targetKey) {
                    if (Array.isArray(request)) {
                        request.forEach(item => {
                            if (item && typeof item === 'object') {
                                const currentKey = (item as any).ApiKey || (item as any).apiKey;
                                const isLongToken = currentKey && typeof currentKey === 'string' && currentKey.includes('@');
                                if (!currentKey || currentKey === "" || isLongToken) {
                                    (item as any).ApiKey = targetKey;
                                }
                            }
                        });
                    } else if (typeof request === 'object') {
                        const currentRootKey = (request as any).ApiKey || (request as any).apiKey;
                        const isLongToken = currentRootKey && typeof currentRootKey === 'string' && currentRootKey.includes('@');
                        if (!currentRootKey || currentRootKey === "" || isLongToken) {
                            (request as any).ApiKey = targetKey;
                        }
                    }
                    sanitizeApiKeyInObject(request, targetKey);
                }

                let targetUrl = cleanBase + selectedMethod.path;
                if (isAsync) {
                    let methodName = selectedMethod.definition.operationId || '';
                    if (!methodName || methodName.trim().toLowerCase() === 'default') {
                        const parts = selectedMethod.path.split('/').filter(p => p && !p.startsWith('{'));
                        methodName = parts[parts.length - 1] || selectedMethod.verb.toUpperCase();
                    }
                    targetUrl = `${cleanBase}/Mapi/SOAP/LogisticAsync/${methodName}`;
                }
                try {
                    let headerApiKey = targetKey;
                    if (request && typeof request === 'object') {
                        const node = Array.isArray(request) ? request[0] : request;
                        if (node && typeof node === 'object') {
                            if ((node as any).ApiKey) headerApiKey = String((node as any).ApiKey);
                            else if ((node as any).apiKey) headerApiKey = String((node as any).apiKey);
                        }
                    }
                    const resp = await fetch(`/api/unigis/proxy?url=${encodeURIComponent(targetUrl)}`, {
                        method: selectedMethod.verb.toUpperCase(),
                        headers: {
                            'Content-Type': 'application/json',
                            'ApiKey': headerApiKey,
                            'X-ApiKey': headerApiKey,
                            'MapiToken': apiKey,
                            'Authorization': `Bearer ${apiKey}`,
                            'Token': apiKey
                        },
                        body: JSON.stringify(request),
                    });
                    const raw = await resp.text();
                    let parsed: unknown; try { parsed = JSON.parse(raw); } catch { parsed = raw; }
                    const num = i + idx + 1;
                    if (typeof parsed === 'object' && parsed !== null) {
                        const code = String((parsed as Record<string, unknown>).Result ?? '');
                        if (code && UNIGIS_ERRORS[code]) {
                            addLog(`Reg ${num}/${total}: ${Number(code) === 1 ? '✅ OK' : `⚠️ ${UNIGIS_ERRORS[code]}`}`, Number(code) === 1 ? 'success' : 'warning');
                        } else { addLog(`Reg ${num}/${total}: HTTP ${resp.status}`, resp.ok ? 'success' : 'error'); }
                    } else { addLog(`Reg ${num}/${total}: HTTP ${resp.status}`, resp.ok ? 'success' : 'error'); }
                } catch { addLog(`Reg ${i + idx + 1}/${total}: Error de red`, 'error'); }
                processed++;
                setProgress(p => ({ ...p, count: processed }));
            }));
            await new Promise(r => setTimeout(r, 50));
        }
        if (!cancelRef.current) addLog('Integración masiva completada.', 'success');
        setTimeout(() => setProgress(p => ({ ...p, visible: false })), 2000);
    }, [excelData, selectedMethod, swagger, mapping, apiKey, baseUrl, isAsync, addLog]);

    /* ── Download Excel Template ─────────────────── */
    const downloadTemplate = useCallback(() => {
        if (!selectedMethod || !swagger) return;
        const fields = getSwaggerFields(selectedMethod, swagger);
        if (!fields.length) { addLog('Sin campos para exportar.', 'warning'); return; }
        const headerRow: Record<string, string> = {};
        fields.forEach(f => { headerRow[f.name] = `[${f.type}]`; });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet([headerRow]);
        XLSX.utils.book_append_sheet(wb, ws, 'Datos Masivos');
        XLSX.writeFile(wb, `${selectedMethod.displayName}_Template.xlsx`);
        addLog('Plantilla Excel descargada', 'success');
    }, [selectedMethod, swagger, addLog]);

    /* ── Apply JSON Template ─────────────────────── */
    const applyJsonTemplate = useCallback(() => {
        try {
            const raw = jsonModalText.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
            const template = JSON.parse(raw);
            setRequestBody(template);
            setJsonModalOpen(false);
            addLog('JSON Preformado aplicado al formulario', 'success');
        } catch (err) { addLog(`JSON inválido: ${err instanceof Error ? err.message : 'Error'}`, 'error'); }
    }, [jsonModalText, addLog]);

    /* ── Computed values ─────────────────────────── */
    const filteredGroups = useMemo(() => {
        if (!methodSearch) return groups;
        const q = methodSearch.toLowerCase();
        const filtered: Record<string, SwaggerMethod[]> = {};
        Object.entries(groups).forEach(([tag, ms]) => {
            const fm = ms.filter(m => m.displayName.toLowerCase().includes(q));
            if (fm.length) filtered[tag] = fm;
        });
        return filtered;
    }, [groups, methodSearch]);

    const swaggerFields = useMemo(() => {
        if (!selectedMethod || !swagger) return [];
        return getSwaggerFields(selectedMethod, swagger);
    }, [selectedMethod, swagger]);

    const excelColumns = useMemo(() => {
        if (!excelData?.length) return [];
        return Object.keys(excelData[0]);
    }, [excelData]);

    const jsonPreview = useMemo(() => {
        return JSON.stringify(requestBody, null, 2);
    }, [requestBody]);

    /* ── Render Form Fields ──────────────────────── */
    const renderFormFields = (schema: SchemaNode, path: string[] = []): React.ReactNode => {
        if (!swagger) return null;
        const resolved = resolveSchema(schema, swagger);
        if (!resolved.properties) return null;
        return Object.entries(resolved.properties).map(([key, fieldSchema]) => {
            const currentPath = [...path, key];
            const pathKey = currentPath.join('.');
            const field = resolveSchema(fieldSchema, swagger);
            if (formSearch && !key.toLowerCase().includes(formSearch.toLowerCase())) return null;
            if (field.type === 'object' && field.properties) {
                return (
                    <fieldset key={pathKey} className="border border-white/10 rounded-lg p-3 mb-3 bg-white/[0.02]">
                        <legend className="text-xs font-bold text-violet-400 uppercase tracking-wider px-2">{key}</legend>
                        {renderFormFields(field, currentPath)}
                    </fieldset>
                );
            }
            if (field.type === 'array') {
                return (
                    <div key={pathKey} className="border border-dashed border-white/10 rounded-lg p-3 mb-3 bg-white/[0.02]">
                        <h4 className="text-xs text-slate-400 mb-2">{key} (Lista)</h4>
                        <p className="text-xs text-slate-500">Usa Masivo (Excel) para múltiples items, o Cargar JSON.</p>
                    </div>
                );
            }
            return (
                <div key={pathKey} className="mb-3">
                    <label className="block text-xs text-slate-400 mb-1">{key}</label>
                    {field.type === 'boolean' ? (
                        <select className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-md text-white text-sm"
                            onChange={e => updateField(currentPath, e.target.value === '' ? undefined : e.target.value === 'true')}>
                            <option value="">--</option><option value="false">false</option><option value="true">true</option>
                        </select>
                    ) : (
                        <input type={field.type === 'integer' || field.type === 'number' ? 'number' : 'text'}
                            placeholder={field.description || field.format || field.type || ''}
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-md text-white text-sm focus:border-violet-400 outline-none transition-colors"
                            onChange={e => {
                                const v = e.target.value;
                                if (v === '') { updateField(currentPath, undefined); return; }
                                updateField(currentPath, (field.type === 'integer' || field.type === 'number') ? Number(v) : v);
                            }} />
                    )}
                </div>
            );
        });
    };

    /* ── Get body schema for current method ──────── */
    const bodySchema = useMemo(() => {
        if (!selectedMethod || !swagger) return null;
        const bodyParam = (selectedMethod.definition.parameters || []).find(p => p.in === 'body');
        if (!bodyParam?.schema) return null;
        return resolveSchema(bodyParam.schema, swagger);
    }, [selectedMethod, swagger]);

    /* ────────────────────────────────────
       RENDER
       ──────────────────────────────────── */

    // ── LOGIN SCREEN ──
    if (!isLoggedIn) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a] font-sans">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-100">
                    {/* Logo Header */}
                    <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 text-center">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.15),transparent_70%)]" />
                        <img src="/Logo_Login.jpg" alt="UNIGIS" className="relative h-14 mx-auto mb-3 rounded-xl ring-2 ring-white/20 shadow-lg" />
                        <h2 className="relative text-xl font-bold text-white">🔗 Iniciar Sesión</h2>
                        <p className="relative text-xs text-slate-400 mt-1">UniTask Platinum · Integrador Swagger</p>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Language Selector */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Idioma</label>
                            <select
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all text-slate-700"
                                defaultValue="es"
                            >
                                <option value="es">🇪🇸 Español</option>
                                <option value="en">🇬🇧 English</option>
                            </select>
                        </div>

                        {/* URL */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">URL DEL SERVICIO</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all text-slate-700"
                                value={loginUrl}
                                onChange={e => setLoginUrl(e.target.value)}
                                placeholder="https://tu-ambiente.unigis.com"
                            />
                        </div>

                        {/* User */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all text-slate-700"
                                value={loginUser}
                                onChange={e => setLoginUser(e.target.value)}
                                placeholder="Usuario MAPI"
                                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all text-slate-700"
                                    value={loginPass}
                                    onChange={e => setLoginPass(e.target.value)}
                                    placeholder="Contraseña"
                                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                />
                            </div>
                        </div>

                        {/* Remember */}
                        <label className="flex items-center gap-2 cursor-pointer select-none pb-2">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/50 accent-indigo-600"
                                checked={remember}
                                onChange={e => setRemember(e.target.checked)}
                            />
                            <span className="text-sm text-slate-600">Recordar credenciales</span>
                        </label>

                        {/* Error */}
                        {loginError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                                ❌ {loginError}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <button
                            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
                            onClick={() => { }}
                        >
                            Cerrar
                        </button>
                        <button
                            className="flex-1 px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-500 hover:to-red-400 shadow-[0_4px_14px_0_rgba(239,68,68,0.39)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.23)] transition-all disabled:opacity-50 disabled:hover:shadow-[0_4px_14px_0_rgba(239,68,68,0.39)]"
                            onClick={handleLogin}
                            disabled={loginLoading}
                        >
                            {loginLoading ? '⏳ Conectando...' : 'Conectar'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── MAIN APP ──
    return (
        <div className="flex h-screen bg-[#0f172a] text-slate-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[300px] m-2 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                <div className="p-6 border-b border-white/10">
                    <div className="text-2xl font-extrabold text-violet-400 tracking-tight">UNIGIS</div>
                    <div className="text-sm text-slate-400">Swagger REST API</div>
                </div>
                <div className="p-4 flex flex-col gap-2">
                    <input type="text" value={methodSearch} onChange={e => setMethodSearch(e.target.value)} placeholder="Buscar método..."
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:border-violet-400 outline-none" />
                    <button onClick={() => setPasteModalOpen(true)} className="text-xs text-violet-400 hover:text-violet-300">📋 Pegar JSON Swagger</button>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 pb-3">
                    {loadingSwagger ? <div className="text-sm text-slate-400 p-4">Cargando Swagger...</div> : (
                        Object.keys(filteredGroups).length === 0 ? <div className="text-sm text-slate-500 p-4">Sin métodos</div> : (
                            Object.entries(filteredGroups).map(([tag, ms]) => (
                                <div key={tag}>
                                    <div onClick={() => setExpandedGroups(prev => ({ ...prev, [tag]: !prev[tag] }))}
                                        className="px-3 py-2 mt-2 bg-white/5 rounded-md cursor-pointer text-xs font-bold text-violet-400 uppercase flex justify-between items-center">
                                        {tag} <span className="text-[10px]">{expandedGroups[tag] ? '▼' : '▶'}</span>
                                    </div>
                                    {expandedGroups[tag] && (
                                        <div className="pl-3 border-l border-white/10 mt-1">
                                            {ms.map(m => (
                                                <div key={`${m.path}-${m.verb}`} onClick={() => selectMethod(m)}
                                                    className={`px-3 py-2 mb-1 rounded-lg cursor-pointer text-sm transition-all ${selectedMethod?.path === m.path && selectedMethod?.verb === m.verb ? 'bg-violet-500 text-white font-semibold' : 'hover:bg-white/10'}`}>
                                                    {m.displayName}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )
                    )}
                </nav>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col p-2 pl-0 gap-2 min-w-0">
                {/* Top Bar */}
                <header className="h-[60px] flex items-center justify-between px-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-200">Bienvenido {userName}</span>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-400/20 px-2 py-0.5 rounded border border-emerald-400/40">Online</span>
                    </div>
                    <button onClick={handleLogout} className="text-sm text-red-400 border border-red-400/50 px-4 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors">Cerrar Sesión</button>
                </header>

                {/* Content */}
                <section className="flex-1 overflow-y-auto overflow-x-hidden p-2 min-w-0">
                    {!selectedMethod ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Integrador Swagger REST</h1>
                            <p className="text-slate-400">Selecciona un método del panel lateral para generar un request JSON.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <h2 className="text-xl font-bold text-slate-100">{selectedMethod.displayName}</h2>
                                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">{selectedMethod.verb}</span>
                                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer ml-4">
                                    <input type="checkbox" checked={isAsync} onChange={e => setIsAsync(e.target.checked)} className="accent-violet-400" /> Asíncrono
                                </label>
                            </div>
                            {/* Tabs */}
                            <div className="inline-flex bg-black/20 rounded-lg p-1 mb-4 gap-1">
                                {(['unitary', 'mass', 'example'] as const).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-violet-500 text-white font-semibold shadow-lg shadow-violet-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
                                        {tab === 'unitary' ? 'Unitario' : tab === 'mass' ? 'Masivo (Excel)' : 'Respuesta'}
                                    </button>
                                ))}
                            </div>

                            {/* Unitary */}
                            {activeTab === 'unitary' && (
                                <div className="grid grid-cols-2 gap-5 bg-white/5 border border-white/10 rounded-xl p-5">
                                    <div className="flex flex-col gap-2">
                                        <input type="text" value={formSearch} onChange={e => setFormSearch(e.target.value)} placeholder="Filtrar campos..."
                                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm" />
                                        <div className="overflow-y-auto max-h-[65vh] bg-black/20 rounded-lg p-3">
                                            {bodySchema ? renderFormFields(bodySchema) : <p className="text-slate-500 text-sm">Este método no requiere body.</p>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 max-h-[65vh]">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-semibold text-slate-300">JSON Request (Editable)</h3>
                                            <button onClick={() => {
                                                if (jsonModalText) {
                                                    setJsonPreviewOverride(jsonModalText);
                                                } else {
                                                    // Quick Hack: Generate basic structure
                                                    const template: any = {};
                                                    if (bodySchema?.properties) {
                                                        Object.keys(bodySchema.properties).forEach(k => template[k] = null);
                                                    }
                                                    setJsonPreviewOverride(JSON.stringify(template, null, 2));
                                                }
                                            }} className="text-[10px] text-violet-400 font-bold uppercase tracking-wider hover:underline">Autocompletar Objeto</button>
                                        </div>
                                        <textarea
                                            className="flex-1 bg-black/40 p-4 rounded-lg text-xs font-mono overflow-auto border border-white/10 whitespace-pre focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                            value={jsonPreviewOverride !== null ? jsonPreviewOverride : jsonPreview}
                                            onChange={e => {
                                                setJsonPreviewOverride(e.target.value);
                                                try {
                                                    const parsed = JSON.parse(e.target.value);
                                                    // Silently update request body if valid
                                                    setRequestBody(parsed);
                                                } catch (err) { /* ignore parse errors while typing */ }
                                            }}
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={async () => {
                                                // Ensure we send exactly what is in the textarea if overriden
                                                let payload = requestBody;
                                                if (jsonPreviewOverride !== null) {
                                                    try { payload = JSON.parse(jsonPreviewOverride); }
                                                    catch (e) { addLog('El JSON Request es inválido.', 'error'); return; }
                                                }
                                                // Temporarily set request body to send payload
                                                const original = requestBody;
                                                setRequestBody(payload);
                                                await sendUnitary();
                                                setRequestBody(original);
                                            }} className="px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-400 transition-colors">Enviar Request</button>
                                            <button onClick={() => setJsonModalOpen(true)} className="px-4 py-2 bg-white/10 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors">Pegar JSON</button>
                                            <button onClick={downloadTemplate} className="px-4 py-2 bg-violet-500/20 text-violet-400 border border-violet-400/30 font-semibold rounded-lg hover:bg-violet-500/30 transition-colors">Plantilla Excel</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Mass */}
                            {activeTab === 'mass' && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                                    <div onClick={() => fileInputRef.current?.click()}
                                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-violet-400', 'bg-violet-400/10'); }}
                                        onDragLeave={e => { e.currentTarget.classList.remove('border-violet-400', 'bg-violet-400/10'); }}
                                        onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-violet-400', 'bg-violet-400/10'); handleExcel(e.dataTransfer.files[0]); }}
                                        className="border-2 border-dashed border-white/20 bg-black/20 p-16 text-center rounded-xl cursor-pointer hover:border-violet-400/50 hover:bg-violet-400/5 transition-all text-slate-400">
                                        {excelData ? `✅ ${excelData.length} filas cargadas` : 'Arrastra tu archivo Excel aquí o haz clic para subir'}
                                    </div>
                                    <input ref={fileInputRef} type="file" hidden accept=".xlsx,.xls" onChange={e => handleExcel(e.target.files?.[0])} />
                                    {excelData && swaggerFields.length > 0 && (
                                        <div className="mt-6">
                                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Mapeo de Campos</h3>
                                            <input type="text" value={mappingSearch} onChange={e => setMappingSearch(e.target.value)} placeholder="Buscar campo..."
                                                className="w-full px-3 py-2 mb-3 bg-black/30 border border-white/10 rounded-lg text-white text-sm" />
                                            <table className="w-full border-collapse"><thead><tr className="text-xs text-slate-400 uppercase bg-black/30"><th className="p-3 text-left">Campo Swagger</th><th className="p-3 text-left">Columna Excel</th></tr></thead>
                                                <tbody>{swaggerFields.filter(f => !mappingSearch || f.name.toLowerCase().includes(mappingSearch.toLowerCase())).map(field => (
                                                    <tr key={field.name} className="border-b border-white/5 hover:bg-violet-400/5"><td className="p-3 text-sm">{field.name}</td><td className="p-3">
                                                        <select className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-md text-sm"
                                                            defaultValue={excelColumns.find(c => c.toLowerCase() === field.name.toLowerCase()) || ''}
                                                            onChange={e => setMapping(prev => {
                                                                const n = { ...prev }; if (e.target.value) n[field.name] = e.target.value; else delete n[field.name]; return n;
                                                            })}><option value="">-- No mapear --</option>{excelColumns.map(col => <option key={col} value={col}>{col}</option>)}</select>
                                                    </td></tr>
                                                ))}</tbody></table>
                                            {progress.visible && (
                                                <div className="mt-4 bg-black/20 p-4 rounded-lg border border-white/10">
                                                    <div className="text-xs text-slate-400 mb-2">Procesando: {progress.count} / {progress.total} ({Math.round((progress.count / progress.total) * 100)}%)</div>
                                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full transition-all" style={{ width: `${(progress.count / progress.total) * 100}%` }} /></div></div>
                                            )}
                                            <div className="mt-4 flex justify-end gap-2">
                                                <button onClick={startMass} className="px-5 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-400">Iniciar Integración</button>
                                                <button onClick={() => { cancelRef.current = true; }} className="px-5 py-2 bg-red-500/20 text-red-400 border border-red-400/30 font-semibold rounded-lg hover:bg-red-500/30">Cancelar</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Response/Example */}
                            {activeTab === 'example' && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                                    <pre className="bg-black/40 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[65vh] border border-white/10 whitespace-pre-wrap break-all">
                                        {jsonResponse || '// Envía una petición para ver la respuesta aquí'}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Log */}
                <footer className="h-[150px] flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                        <span className="text-xs font-semibold text-slate-400">Log de Respuestas</span>
                        <button onClick={() => setLogs([])} className="text-xs text-slate-500 border border-white/10 px-2 py-0.5 rounded hover:bg-white/10">🗑️ Limpiar</button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs">
                        {logs.map(log => (
                            <div key={log.id} className={`mb-1 px-2 py-1 rounded ${log.type === 'success' ? 'text-emerald-400 bg-emerald-400/10' : log.type === 'error' ? 'text-red-400 bg-red-400/10' : log.type === 'warning' ? 'text-amber-400 bg-amber-400/10' : 'text-violet-400 bg-violet-400/10'}`}>
                                [{log.time}] {log.msg}
                            </div>
                        ))}
                    </div>
                </footer>
            </main>

            {/* JSON Template Modal */}
            {jsonModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="w-[600px] p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-slate-200">Cargar JSON Preformado</h3>
                        <textarea value={jsonModalText} onChange={e => setJsonModalText(e.target.value)} placeholder='{ "campo": "valor" }'
                            className="h-[300px] bg-black/40 border border-white/10 text-emerald-400 font-mono p-4 rounded-lg text-sm" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setJsonModalOpen(false)} className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg">Cancelar</button>
                            <button onClick={applyJsonTemplate} className="px-4 py-2 bg-violet-500 text-white font-semibold rounded-lg">Aplicar JSON</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Paste Swagger Modal */}
            {pasteModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="w-[600px] p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-slate-200">Pegar JSON de Swagger</h3>
                        <p className="text-sm text-slate-400">Si la carga automática falla, descarga el JSON de Swagger y pégalo aquí.</p>
                        <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder='{"swagger": "2.0", ...}'
                            className="h-[300px] bg-black/40 border border-white/10 text-emerald-400 font-mono p-4 rounded-lg text-sm" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setPasteModalOpen(false)} className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg">Cancelar</button>
                            <button onClick={handlePasteSwagger} className="px-4 py-2 bg-violet-500 text-white font-semibold rounded-lg">Procesar JSON</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
