'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppStore } from '@/app/univehiclecreator/_src/store/appStore';
import { parseExcelFile } from '@/app/univehiclecreator/_src/utils/excelParser';
import { levenshtein } from '@/app/univehiclecreator/_src/utils/levenshtein';
import { getAllFields, REQUIRED_FIELDS } from '@/app/univehiclecreator/_src/data/schema';
import { generateValidationReport, type ValidationReport } from '@/app/univehiclecreator/_src/utils/validation';
import { buildXml, type BuildXmlContext } from '@/app/univehiclecreator/_src/services/xmlBuilder';
import { type ProgressLog } from '@/app/univehiclecreator/_src/components/Modals/ProgressModal';
import { postSoapProxy } from '@/lib/soapProxy';

import Header from '@/app/univehiclecreator/_src/components/Header/Header';
import MasterTable from '@/app/univehiclecreator/_src/components/DataPanel/MasterTable';
import DetailPanel from '@/app/univehiclecreator/_src/components/DataPanel/DetailPanel';
import XmlPreview from '@/app/univehiclecreator/_src/components/XmlPreview/XmlPreview';
import MapperPanel from '@/app/univehiclecreator/_src/components/Mapper/MapperPanel';
import LoginModal from '@/app/univehiclecreator/_src/components/Modals/LoginModal';
import ProgressModal from '@/app/univehiclecreator/_src/components/Modals/ProgressModal';
import ValidationReportModal from '@/app/univehiclecreator/_src/components/Modals/ValidationReportModal';
import MassEditModal from '@/app/univehiclecreator/_src/components/Modals/MassEditModal';
import DynamicFieldsWizard from '@/app/univehiclecreator/_src/components/Wizards/DynamicFieldsWizard';
import MappingActions from '@/app/univehiclecreator/_src/components/Mapper/MappingActions';
import SavedMappings from '@/app/univehiclecreator/_src/components/Mapper/SavedMappings';

import '@/app/univehiclecreator/_src/i18n';
import '@/app/univehiclecreator/_src/App.css';

const SOAP_ACTION = 'http://unisolutions.com.ar/CrearVehiculos';

