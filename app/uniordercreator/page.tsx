'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppStore } from '@/app/uniordercreator/_src/store/appStore';
import { parseExcelFile, groupRows } from '@/app/uniordercreator/_src/utils/excelParser';
import { generateValidationReport, type ValidationReport } from '@/app/uniordercreator/_src/utils/validation';
import { buildXml, type BuildXmlContext } from '@/app/uniordercreator/_src/services/xmlBuilder';
// IMPORTANTE: Ya no llamamos a soapService (Express), usaremos fetch a nuestra propia API Route Next.js
// import { soapCall } from '@/app/uniordercreator/_src/services/soapService';
import { UNIGIS_ERROR_CODES } from '@/app/uniordercreator/_src/data/errorCodes';
import { type ProgressLog } from '@/app/uniordercreator/_src/components/Modals/ProgressModal';
import { postSoapProxy } from '@/lib/soapProxy';

import Header from '@/app/uniordercreator/_src/components/Header/Header';
import MasterTable from '@/app/uniordercreator/_src/components/DataPanel/MasterTable';
import DetailPanel from '@/app/uniordercreator/_src/components/DataPanel/DetailPanel';
import XmlPreview from '@/app/uniordercreator/_src/components/XmlPreview/XmlPreview';
import MapperPanel from '@/app/uniordercreator/_src/components/Mapper/MapperPanel';
import LoginModal from '@/app/uniordercreator/_src/components/Modals/LoginModal';
import ProgressModal from '@/app/uniordercreator/_src/components/Modals/ProgressModal';
import ValidationReportModal from '@/app/uniordercreator/_src/components/Modals/ValidationReportModal';
import MassEditModal from '@/app/uniordercreator/_src/components/Modals/MassEditModal';
import DynamicFieldsWizard from '@/app/uniordercreator/_src/components/Wizards/DynamicFieldsWizard';
import MultiSheetWizard from '@/app/uniordercreator/_src/components/Wizards/MultiSheetWizard';
import MappingWizard from '@/app/uniordercreator/_src/components/Wizards/MappingWizard';
import MappingActions from '@/app/uniordercreator/_src/components/Mapper/MappingActions';
import LayoutExporter from '@/app/uniordercreator/_src/components/Mapper/LayoutExporter';
import DataPrepModal from '@/app/uniordercreator/_src/components/Modals/DataPrepModal';
import HelpModal from '@/app/uniordercreator/_src/components/Modals/HelpModal';
import ResultsDashboard from '@/app/uniordercreator/_src/components/Dashboard/ResultsDashboard';
import { ToastProvider } from '@/app/uniordercreator/_src/components/UI/ToastProvider';

import '@/app/uniordercreator/_src/i18n';
import '@/app/uniordercreator/_src/App.css';

const SESSION_KEY = 'uoc_session';

