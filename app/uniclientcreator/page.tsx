'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppStore } from '@/app/uniclientcreator/_src/store/appStore';
import { parseExcelFile } from '@/app/uniclientcreator/_src/utils/excelParser';
import { generateValidationReport, type ValidationReport } from '@/app/uniclientcreator/_src/utils/validation';
import { buildXml, type BuildXmlContext } from '@/app/uniclientcreator/_src/services/xmlBuilder';
import { type ProgressLog } from '@/app/uniclientcreator/_src/components/Modals/ProgressModal';
import { postSoapProxy } from '@/lib/soapProxy';

import Header from '@/app/uniclientcreator/_src/components/Header/Header';
import MasterTable from '@/app/uniclientcreator/_src/components/DataPanel/MasterTable';
import DetailPanel from '@/app/uniclientcreator/_src/components/DataPanel/DetailPanel';
import XmlPreview from '@/app/uniclientcreator/_src/components/XmlPreview/XmlPreview';
import MapperPanel from '@/app/uniclientcreator/_src/components/Mapper/MapperPanel';
import LoginModal from '@/app/uniclientcreator/_src/components/Modals/LoginModal';
import ProgressModal from '@/app/uniclientcreator/_src/components/Modals/ProgressModal';
import ValidationReportModal from '@/app/uniclientcreator/_src/components/Modals/ValidationReportModal';
import MassEditModal from '@/app/uniclientcreator/_src/components/Modals/MassEditModal';
import DynamicFieldsWizard from '@/app/uniclientcreator/_src/components/Wizards/DynamicFieldsWizard';
import MappingWizard from '@/app/uniclientcreator/_src/components/Wizards/MappingWizard';
import MappingActions from '@/app/uniclientcreator/_src/components/Mapper/MappingActions';
import LayoutExporter from '@/app/uniclientcreator/_src/components/Mapper/LayoutExporter';
import DataPrepModal from '@/app/uniclientcreator/_src/components/Modals/DataPrepModal';
import HelpModal from '@/app/uniclientcreator/_src/components/Modals/HelpModal';
import ResultsDashboard from '@/app/uniclientcreator/_src/components/Dashboard/ResultsDashboard';
import { ToastProvider } from '@/app/uniclientcreator/_src/components/UI/ToastProvider';

import '@/app/uniclientcreator/_src/i18n';
import '@/app/uniclientcreator/_src/App.css';

const SESSION_KEY = 'ucc_session';
const SOAP_ACTION = 'http://unisolutions.com.ar/CrearClientesOrden';