function UnigisVehicleCreatorPageInner() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoadingExcel, setIsLoadingExcel] = useState(false);

    // Modals / Wizards state
    const [loginOpen, setLoginOpen] = useState(true);
    const [progressOpen, setProgressOpen] = useState(false);
    const [validationOpen, setValidationOpen] = useState(false);
    const [massEditOpen, setMassEditOpen] = useState(false);
    const [dynWizardOpen, setDynWizardOpen] = useState(false);
    const [mappingActionsOpen, setMappingActionsOpen] = useState(false);
    const [savedMappingsOpen, setSavedMappingsOpen] = useState(false);

    // Progress state
    const [progressTotal, setProgressTotal] = useState(0);
    const [progressCurrent, setProgressCurrent] = useState(0);
    const [progressSuccess, setProgressSuccess] = useState(0);
    const [progressError, setProgressError] = useState(0);
    const [progressComplete, setProgressComplete] = useState(false);
    const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);

    // Validation
    const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

    // Store
    const setRows = useAppStore((s) => s.setRows);
    const setHeaders = useAppStore((s) => s.setHeaders);
    const rows = useAppStore((s) => s.rows);
    const mapping = useAppStore((s) => s.mapping);
    const setMapping = useAppStore((s) => s.setMapping);
    const token = useAppStore((s) => s.token);
    const serviceUrl = useAppStore((s) => s.serviceUrl);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const setRowStatus = useAppStore((s) => s.setRowStatus);
    const setIsSending = useAppStore((s) => s.setIsSending);
    const setSendCancelled = useAppStore((s) => s.setSendCancelled);

    // ─── Excel loading ──────────────────────────────────────────────────
    const handleLoadExcel = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // ─── Shared Excel Async Loader (Paints spinner FIRST before parsing) ───
    // Ported from uniordercreator (857d6392): a single requestAnimationFrame
    // doesn't guarantee the browser has actually painted the loading overlay
    // before the synchronous (CPU-heavy) parse + auto-mapping starts, so the
    // UI appeared frozen/stuck on large files. Double setTimeout forces a
    // real repaint first.
    const processExcelData = useCallback((arrayBuffer: ArrayBuffer) => {
        setTimeout(() => {
            setTimeout(() => {
                try {
                    const { sheet } = parseExcelFile(arrayBuffer);

                    if (sheet.headers.length === 0) {
                        throw new Error('El archivo Excel no parece tener cabeceras válidas.');
                    }

                    setHeaders(sheet.headers);
                    setRows(sheet.rows);
                    // Selecciona la 1ª fila para que la vista previa muestre ya su XML real
                    useAppStore.getState().setSelectedRow(sheet.rows.length > 0 ? 0 : -1);

                    // Auto-mapping on load
                    const allFields = getAllFields();
                    const newMapping: Record<string, string> = {};
                    for (const field of allFields) {
                        const shortName = field.split('.').pop()?.toLowerCase() || '';
                        let bestMatch = '';
                        let bestDist = Infinity;
                        for (const header of sheet.headers) {
                            const dist = levenshtein(shortName, header.toLowerCase());
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestMatch = header;
                            }
                        }
                        if (bestDist <= Math.max(2, Math.floor(shortName.length * 0.4))) {
                            newMapping[field] = bestMatch;
                        }
                    }
                    setMapping(newMapping);
                } catch (err: any) {
                    console.error('[ExcelLoadError]', err);
                    alert(`Error cargando el archivo: ${err.message || err}`);
                } finally {
                    setIsLoadingExcel(false);
                }
            }, 50);
        }, 50);
    }, [setHeaders, setRows, setMapping]);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
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
        },
        [processExcelData],
    );

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
    }), [mapping, booleanOverrides, token]);

    // ─── Send batch ─────────────────────────────────────────────────────
    const sendBatch = useCallback(async (batch: { row: any; index: number }[]) => {
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
        const createdDominios: string[] = [];

        if (!serviceUrl || !token) {
            logs.push({ ref: 'UNIGIS', status: 'error', msg: 'No hay sesión UNIGIS activa (falta token o URL del servicio). Pulsa "Conectar" y vuelve a enviar.' });
            setProgressError(total); setProgressLogs([...logs]);
            setProgressComplete(true); setIsSending(false);
            return;
        }

        // Ping previo: si el servidor no responde se aborta el lote entero en vez de fallar fila a fila.
        try {
            logs.push({ ref: 'UNIGIS', status: 'info', msg: `Verificando conectividad con ${serviceUrl}...` });
            setProgressLogs([...logs]);
            const pingRes = await postSoapProxy({ url: serviceUrl, action: SOAP_ACTION, version: '1.1', body: '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body/></soapenv:Envelope>', timeoutMs: 10000 });
            if (pingRes.status === 404) throw new Error('Servidor no encontrado (HTTP 404) — revisa la URL de login.');
            const pingData = await pingRes.json();
            if (!pingData.ok && pingData.status !== 500) throw new Error(`Servidor inaccesible: HTTP ${pingData.status} ${pingData.statusText || ''}`);
            logs.push({ ref: 'UNIGIS', status: 'success', msg: 'Conexión exitosa.' });
            setProgressLogs([...logs]);
        } catch (e: any) {
            logs.push({ ref: 'UNIGIS', status: 'error', msg: `Abortado: ${e.message}` });
            setProgressError(total); setProgressLogs([...logs]);
            setProgressComplete(true); setIsSending(false);
            return;
        }

        // Circuit breaker: tras varios 502/503/504 seguidos se asume caída del servidor y se pausa.
        let consecutiveTransientFailures = 0;
        const TRANSIENT_FAILURE_THRESHOLD = 5;
        const TRANSIENT_COOLDOWN_MS = 45000;

        for (let i = 0; i < batch.length; i++) {
            if (useAppStore.getState().sendCancelled) {
                logs.push({ ref: 'CANCELADO', status: 'warn', msg: 'Integración cancelada por el usuario' });
                setProgressLogs([...logs]);
                break;
            }

            const { row, index } = batch[i];
            setRowStatus(index, 'sending');
            setProgressCurrent(i + 1);

            const refCol = mapping['Vehiculo.Dominio'];
            const dominio = refCol ? String(row[refCol] ?? '').trim() : '';
            const ref = dominio || `Fila ${index + 1}`;
            let rawResponse = '';
            let wasTransientFailure = false;

            // Filas sin datos mínimos ni se intentan: UNIGIS puede responder "true" sin crear nada.
            const missingRequired = REQUIRED_FIELDS.filter((field) => {
                const col = mapping[field];
                const val = col ? row[col] : undefined;
                return val === undefined || val === null || String(val).trim() === '';
            });
            if (missingRequired.length > 0) {
                errors++;
                const msg = `Fila sin datos mínimos (${missingRequired.join(', ')}) — no se envía.${refCol ? '' : ' Mapea la columna Dominio en la pestaña pVehiculo.'}`;
                setRowStatus(index, 'error', msg);
                logs.push({ ref, status: 'error', msg });
                setProgressSuccess(success); setProgressError(errors); setProgressLogs([...logs]);
                continue;
            }

            try {
                const xml = buildXml(row, ctx);

                let res: any = null;
                let fetchError: any = null;
                for (let retry = 0; retry <= 2; retry++) {
                    try {
                        res = await postSoapProxy({ url: serviceUrl, action: SOAP_ACTION, version: '1.1', body: xml, timeoutMs: 30000 });
                        if ([502, 503, 504].includes(res.status)) { wasTransientFailure = true; throw new Error(`Error temporal HTTP ${res.status}`); }
                        wasTransientFailure = false;
                        fetchError = null;
                        break;
                    } catch (err: any) {
                        fetchError = err;
                        if (retry < 2) {
                            logs.push({ ref, status: 'warn', msg: `Reintento ${retry + 1}/2...` });
                            setProgressLogs([...logs]);
                            await new Promise((r) => setTimeout(r, 2000 * Math.pow(1.5, retry)));
                        }
                    }
                }
                if (fetchError) throw new Error(`Fallaron 3 intentos: ${fetchError.message}`);

                const response = await res.json();
                rawResponse = response.text || '';
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText || ''}`.trim());

                // CrearVehiculos devuelve Boolean según la guía UNIGIS (1.61): true = OK, false = error.
                // Antes el parser solo reconocía números (`(\d+)`), así que "true"/"false" caían en
                // la rama "sin código" y se daban SIEMPRE por éxito aunque no se creara nada.
                // Ahora: solo es éxito con evidencia positiva (true o un entero > 0).
                const doc = new DOMParser().parseFromString(rawResponse, 'text/xml');
                const resultNode =
                    doc.getElementsByTagName('CrearVehiculosResult')[0] ||
                    doc.getElementsByTagNameNS('*', 'CrearVehiculosResult')[0];
                const resultText = (resultNode?.textContent ?? '').trim();
                const isSuccess = resultText.toLowerCase() === 'true' || /^[1-9]\d*$/.test(resultText);

                if (isSuccess) {
                    success++;
                    consecutiveTransientFailures = 0;
                    setRowStatus(index, 'success', undefined, rawResponse);
                    logs.push({ ref, status: 'success', msg: `UNIGIS respondió ${resultText}` });
                    if (dominio) createdDominios.push(dominio);
                } else {
                    const fault = /faultstring[^>]*>([^<]*)/i.exec(rawResponse)?.[1]?.trim();
                    const msg = fault
                        ? `SOAP Fault: ${fault}`
                        : resultNode
                            ? `UNIGIS rechazó el vehículo (Result = "${resultText}"). Causa habitual: un valor de catálogo que no existe en UNIGIS (TipoVehiculo, Transporte, Propietario, Marca...). Revisa la respuesta cruda.`
                            : 'Respuesta sin <CrearVehiculosResult> — no se puede confirmar la creación. Revisa la respuesta cruda.';
                    throw new Error(msg);
                }
            } catch (err: any) {
                errors++;
                setRowStatus(index, 'error', err.message, rawResponse);
                logs.push({ ref, status: 'error', msg: err.message, detail: rawResponse ? rawResponse.slice(0, 3000) : undefined });
                console.warn('[VehicleCreator] fila con error', { index, ref, error: err.message, rawResponse });

                if (wasTransientFailure) {
                    consecutiveTransientFailures++;
                    if (consecutiveTransientFailures >= TRANSIENT_FAILURE_THRESHOLD) {
                        logs.push({ ref: 'UNIGIS', status: 'warn', msg: `⏸️ ${consecutiveTransientFailures} fallos seguidos (502/503/504) — el servidor parece caído. Pausa de ${TRANSIENT_COOLDOWN_MS / 1000}s...` });
                        setProgressLogs([...logs]);
                        for (let waited = 0; waited < TRANSIENT_COOLDOWN_MS && !useAppStore.getState().sendCancelled; waited += 1000) {
                            await new Promise((r) => setTimeout(r, 1000));
                        }
                        consecutiveTransientFailures = 0;
                    }
                } else {
                    consecutiveTransientFailures = 0;
                }
            }

            setProgressSuccess(success);
            setProgressError(errors);
            setProgressLogs([...logs]);
        }

        // "true" de UNIGIS no garantiza el alta (lección de CrearClientesDadores, 2026-09-18):
        // se deja una query lista para confirmar en SSMS que los vehículos existen de verdad.
        if (createdDominios.length > 0) {
            const inList = createdDominios.map((d) => `'${d.replace(/'/g, "''")}'`).join(',');
            logs.push({
                ref: 'VERIFICACIÓN', status: 'warn',
                msg: `Confirma en SSMS que los ${createdDominios.length} vehículos "OK" existen en UNIGIS (y que el login apunta a la base correcta):`,
                detail: `SELECT * FROM dbo.Vehiculo WHERE Dominio IN (${inList});`,
            });
            setProgressLogs([...logs]);
        }

        setProgressComplete(true);
        setIsSending(false);
    }, [mapping, serviceUrl, token, buildContext, setRowStatus, setIsSending, setSendCancelled]);

    // ─── Send all / selected / retry ───────────────────────────────────
    const handleSendAll = useCallback(() => {
        const batch = rows.map((row, index) => ({ row, index }));
        sendBatch(batch);
    }, [rows, sendBatch]);

    const handleSendSelected = useCallback(() => {
        const batch = Array.from(selectedIndices).map((index) => ({ row: rows[index], index }));
        sendBatch(batch);
    }, [rows, selectedIndices, sendBatch]);

    const handleRetryFailed = useCallback(() => {
        const batch = rows
            .map((row, index) => ({ row, index }))
            .filter(({ row }: { row: any }) => row._status === 'error');
        sendBatch(batch);
    }, [rows, sendBatch]);

    const handleCancelSend = useCallback(() => {
        setSendCancelled(true);
    }, [setSendCancelled]);

    // ─── Resizable layout state ──────────────────────────────────────
    const [leftWidth, setLeftWidth] = useState(75); // % of horizontal space
    const [detailHeight, setDetailHeight] = useState(35); // % of left panel height
    const [mapperHeight, setMapperHeight] = useState(260); // px for bottom mapper height
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
                const headerH = 44;
                const leftPanelTop = headerH + 8;
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
        <div ref={containerRef} className="flex flex-col h-screen w-full bg-slate-950 overflow-hidden font-sans text-slate-200">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />

            {/* Loading Overlay */}
            {isLoadingExcel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="text-sm font-semibold">Procesando Excel...</span>
                        <span className="text-[10px] text-slate-500 font-mono">Cargando hojas y filas</span>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <Header
                onShowLogin={() => setLoginOpen(true)}
                onLoadExcel={handleLoadExcel}
                onMassEdit={() => setMassEditOpen(true)}
                onValidate={handleValidate}
                onSendAll={handleSendAll}
                onSendSelected={handleSendSelected}
                onRetryFailed={handleRetryFailed}
                onLogout={() => useAppStore.getState().setToken(null)}
                onManageUsers={() => { }}
                isLoadingExcel={isLoadingExcel}
            />

            {/* MAIN CONTENT — Resizable horizontal split */}
            <div className="flex flex-1 overflow-hidden p-2 gap-0" style={{ paddingBottom: 0 }}>
                {/* Left panel: DataPanel (MasterTable + DetailPanel) */}
                <div className="flex flex-col bg-slate-900 rounded-lg border border-slate-800 overflow-hidden" style={{ width: `${leftWidth}%` }}>
                    <div className="flex justify-between items-center px-3 py-1.5 border-b border-slate-800 bg-slate-900">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">🚛 Vehículos</span>
                        <div className="flex gap-1.5 items-center">
                            <button className="p-1 hover:bg-slate-800 rounded transition-colors text-xs cursor-pointer" onClick={() => setDynWizardOpen(true)} title="Campos Dinámicos">🔧 Wizard Dinámicos</button>
                            <button className="p-1 hover:bg-slate-800 rounded transition-colors text-xs cursor-pointer" onClick={() => setMappingActionsOpen(true)} title="Acciones de Mapeo">🗺️ Acciones</button>
                            <button className="p-1 hover:bg-slate-800 rounded transition-colors text-xs cursor-pointer text-indigo-400" onClick={() => setSavedMappingsOpen(true)} title="Plantillas en la Nube">☁️ Nube</button>
                            <button
                                className="p-1 hover:bg-slate-800 rounded transition-colors text-red-400 text-xs cursor-pointer"
                                onClick={() => { if (confirm('¿Limpiar todo el mapeo actual?')) setMapping({}); }}
                                title="Limpiar Mapeo"
                            >🧹 Limpiar</button>
                            <button
                                className="p-1 hover:bg-slate-800 rounded transition-colors text-red-500 text-xs cursor-pointer"
                                onClick={() => {
                                    if (!confirm(`¿Vaciar todo (${rows.length} filas + mapeo) para empezar un mapeo nuevo? No se puede deshacer. La sesión conectada a UNIGIS no se cierra.`)) return;
                                    useAppStore.getState().clearAllData();
                                }}
                                title="Nuevo Excel (vaciar todo)"
                            >🗑️ Nuevo</button>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full">{rows.length} filas</span>
                        </div>
                    </div>
                    {/* MasterTable — fills remaining space above detail */}
                    <div className="overflow-auto min-h-0" style={{ flex: `1 1 ${100 - detailHeight}%` }}><MasterTable /></div>
                    {/* Vertical drag handle (table ↔ detail) */}
                    <div
                        className="h-1.5 cursor-row-resize bg-slate-800 hover:bg-indigo-500 active:bg-indigo-600 transition-colors shrink-0 flex items-center justify-center"
                        onMouseDown={() => handleMouseDown('v')}
                    >
                        <div className="w-8 h-0.5 bg-slate-600 rounded-full" />
                    </div>
                    {/* DetailPanel */}
                    <div className="overflow-auto min-h-0" style={{ flex: `0 0 ${detailHeight}%` }}><DetailPanel /></div>
                </div>

                {/* Horizontal drag handle (left ↔ right) */}
                <div
                    className="w-2 cursor-col-resize hover:bg-indigo-500 active:bg-indigo-650 transition-colors shrink-0 flex items-center justify-center mx-1 rounded-full"
                    onMouseDown={() => handleMouseDown('h')}
                >
                    <div className="h-12 w-0.5 bg-slate-700 rounded-full" />
                </div>

                {/* Right panel: XML Preview */}
                <div className="flex-1 flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden min-w-0">
                    <XmlPreview />
                </div>
            </div>

            {/* Bottom mapper drag handle */}
            <div
                className="h-1.5 cursor-row-resize bg-slate-800 hover:bg-indigo-500 active:bg-indigo-600 transition-colors shrink-0 flex items-center justify-center"
                onMouseDown={() => handleMouseDown('m')}
            >
                <div className="w-10 h-0.5 bg-slate-650 rounded-full" />
            </div>

            {/* Mapper Panel — resizable height */}
            <div className="border-t border-slate-800 bg-slate-900 overflow-hidden shrink-0" style={{ height: mapperHeight }}>
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
            <DynamicFieldsWizard isOpen={dynWizardOpen} onClose={() => setDynWizardOpen(false)} />
            <MappingActions isOpen={mappingActionsOpen} onClose={() => setMappingActionsOpen(false)} />
            <SavedMappings isOpen={savedMappingsOpen} onClose={() => setSavedMappingsOpen(false)} />
        </div>
    );
}

export default function UnigisVehicleCreatorPage() {
    const { tenantId, loading } = useAuth();

    if (loading) {
        return <div className="p-8 text-center text-slate-500 bg-slate-950 h-screen w-full flex items-center justify-center">Cargando módulo...</div>;
    }

    if (tenantId !== '3') {
        return (
            <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-950 p-4">
                <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 text-center max-w-lg">
                    <div className="text-4xl mb-4">🚫</div>
                    <h2 className="text-xl font-bold text-slate-200 mb-2">Acceso Restringido</h2>
                    <p className="text-slate-400 text-xs">Este módulo se encuentra actualmente limitado en exclusiva para el Tenant 3 (Europastry).</p>
                </div>
            </div>
        );
    }

    return <UnigisVehicleCreatorPageInner />;
}