function UnigisOrderCreatorPageInner({ tenantId }: { tenantId: string }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoadingExcel, setIsLoadingExcel] = useState(false);

    // Modals / Wizards state
    const [loginOpen, setLoginOpen] = useState(true);
    const [progressOpen, setProgressOpen] = useState(false);
    const [validationOpen, setValidationOpen] = useState(false);
    const [massEditOpen, setMassEditOpen] = useState(false);
    const [dynWizardOpen, setDynWizardOpen] = useState(false);
    const [multiSheetWizOpen, setMultiSheetWizOpen] = useState(false);
    const [mappingWizardOpen, setMappingWizardOpen] = useState(false);
    const [mappingActionsOpen, setMappingActionsOpen] = useState(false);
    const [layoutExporterOpen, setLayoutExporterOpen] = useState(false);
    const [layoutExporterMode, setLayoutExporterMode] = useState<'export' | 'import'>('export');
    const [dataPrepOpen, setDataPrepOpen] = useState(false);
    const [dashboardOpen, setDashboardOpen] = useState(false);

    // Progress state
    const [progressTotal, setProgressTotal] = useState(0);
    const [progressCurrent, setProgressCurrent] = useState(0);
    const [progressSuccess, setProgressSuccess] = useState(0);
    const [progressError, setProgressError] = useState(0);
    const [progressComplete, setProgressComplete] = useState(false);
    const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);

    // Validation
    const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);

    // Store
    const setRows = useAppStore((s) => s.setRows);
    const setHeaders = useAppStore((s) => s.setHeaders);
    const rows = useAppStore((s) => s.rows);
    const mapping = useAppStore((s) => s.mapping);
    const setMapping = useAppStore((s) => s.setMapping);
    const headers = useAppStore((s) => s.headers);
    const token = useAppStore((s) => s.token);
    const orderUrl = useAppStore((s) => s.orderUrl);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const setRowStatus = useAppStore((s) => s.setRowStatus);
    const updateRowData = useAppStore((s) => s.updateRowData);
    const setIsSending = useAppStore((s) => s.setIsSending);
    const setSendCancelled = useAppStore((s) => s.setSendCancelled);
    const multiSheet = useAppStore((s) => s.multiSheet);
    const setBooleanOverride = useAppStore((s) => s.setBooleanOverride);

    // ─── #27: Auto-save session to localStorage on changes ────────────
    useEffect(() => {
        if (rows.length === 0 && Object.keys(mapping).length === 0) return;
        const timeout = setTimeout(() => {
            try {
                const session = {
                    rows: rows.slice(0, 500), // Limit to prevent quota exceeded
                    headers,
                    mapping,
                    booleanOverrides,
                    timestamp: Date.now(),
                };
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            } catch { /* quota exceeded — silently ignore */ }
        }, 2000); // Debounce 2s
        return () => clearTimeout(timeout);
    }, [rows, headers, mapping, booleanOverrides]);

    // Restore session on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            if (!saved) return;
            const session = JSON.parse(saved);
            // Only restore if less than 24h old
            if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(SESSION_KEY);
                return;
            }
            if (session.rows?.length > 0 && rows.length === 0) {
                setRows(session.rows);
                setHeaders(session.headers || []);
                if (session.mapping) setMapping(session.mapping);
            }
        } catch { /* ignore parse errors */ }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── #28: Confirm before close when there's unsent data ───────────
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            const hasPendingData = rows.some(r => !r._status || r._status === 'pending');
            if (rows.length > 0 && hasPendingData) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [rows]);

    // ─── #74: Global keyboard shortcuts ───────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't trigger in inputs
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'o': // Ctrl+O = Open Excel
                        e.preventDefault();
                        fileInputRef.current?.click();
                        break;
                    case 'g': // Ctrl+G = Group rows
                        e.preventDefault();
                        if (rows.length > 0) handleGroupRows();
                        break;
                    case 'enter': // Ctrl+Enter = Send all
                        e.preventDefault();
                        if (rows.length > 0 && token) handleSendAll();
                        break;
                }
                if (e.shiftKey && e.key.toLowerCase() === 'v') {
                    // Ctrl+Shift+V = Validate
                    e.preventDefault();
                    if (rows.length > 0) handleValidate();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [rows, token]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Shared Excel Async Loader (Paints spinner FIRST before parsing) ───
    const processExcelData = useCallback((file: File, arrayBuffer: ArrayBuffer) => {
        console.log('[ExcelLoader] Processing file:', file.name, file.size, 'bytes');
        // Double setTimeout ensures React repaints the Loading Overlay spinner DOM element first
        setTimeout(() => {
            setTimeout(() => {
                try {
                    console.log('[ExcelLoader] Parsing Excel workbook...');
                    const { sheet, workbook } = parseExcelFile(arrayBuffer);

                    if (sheet.headers.length === 0) {
                        throw new Error('El archivo Excel no tiene cabeceras válidas en la primera fila.');
                    }

                    console.log('[ExcelLoader] Successfully parsed Excel. Setting headers & rows in store...');
                    setHeaders(sheet.headers);
                    setRows(sheet.rows);

                    // Store workbook for multi-sheet
                    useAppStore.getState().setMultiSheet({ workbook });

                    // Open the mapping wizard
                    setMappingWizardOpen(true);
                } catch (err: any) {
                    console.error('[ExcelLoadError]', err);
                    alert(`Error cargando el archivo: ${err.message || err}`);
                } finally {
                    setIsLoadingExcel(false);
                }
            }, 50);
        }, 50);
    }, [setHeaders, setRows]);

    // ─── #6: Drag & Drop Excel file listener ─────────────────────────
    useEffect(() => {
        const handler = (e: Event) => {
            const file = (e as CustomEvent).detail?.file;
            if (!file) return;
            setIsLoadingExcel(true);
            const reader = new FileReader();
            reader.onload = (evt) => {
                const data = evt.target?.result as ArrayBuffer;
                if (data) processExcelData(file, data);
                else setIsLoadingExcel(false);
            };
            reader.onerror = (err) => {
                console.error('[FileReaderError]', err);
                setIsLoadingExcel(false);
                alert('Error al leer el archivo desde el disco.');
            };
            reader.readAsArrayBuffer(file);
        };
        window.addEventListener('excel-drop', handler);
        return () => window.removeEventListener('excel-drop', handler);
    }, [processExcelData]);

    // ─── Excel loading ──────────────────────────────────────────────────
    const handleLoadExcel = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIsLoadingExcel(true);
            const reader = new FileReader();
            reader.onload = (evt) => {
                const data = evt.target?.result as ArrayBuffer;
                if (data) processExcelData(file, data);
                else setIsLoadingExcel(false);
            };
            reader.onerror = (err) => {
                console.error('[FileReaderError]', err);
                setIsLoadingExcel(false);
                alert('Error al leer el archivo desde el disco.');
            };
            reader.readAsArrayBuffer(file);
            e.target.value = '';
        },
        [processExcelData],
    );

    // ─── Group rows ──────────────────────────────────────────────────────
    const handleGroupRows = useCallback(() => {
        const grouped = groupRows(rows, mapping);
        setRows(grouped);
    }, [rows, mapping, setRows]);

    // ─── Validation ─────────────────────────────────────────────────────
    const handleValidate = useCallback(() => {
        const report = generateValidationReport(rows, mapping);
        setValidationReport(report);
        setValidationOpen(true);
    }, [rows, mapping]);

    // ─── Build context ──────────────────────────────────────────────────
    const buildContext = useCallback((): BuildXmlContext => ({
        mapping,
        booleanOverrides,
        token: token || '',
        dynFieldsConfig: {},
        multiSheetEnabled: multiSheet.enabled,
        multiSheetConfig: multiSheet.config,
        getRelatedItems: (row: any, relation: any) => {
            if (!multiSheet.enabled) return [];
            const mainKey = multiSheet.config.mainKey;
            const keyValue = row[mainKey];
            const relatedRows = multiSheet.sheets[relation.sheet] || [];
            return relatedRows.filter((r: any) => String(r[relation.key]) === String(keyValue));
        },
    }), [mapping, booleanOverrides, token, multiSheet]);

    // ─── Send batch ─────────────────────────────────────────────────────
    const sendBatch = useCallback(async (batch: { row: any; index: number }[]) => {
        const isDryRun = useAppStore.getState().isDryRun;
        const total = batch.length;
        setProgressTotal(total);
        setProgressCurrent(0);
        setProgressSuccess(0);
        setProgressError(0);
        setProgressComplete(false);
        setProgressLogs([]);
        setProgressOpen(true);
        setIsSending(true);
        setSendCancelled(false);

        let success = 0;
        let errors = 0;
        const logs: ProgressLog[] = [];
        const ctx = buildContext();

        // ── #40: Ping de salud Pre-envío ─────────────────────────────────────
        if (!isDryRun) {
            try {
                logs.push({ ref: 'UNIGIS', status: 'info', msg: 'Verificando conectividad (Ping de Salud)...' });
                setProgressLogs([...logs]);
                const pingRes = await postSoapProxy({
                    url: orderUrl,
                    action: 'http://unisolutions.com.ar/CrearOrdenesPedido',
                    version: '1.1',
                    body: '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body/></soapenv:Envelope>',
                    timeoutMs: 10000,
                });
                
                if (pingRes.status === 404) {
                    throw new Error('Servidor o URL no existe (HTTP 404)');
                }
                const pingData = await pingRes.json();
                if (!pingData.ok && pingData.status !== 500) {
                     // 500 means SOAP Fault which means the service is actually UP but complaining about empty body. That's a good sign!
                    throw new Error(`Servidor inaccesible: HTTP ${pingData.status}`);
                }
                logs.push({ ref: 'UNIGIS', status: 'success', msg: 'Conexión a servidor exitosa.' });
                setProgressLogs([...logs]);
            } catch(e: any) {
                logs.push({ ref: 'UNIGIS', status: 'error', msg: `Abortado por falta de conectividad: ${e.message}` });
                setProgressError(batch.length);
                setProgressLogs([...logs]);
                setIsSending(false);
                setProgressComplete(true);
                return;
            }
        } else {
             logs.push({ ref: 'SIMULACIÓN', status: 'warn', msg: 'Iniciando Modo Simulación (Dry Run). No se enviarán datos.' });
             setProgressLogs([...logs]);
        }

        const CONCURRENCY_LIMIT = 5;
        let indexInBatch = 0;

        const runWorker = async () => {
            while (indexInBatch < batch.length) {
                if (useAppStore.getState().sendCancelled) {
                    break;
                }

                const currentTaskIndex = indexInBatch++;
                if (currentTaskIndex >= batch.length) break;

                const { row, index } = batch[currentTaskIndex];
                setRowStatus(index, 'sending');
                setProgressCurrent(prev => prev + 1);

                const refCol = mapping['Orden.RefDocumento'];
                const ref = row[refCol] || `Fila ${index + 1}`;

                let lastRawResponse = '';
                let lastXml = ''; // #36: Store XML for failed download
                try {
                    // ── 1. Construir XML ─────────────────────────────────────────
                    const xml = buildXml(row, ctx);
                    lastXml = xml;
                    setProgressLogs(prev => [...prev, { ref, status: 'info', msg: `XML: ${xml.length} chars → ${orderUrl}` }]);

                    // ── 2. Llamada SOAP via Cloud Function con Auto-Retry (o Mock si es Dry Run) ─
                    let res;
                    let fetchError = null;
                    const MAX_RETRIES = 2;

                    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
                        if (useAppStore.getState().sendCancelled) break;
                        try {
                            if (isDryRun) {
                                await new Promise(r => setTimeout(r, 250)); // delay de simulacion
                                res = {
                                    json: async () => ({
                                        ok: true,
                                        status: 200,
                                        text: `<Envelop><Body><CrearOrdenesPedidoResult>${99000000 + index}</CrearOrdenesPedidoResult></Body></Envelop>`
                                    })
                                } as any;
                            } else {
                                res = await postSoapProxy({
                                    url: orderUrl,
                                    action: 'http://unisolutions.com.ar/CrearOrdenesPedido',
                                    version: '1.1',
                                    body: xml,
                                    timeoutMs: 30000,
                                });
                            }
                            
                            // Si recibimos un Bad Gateway, Gateway Timeout o Service Unavailable, provocamos reintento.
                            if (res.status === 502 || res.status === 503 || res.status === 504) {
                                throw new Error(`Error temporal de infraestructura (HTTP ${res.status})`);
                            }
                            
                            fetchError = null;
                            break; // Request exitoso a nivel HTTP
                        } catch (err: any) {
                            fetchError = err;
                            if (retry < MAX_RETRIES && !useAppStore.getState().sendCancelled) {
                                setProgressLogs(prev => [...prev, { ref, status: 'warn', msg: `Fallo de red (${err.message}). Auto-retry ${retry+1}/${MAX_RETRIES} en 2s...` }]);
                                await new Promise(r => setTimeout(r, 2000 * Math.pow(1.5, retry))); // exponential backoff
                            }
                        }
                    }

                    if (useAppStore.getState().sendCancelled) {
                        break;
                    }

                    if (fetchError) {
                        throw new Error(`Fallaron ${MAX_RETRIES + 1} intentos: ${fetchError.message}`);
                    }

                    const response = await res.json();
                    lastRawResponse = response.text || '';

                    setProgressLogs(prev => [...prev, { ref, status: 'info', msg: `HTTP ${response.status} · ${lastRawResponse.length} bytes` }]);

                    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

                    // ── 3. Parsear respuesta XML ─────────────────────────────────
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(lastRawResponse, 'text/xml');

                    // 3 intentos para encontrar el nodo resultado (con/sin namespace)
                    const resultNode =
                        doc.getElementsByTagName('CrearOrdenesPedidoResult')[0] ||
                        doc.getElementsByTagName('unis:CrearOrdenesPedidoResult')[0] ||
                        doc.getElementsByTagName('Result')[0];

                    const resultText  = resultNode ? (resultNode.textContent ?? '') : '';
                    const isIntSuccess = /^\d+$/.test(resultText) && parseInt(resultText) > 0;
                    const isBoolSuccess = resultText.toLowerCase() === 'true';

                    const nodeInfo = resultNode
                        ? `Nodo: ${resultNode.nodeName} = "${resultText}"`
                        : 'Nodo resultado no encontrado → fallback texto';
                    setProgressLogs(prev => [...prev, { ref, status: 'info', msg: nodeInfo }]);

                    let isValid = response.ok;

                    if (resultNode) {
                        isValid = isIntSuccess || isBoolSuccess;
                    } else {
                        isValid = isValid &&
                            !lastRawResponse.includes('false') &&
                            !lastRawResponse.includes('Error') &&
                            !lastRawResponse.includes('Exception') &&
                            !lastRawResponse.includes('Fallo');
                    }

                    // ── 4. Éxito / Error ─────────────────────────────────────────
                    if (isValid) {
                        setRowStatus(index, 'success', undefined, lastRawResponse);
                        updateRowData(index, '_UnigisId', resultText); // #78: Capture UNIGIS ID natively into row!
                        setProgressLogs(prev => [...prev, { ref, status: 'success', msg: `Creado (ID: ${resultText || 'OK'})` }]);
                        setProgressSuccess(prev => prev + 1);
                    } else {
                        let msg = '';

                        if (resultNode && !isValid) {
                            msg = UNIGIS_ERROR_CODES[resultText]
                                ? `${resultText}: ${UNIGIS_ERROR_CODES[resultText]}`
                                : `Fallo lógico: respuesta "${resultText}"`;
                        }

                        if (!msg && lastRawResponse) {
                            const errorPatterns = [
                                /<soap:Reason[^>]*>([\s\S]*?)<\/soap:Reason>/i,
                                /<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i,
                                /<unis:Descripcion[^>]*>([\s\S]*?)<\/unis:Descripcion>/i,
                                /<unis:Description[^>]*>([\s\S]*?)<\/unis:Description>/i,
                                /<unis:Mensaje[^>]*>([\s\S]*?)<\/unis:Mensaje>/i,
                                /<unis:Error[^>]*>([\s\S]*?)<\/unis:Error>/i,
                                /Mensaje>([\s\S]*?)<\//i,
                                /Error>([\s\S]*?)<\//i,
                            ];
                            for (const pattern of errorPatterns) {
                                const match = lastRawResponse.match(pattern);
                                if (match) { msg = match[1].trim(); break; }
                            }
                        }

                        if (!msg) msg = '(Error desconocido)';
                        throw new Error(msg);
                    }
                } catch (err: any) {
                    setRowStatus(index, 'error', err.message, lastRawResponse);
                    if (err._errorCode) updateRowData(index, '_errorCode', err._errorCode);
                    setProgressLogs(prev => [...prev, {
                        ref,
                        status: 'error',
                        msg: err.message,
                        detail: lastRawResponse ? lastRawResponse.slice(0, 2000) : undefined,
                        xml: lastXml || undefined, // #36: Attach XML for download
                    }]);
                    setProgressError(prev => prev + 1);
                }
            }
        };

        // Iniciar los trabajadores concurrentes
        const workers = [];
        const limit = Math.min(CONCURRENCY_LIMIT, batch.length);
        for (let w = 0; w < limit; w++) {
            workers.push(runWorker());
        }
        await Promise.all(workers);

        if (useAppStore.getState().sendCancelled) {
            setProgressLogs(prev => [...prev, { ref: 'CANCELADO', status: 'warn', msg: 'Envío cancelado por el usuario' }]);
        }

        setProgressComplete(true);
        setIsSending(false);
    }, [mapping, orderUrl, buildContext, setRowStatus, updateRowData, setIsSending, setSendCancelled]);

    // ─── Send all / selected / retry ───────────────────────────────────
    const handleSendAll = useCallback(() => {
        const batch = rows.map((row, index) => ({ row, index }));
        sendBatch(batch);
    }, [rows, sendBatch]);

    const handleSendSelected = useCallback(() => {
        const batch = Array.from(selectedIndices).map((index: number) => ({ row: rows[index], index }));
        sendBatch(batch);
    }, [rows, selectedIndices, sendBatch]);

    const handleRetryFailed = useCallback(() => {
        const batch = rows
            .map((row, index) => ({ row, index }))
            .filter(({ row }: { row: any }) => row._status === 'error');
        sendBatch(batch);
    }, [rows, sendBatch]);

    // ─── Retry individual row (from dashboard) ────────────────────────
    const handleRetryRow = useCallback((index: number) => {
        const row = rows[index];
        if (!row) return;
        setDashboardOpen(false);
        sendBatch([{ row, index }]);
    }, [rows, sendBatch]);

    const handleCancelSend = useCallback(() => {
        setSendCancelled(true);
    }, [setSendCancelled]);

    // ─── Resizable layout state ──────────────────────────────────────
    const [leftWidth, setLeftWidth] = useState(75); // % of horizontal space
    const [detailHeight, setDetailHeight] = useState(35); // % of left panel for DetailPanel
    const [mapperHeight, setMapperHeight] = useState(260); // px for bottom mapper
    const dragging = useRef<'h' | 'v' | 'm' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((axis: 'h' | 'v' | 'm') => {
        dragging.current = axis;
        document.body.style.cursor = axis === 'h' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
    }, []);

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            if (dragging.current === 'h') {
                const pct = ((e.clientX - rect.left) / rect.width) * 100;
                setLeftWidth(Math.min(85, Math.max(25, pct)));
            } else if (dragging.current === 'v') {
                // relative to the left panel
                const headerH = 44; // header height px
                const leftPanelTop = headerH + 8; // p-2
                const leftPanelBottom = rect.bottom - mapperHeight - 16;
                const leftPanelH = leftPanelBottom - leftPanelTop;
                const relY = e.clientY - leftPanelTop;
                const masterPct = (relY / leftPanelH) * 100;
                setDetailHeight(Math.min(70, Math.max(10, 100 - masterPct)));
            } else if (dragging.current === 'm') {
                const fromBottom = rect.bottom - e.clientY;
                setMapperHeight(Math.min(500, Math.max(120, fromBottom)));
            }
        };
        const handleMouseUp = () => {
            dragging.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [mapperHeight]);

    return (
        <div ref={containerRef} className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />

            {/* Loading Overlay */}
            {isLoadingExcel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-slate-700">Procesando Excel...</span>
                        <span className="text-[10px] text-slate-400">Leyendo cabeceras y filas</span>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <Header
                onShowLogin={() => setLoginOpen(true)}
                onLoadExcel={handleLoadExcel}
                onGroupRows={handleGroupRows}
                onMassEdit={() => setMassEditOpen(true)}
                onValidate={handleValidate}
                onSendAll={handleSendAll}
                onSendSelected={handleSendSelected}
                onRetryFailed={handleRetryFailed}
                onLogout={() => useAppStore.getState().setToken(null)}
                onManageUsers={() => { }}
                onShowHelp={() => setHelpOpen(true)}
                onSaveTemplate={() => { setLayoutExporterMode('export'); setLayoutExporterOpen(true); }}
                onShowDashboard={() => setDashboardOpen(true)}
                isLoadingExcel={isLoadingExcel}
            />

            {/* MAIN CONTENT — Resizable horizontal split */}
            <div className="flex flex-1 overflow-hidden p-2 gap-0" style={{ paddingBottom: 0 }}>
                {/* Panel izquierdo: DataPanel */}
                <div className="flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden" style={{ width: `${leftWidth}%` }}>
                    <div className="flex justify-between items-center px-2 py-1 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-xs font-semibold text-slate-700">📦 Pedidos</span>
                        <div className="flex gap-1 items-center">
                            <button className="p-0.5 hover:bg-sky-100 rounded transition-colors text-sky-600 text-xs" onClick={() => setDataPrepOpen(true)} title="Preparar Datos (Transformar/Calcular)">🛠️</button>
                            <button className="p-0.5 hover:bg-slate-200 rounded transition-colors text-xs" onClick={() => setDynWizardOpen(true)} title="Campos Dinámicos">🔧</button>
                            <button className="p-0.5 hover:bg-slate-200 rounded transition-colors text-xs" onClick={() => setMultiSheetWizOpen(true)} title="Multi-Hoja">📊</button>
                            <button className="p-0.5 hover:bg-slate-200 rounded transition-colors text-xs" onClick={() => setMappingActionsOpen(true)} title="Acciones de Mapeo">🗺️</button>
                            <button className="p-0.5 hover:bg-emerald-100 rounded transition-colors text-emerald-600 text-xs" onClick={() => { setLayoutExporterMode('export'); setLayoutExporterOpen(true); }} title="Exportar / Importar Layout Excel">📋</button>
                            <button
                                className="p-0.5 hover:bg-red-100 rounded transition-colors text-red-500 text-xs"
                                onClick={() => { if (confirm('¿Limpiar todo el mapeo actual?')) setMapping({}); }}
                                title="Limpiar Mapeo"
                            >🧹</button>
                            {/* No existía ninguna forma de vaciar el Excel/mapeo cargado para empezar de
                                cero — "Limpiar Mapeo" solo borra el mapeo, no las filas, y recargar la
                                página restaura la sesión guardada (localStorage) tal cual estaba. */}
                            <button
                                className="p-0.5 hover:bg-red-100 rounded transition-colors text-red-600 text-xs"
                                onClick={() => {
                                    if (!confirm(`¿Vaciar todo (${rows.length} filas + mapeo) para empezar un mapeo nuevo? No se puede deshacer. La sesión conectada a UNIGIS no se cierra.`)) return;
                                    useAppStore.getState().clearAllData();
                                    localStorage.removeItem(SESSION_KEY);
                                }}
                                title="Nuevo Excel (vaciar todo)"
                            >🗑️</button>
                            <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded-full">{rows.length} filas</span>
                        </div>
                    </div>
                    {/* MasterTable — fills remaining space above detail */}
                    <div className="overflow-auto min-h-0" style={{ flex: `1 1 ${100 - detailHeight}%` }}><MasterTable /></div>
                    {/* Vertical drag handle (table ↔ detail) */}
                    <div
                        className="h-1.5 cursor-row-resize bg-slate-200 hover:bg-indigo-400 active:bg-indigo-500 transition-colors shrink-0 flex items-center justify-center"
                        onMouseDown={() => handleMouseDown('v')}
                    >
                        <div className="w-8 h-0.5 bg-slate-400 rounded-full" />
                    </div>
                    {/* DetailPanel */}
                    <div className="overflow-auto min-h-0" style={{ flex: `0 0 ${detailHeight}%` }}><DetailPanel /></div>
                </div>

                {/* Horizontal drag handle (left ↔ right) */}
                <div
                    className="w-2 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-500 transition-colors shrink-0 flex items-center justify-center mx-1 rounded-full"
                    onMouseDown={() => handleMouseDown('h')}
                >
                    <div className="h-12 w-0.5 bg-slate-300 rounded-full" />
                </div>

                {/* Panel derecho: XML Preview */}
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-w-0">
                    <XmlPreview />
                </div>
            </div>

            {/* Bottom mapper drag handle */}
            <div
                className="h-1.5 cursor-row-resize bg-slate-200 hover:bg-indigo-400 active:bg-indigo-500 transition-colors shrink-0 flex items-center justify-center"
                onMouseDown={() => handleMouseDown('m')}
            >
                <div className="w-10 h-0.5 bg-slate-400 rounded-full" />
            </div>

            {/* Mapper Panel — resizable height */}
            <div className="border-t border-slate-200 bg-white overflow-hidden shrink-0" style={{ height: mapperHeight }}>
                <MapperPanel />
            </div>

            {/* Modals & Wizards */}
            <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
            <ProgressModal
                isOpen={progressOpen}
                total={progressTotal}
                current={progressCurrent}
                successCount={progressSuccess}
                errorCount={progressError}
                isComplete={progressComplete}
                logs={progressLogs}
                onCancel={handleCancelSend}
                onClose={() => setProgressOpen(false)}
            />
            <ValidationReportModal
                isOpen={validationOpen}
                report={validationReport}
                onClose={() => setValidationOpen(false)}
            />
            <MassEditModal isOpen={massEditOpen} onClose={() => setMassEditOpen(false)} />
            <DataPrepModal isOpen={dataPrepOpen} onClose={() => setDataPrepOpen(false)} />
            <DynamicFieldsWizard isOpen={dynWizardOpen} onClose={() => setDynWizardOpen(false)} />
            <MultiSheetWizard isOpen={multiSheetWizOpen} onClose={() => setMultiSheetWizOpen(false)} />
            <MappingWizard
                isOpen={mappingWizardOpen}
                headers={headers}
                onComplete={(newMapping, newBoolOverrides) => {
                    setMapping(newMapping);
                    useAppStore.setState({ booleanOverrides: newBoolOverrides });
                    setMappingWizardOpen(false);
                }}
                onClose={() => setMappingWizardOpen(false)}
                tenantId={tenantId}
            />
            <MappingActions isOpen={mappingActionsOpen} onClose={() => setMappingActionsOpen(false)} onOpenWizard={() => setMappingWizardOpen(true)} />
            <LayoutExporter isOpen={layoutExporterOpen} onClose={() => setLayoutExporterOpen(false)} initialMode={layoutExporterMode} />
            <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
            <ResultsDashboard
                isOpen={dashboardOpen}
                onClose={() => setDashboardOpen(false)}
                onRetryRow={handleRetryRow}
                onRetryAll={() => { setDashboardOpen(false); handleRetryFailed(); }}
            />
        </div>
    );
}

export default function UnigisOrderCreatorPage() {
    const { tenantId, loading } = useAuth();

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando módulo...</div>;
    }

    if (tenantId !== '3') {
        return (
            <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 text-center max-w-lg">
                    <div className="text-4xl mb-4">🚫</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
                    <p className="text-slate-600">Este módulo se encuentra actualmente limitado en exclusiva para el Tenant 3 (Europastry).</p>
                </div>
            </div>
        );
    }

    return (
        <ToastProvider>
            <UnigisOrderCreatorPageInner tenantId={tenantId as string} />
        </ToastProvider>
    );
}