function UniClientCreatorPageInner({ tenantId }: { tenantId: string }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoadingExcel, setIsLoadingExcel] = useState(false);

    const [loginOpen, setLoginOpen] = useState(true);
    const [progressOpen, setProgressOpen] = useState(false);
    const [validationOpen, setValidationOpen] = useState(false);
    const [massEditOpen, setMassEditOpen] = useState(false);
    const [dynWizardOpen, setDynWizardOpen] = useState(false);
    const [mappingWizardOpen, setMappingWizardOpen] = useState(false);
    const [mappingActionsOpen, setMappingActionsOpen] = useState(false);
    const [layoutExporterOpen, setLayoutExporterOpen] = useState(false);
    const [layoutExporterMode, setLayoutExporterMode] = useState<'export' | 'import'>('export');
    const [dataPrepOpen, setDataPrepOpen] = useState(false);
    const [dashboardOpen, setDashboardOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

    const [progressTotal, setProgressTotal] = useState(0);
    const [progressCurrent, setProgressCurrent] = useState(0);
    const [progressSuccess, setProgressSuccess] = useState(0);
    const [progressError, setProgressError] = useState(0);
    const [progressComplete, setProgressComplete] = useState(false);
    const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
    const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

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

    useEffect(() => {
        if (rows.length === 0 && Object.keys(mapping).length === 0) return;
        const timeout = setTimeout(() => {
            try {
                localStorage.setItem(SESSION_KEY, JSON.stringify({ rows: rows.slice(0, 500), headers, mapping, booleanOverrides, timestamp: Date.now() }));
            } catch { /* quota */ }
        }, 2000);
        return () => clearTimeout(timeout);
    }, [rows, headers, mapping, booleanOverrides]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            if (!saved) return;
            const session = JSON.parse(saved);
            if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) { localStorage.removeItem(SESSION_KEY); return; }
            if (session.rows?.length > 0 && rows.length === 0) {
                setRows(session.rows); setHeaders(session.headers || []);
                if (session.mapping) setMapping(session.mapping);
            }
        } catch { /* ignore */ }
    }, []); // eslint-disable-line

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (rows.length > 0 && rows.some(r => !r._status || r._status === 'pending')) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [rows]);

    const handleLoadExcel = useCallback(() => { fileInputRef.current?.click(); }, []);

    // ─── Shared Excel Async Loader (Paints spinner FIRST before parsing) ───
    // Ported from uniordercreator (857d6392): a single requestAnimationFrame
    // doesn't guarantee the browser has actually painted the loading overlay
    // before the synchronous (CPU-heavy) parse starts, so the UI appeared
    // frozen/stuck on large files. Double setTimeout forces a real repaint first.
    const processExcelData = useCallback((arrayBuffer: ArrayBuffer) => {
        setTimeout(() => {
            setTimeout(() => {
                try {
                    const { sheet } = parseExcelFile(arrayBuffer);
                    if (sheet.headers.length === 0) throw new Error('El archivo Excel no tiene cabeceras válidas.');
                    setHeaders(sheet.headers);
                    setRows(sheet.rows);
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

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoadingExcel(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = evt.target?.result as ArrayBuffer;
            if (data) processExcelData(data);
            else setIsLoadingExcel(false);
        };
        reader.onerror = (err) => {
            console.error('[FileReaderError]', err);
            setIsLoadingExcel(false);
            alert('Error al leer el archivo desde el disco.');
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    }, [processExcelData]);

    const handleValidate = useCallback(() => {
        const report = generateValidationReport(rows, mapping);
        setValidationReport(report);
        setValidationOpen(true);
    }, [rows, mapping]);

    const buildContext = useCallback((): BuildXmlContext => ({
        mapping, booleanOverrides, token: token || '', dynFieldsConfig: {},
    }), [mapping, booleanOverrides, token]);

    const sendBatch = useCallback(async (batch: { row: any; index: number }[]) => {
        const isDryRun = useAppStore.getState().isDryRun;
        setProgressTotal(batch.length); setProgressCurrent(0);
        setProgressSuccess(0); setProgressError(0);
        setProgressComplete(false); setProgressLogs([]); setProgressOpen(true);
        setIsSending(true); setSendCancelled(false);

        let success = 0, errors = 0;
        const logs: ProgressLog[] = [];
        const ctx = buildContext();

        if (!isDryRun) {
            try {
                logs.push({ ref: 'UNIGIS', status: 'info', msg: 'Verificando conectividad...' });
                setProgressLogs([...logs]);
                const pingRes = await postSoapProxy({ url: orderUrl, action: SOAP_ACTION, version: '1.1', body: '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body/></soapenv:Envelope>', timeoutMs: 10000 });
                if (pingRes.status === 404) throw new Error('Servidor no encontrado (HTTP 404)');
                const pingData = await pingRes.json();
                if (!pingData.ok && pingData.status !== 500) throw new Error(`Servidor inaccesible: HTTP ${pingData.status}`);
                logs.push({ ref: 'UNIGIS', status: 'success', msg: 'Conexión exitosa.' });
                setProgressLogs([...logs]);
            } catch (e: any) {
                logs.push({ ref: 'UNIGIS', status: 'error', msg: `Abortado: ${e.message}` });
                setProgressError(batch.length); setProgressLogs([...logs]);
                setIsSending(false); setProgressComplete(true); return;
            }
        } else {
            logs.push({ ref: 'SIMULACIÓN', status: 'warn', msg: 'Modo Dry Run activo. No se enviarán datos reales.' });
            setProgressLogs([...logs]);
        }

        for (let i = 0; i < batch.length; i++) {
            if (useAppStore.getState().sendCancelled) {
                logs.push({ ref: 'CANCELADO', status: 'warn', msg: 'Envío cancelado por el usuario' });
                setProgressLogs([...logs]); break;
            }
            const { row, index } = batch[i];
            setRowStatus(index, 'sending'); setProgressCurrent(i + 1);
            const refCol = mapping['Root.Cliente.RefCliente'];
            const ref = row[refCol] || `Fila ${index + 1}`;
            let lastRawResponse = '', lastXml = '';
            try {
                const xml = buildXml(row, ctx);
                lastXml = xml;
                logs.push({ ref, status: 'info', msg: `XML: ${xml.length} chars → ${orderUrl}` });
                setProgressLogs([...logs]);

                let res: any; let fetchError = null;
                for (let retry = 0; retry <= 2; retry++) {
                    try {
                        if (isDryRun) {
                            await new Promise(r => setTimeout(r, 200));
                            res = { json: async () => ({ ok: true, status: 200, text: `<Envelope><Body><CrearClientesOrdenResult>true</CrearClientesOrdenResult></Body></Envelope>` }) };
                        } else {
                            res = await postSoapProxy({ url: orderUrl, action: SOAP_ACTION, version: '1.1', body: xml, timeoutMs: 30000 });
                        }
                        if ([502, 503, 504].includes(res.status)) throw new Error(`Error temporal HTTP ${res.status}`);
                        fetchError = null; break;
                    } catch (err: any) {
                        fetchError = err;
                        if (retry < 2) {
                            logs.push({ ref, status: 'warn', msg: `Reintento ${retry + 1}/2...` });
                            setProgressLogs([...logs]);
                            await new Promise(r => setTimeout(r, 2000 * Math.pow(1.5, retry)));
                        }
                    }
                }
                if (fetchError) throw new Error(`Fallaron 3 intentos: ${fetchError.message}`);

                const response = await res.json();
                lastRawResponse = response.text || '';
                logs.push({ ref, status: 'info', msg: `HTTP ${response.status} · ${lastRawResponse.length} bytes` });
                setProgressLogs([...logs]);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const parser = new DOMParser();
                const doc = parser.parseFromString(lastRawResponse, 'text/xml');

                // ── #1: SOAP Fault check FIRST ──────────────────────────────
                // A <soap:Fault> has no CrearClientesOrdenResult tag at all, so it
                // used to fall into the "no resultNode → assume success" branch
                // below whenever UNIGIS answered HTTP 200 with a fault body (common
                // for this ASMX endpoint) — silently reporting success for a
                // client that was NEVER created. Detect it explicitly, unconditionally.
                const faultNode =
                    doc.getElementsByTagName('soap:Fault')[0] ||
                    doc.getElementsByTagName('SOAP-ENV:Fault')[0] ||
                    doc.getElementsByTagName('Fault')[0];
                if (faultNode) {
                    const faultString = doc.getElementsByTagName('faultstring')[0]?.textContent
                        || doc.getElementsByTagName('faultcode')[0]?.textContent
                        || 'SOAP Fault sin descripción';
                    throw new Error(`Fault UNIGIS: ${faultString}`);
                }

                const resultNode =
                    doc.getElementsByTagName('CrearClientesOrdenResult')[0] ||
                    doc.getElementsByTagName('unis:CrearClientesOrdenResult')[0] ||
                    doc.getElementsByTagName('Result')[0];
                const resultText = resultNode ? (resultNode.textContent ?? '') : '';
                const isSuccess = resultText.toLowerCase() === 'true' || (parseInt(resultText) > 0);

                // ── #2: fail-closed when the expected result tag is missing ──
                // Previously this fell back to "assume success unless the raw
                // text contains the literal (case-sensitive) words 'false' or
                // 'Error'" — too permissive, and the real cause of clients
                // silently not being created while the UI reported OK.
                if (isSuccess) {
                    success++;
                    setRowStatus(index, 'success', undefined, lastRawResponse);
                    updateRowData(index, '_UnigisId', resultText || 'OK');
                    logs.push({ ref, status: 'success', msg: `Cliente creado (${resultText || 'OK'})`, detail: lastRawResponse.slice(0, 2000) });
                } else {
                    const errorPatterns = [
                        /faultstring[^>]*>([^<]*)/i, /Descripcion[^>]*>([^<]*)/i,
                        /Mensaje[^>]*>([^<]*)/i, /Error[^>]*>([^<]*)/i,
                    ];
                    let msg = '';
                    for (const p of errorPatterns) { const m = lastRawResponse.match(p); if (m) { msg = m[1].trim(); break; } }
                    if (!msg && !resultNode) msg = `No se encontró CrearClientesOrdenResult en la respuesta (¿tag/namespace inesperado?)`;
                    throw new Error(msg || `Respuesta inesperada: "${resultText}"`);
                }
            } catch (err: any) {
                errors++;
                setRowStatus(index, 'error', err.message, lastRawResponse);
                logs.push({ ref, status: 'error', msg: err.message, detail: lastRawResponse?.slice(0, 2000) || undefined, xml: lastXml || undefined });
            }
            setProgressSuccess(success); setProgressError(errors); setProgressLogs([...logs]);
        }
        setProgressComplete(true); setIsSending(false);
    }, [mapping, orderUrl, buildContext, setRowStatus, updateRowData, setIsSending, setSendCancelled]);

    const handleSendAll = useCallback(() => sendBatch(rows.map((row, index) => ({ row, index }))), [rows, sendBatch]);
    const handleSendSelected = useCallback(() => sendBatch(Array.from(selectedIndices).map(index => ({ row: rows[index], index }))), [rows, selectedIndices, sendBatch]);
    const handleRetryFailed = useCallback(() => sendBatch(rows.map((row, index) => ({ row, index })).filter(({ row }) => row._status === 'error')), [rows, sendBatch]);
    const handleRetryRow = useCallback((index: number) => { const row = rows[index]; if (!row) return; setDashboardOpen(false); sendBatch([{ row, index }]); }, [rows, sendBatch]);
    const handleCancelSend = useCallback(() => setSendCancelled(true), [setSendCancelled]);

    const [leftWidth, setLeftWidth] = useState(75);
    const [detailHeight, setDetailHeight] = useState(35);
    const [mapperHeight, setMapperHeight] = useState(260);
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
                setLeftWidth(Math.min(85, Math.max(25, ((e.clientX - rect.left) / rect.width) * 100)));
            } else if (dragging.current === 'v') {
                const leftPanelH = rect.bottom - 44 - 8 - mapperHeight - 16;
                const relY = e.clientY - 52;
                setDetailHeight(Math.min(70, Math.max(10, 100 - (relY / leftPanelH) * 100)));
            } else if (dragging.current === 'm') {
                setMapperHeight(Math.min(500, Math.max(120, rect.bottom - e.clientY)));
            }
        };
        const handleMouseUp = () => { dragging.current = null; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [mapperHeight]);

    return (
        <div ref={containerRef} className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
            {isLoadingExcel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-slate-700">Procesando Excel...</span>
                    </div>
                </div>
            )}
            <Header
                onShowLogin={() => setLoginOpen(true)}
                onLoadExcel={handleLoadExcel}

                onMassEdit={() => setMassEditOpen(true)}
                onValidate={handleValidate}
                onSendAll={handleSendAll}
                onSendSelected={handleSendSelected}
                onRetryFailed={handleRetryFailed}
                onLogout={() => useAppStore.getState().setToken(null)}
                onManageUsers={() => {}}
                onShowHelp={() => setHelpOpen(true)}
                onSaveTemplate={() => { setLayoutExporterMode('export'); setLayoutExporterOpen(true); }}
                onShowDashboard={() => setDashboardOpen(true)}
                isLoadingExcel={isLoadingExcel}
            />
            <div className="flex flex-1 overflow-hidden p-2 gap-0" style={{ paddingBottom: 0 }}>
                <div className="flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden" style={{ width: `${leftWidth}%` }}>
                    <div className="flex justify-between items-center px-2 py-1 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-xs font-semibold text-slate-700">👤 Clientes</span>
                        <div className="flex gap-1 items-center">
                            <button className="p-0.5 hover:bg-sky-100 rounded transition-colors text-sky-600 text-xs" onClick={() => setDataPrepOpen(true)} title="Preparar Datos">🛠️</button>
                            <button className="p-0.5 hover:bg-slate-200 rounded transition-colors text-xs" onClick={() => setDynWizardOpen(true)} title="Campos Dinámicos">🔧</button>
                            <button className="p-0.5 hover:bg-slate-200 rounded transition-colors text-xs" onClick={() => setMappingActionsOpen(true)} title="Acciones de Mapeo">🗺️</button>
                            <button className="p-0.5 hover:bg-emerald-100 rounded transition-colors text-emerald-600 text-xs" onClick={() => { setLayoutExporterMode('export'); setLayoutExporterOpen(true); }} title="Exportar / Importar Layout">📋</button>
                            <button className="p-0.5 hover:bg-red-100 rounded transition-colors text-red-500 text-xs" onClick={() => { if (confirm('¿Limpiar todo el mapeo actual?')) setMapping({}); }} title="Limpiar Mapeo">🧹</button>
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
                    <div className="overflow-auto min-h-0" style={{ flex: `1 1 ${100 - detailHeight}%` }}><MasterTable /></div>
                    <div className="h-1.5 cursor-row-resize bg-slate-200 hover:bg-indigo-400 active:bg-indigo-500 transition-colors shrink-0 flex items-center justify-center" onMouseDown={() => handleMouseDown('v')}>
                        <div className="w-8 h-0.5 bg-slate-400 rounded-full" />
                    </div>
                    <div className="overflow-auto min-h-0" style={{ flex: `0 0 ${detailHeight}%` }}><DetailPanel /></div>
                </div>
                <div className="w-2 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-500 transition-colors shrink-0 flex items-center justify-center mx-1 rounded-full" onMouseDown={() => handleMouseDown('h')}>
                    <div className="h-12 w-0.5 bg-slate-300 rounded-full" />
                </div>
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-w-0">
                    <XmlPreview />
                </div>
            </div>
            <div className="h-1.5 cursor-row-resize bg-slate-200 hover:bg-indigo-400 active:bg-indigo-500 transition-colors shrink-0 flex items-center justify-center" onMouseDown={() => handleMouseDown('m')}>
                <div className="w-10 h-0.5 bg-slate-400 rounded-full" />
            </div>
            <div className="border-t border-slate-200 bg-white overflow-hidden shrink-0" style={{ height: mapperHeight }}>
                <MapperPanel />
            </div>

            <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
            <ProgressModal isOpen={progressOpen} total={progressTotal} current={progressCurrent} successCount={progressSuccess} errorCount={progressError} isComplete={progressComplete} logs={progressLogs} onCancel={handleCancelSend} onClose={() => setProgressOpen(false)} />
            <ValidationReportModal isOpen={validationOpen} report={validationReport} onClose={() => setValidationOpen(false)} />
            <MassEditModal isOpen={massEditOpen} onClose={() => setMassEditOpen(false)} />
            <DataPrepModal isOpen={dataPrepOpen} onClose={() => setDataPrepOpen(false)} />
            <DynamicFieldsWizard isOpen={dynWizardOpen} onClose={() => setDynWizardOpen(false)} />
            <MappingWizard isOpen={mappingWizardOpen} headers={headers} onComplete={(newMapping, newBoolOverrides) => { setMapping(newMapping); useAppStore.setState({ booleanOverrides: newBoolOverrides }); setMappingWizardOpen(false); }} onClose={() => setMappingWizardOpen(false)} tenantId={tenantId} />
            <MappingActions isOpen={mappingActionsOpen} onClose={() => setMappingActionsOpen(false)} onOpenWizard={() => setMappingWizardOpen(true)} />
            <LayoutExporter isOpen={layoutExporterOpen} onClose={() => setLayoutExporterOpen(false)} initialMode={layoutExporterMode} />
            <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
            <ResultsDashboard isOpen={dashboardOpen} onClose={() => setDashboardOpen(false)} onRetryRow={handleRetryRow} onRetryAll={() => { setDashboardOpen(false); handleRetryFailed(); }} />
        </div>
    );
}

export default function UniClientCreatorPage() {
    const { tenantId, loading } = useAuth();
    if (loading) return <div className="p-8 text-center text-slate-500">Cargando módulo...</div>;
    return (
        <ToastProvider>
            <UniClientCreatorPageInner tenantId={tenantId as string} />
        </ToastProvider>
    );
}
