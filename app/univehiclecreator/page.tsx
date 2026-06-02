'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppStore } from '@/app/univehiclecreator/_src/store/appStore';
import { parseExcelFile } from '@/app/univehiclecreator/_src/utils/excelParser';
import { levenshtein } from '@/app/univehiclecreator/_src/utils/levenshtein';
import { getAllFields } from '@/app/univehiclecreator/_src/data/schema';
import { generateValidationReport, type ValidationReport } from '@/app/univehiclecreator/_src/utils/validation';
import { buildXml, type BuildXmlContext } from '@/app/univehiclecreator/_src/services/xmlBuilder';
import { type ProgressLog } from '@/app/univehiclecreator/_src/components/Modals/ProgressModal';

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

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            setIsLoadingExcel(true);
            reader.onload = (evt) => {
                requestAnimationFrame(() => {
                    try {
                        const data = evt.target?.result as ArrayBuffer;
                        const { sheet } = parseExcelFile(data);

                        if (sheet.headers.length === 0) {
                            throw new Error('El archivo Excel no parece tener cabeceras válidas.');
                        }

                        setHeaders(sheet.headers);
                        setRows(sheet.rows);

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
                        alert(`Error cargando el archivo: ${err.message}`);
                    } finally {
                        setIsLoadingExcel(false);
                    }
                });
            };
            reader.readAsArrayBuffer(file);
            e.target.value = '';
        },
        [setHeaders, setRows, setMapping],
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
            const ref = row[refCol] || `Fila ${index + 1}`;

            try {
                const xml = buildXml(row, ctx);

                // Fetch through proxy function
                const res = await fetch('https://europe-west1-minuta-f75a4.cloudfunctions.net/unigisSoapProxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: serviceUrl,
                        action: 'http://unisolutions.com.ar/CrearVehiculos',
                        version: '1.1',
                        body: xml,
                        timeoutMs: 30000,
                    }),
                });

                const response = await res.json();

                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

                const codeMatch = /CrearVehiculosResult>(\d+)<\/CrearVehiculosResult/i.exec(response.text);
                const code = codeMatch ? parseInt(codeMatch[1]) : null;

                if (code === null) {
                    if (response.text.includes('fault') || response.text.includes('error')) {
                        throw new Error('Error en respuesta SOAP del servidor');
                    }
                    success++;
                    setRowStatus(index, 'success', undefined, response.text);
                    logs.push({ ref, status: 'success', msg: 'Vehículo creado' });
                } else if (code > 0) {
                    success++;
                    setRowStatus(index, 'success', undefined, response.text);
                    logs.push({ ref, status: 'success', msg: `Id: ${code}` });
                } else {
                    throw new Error(`Código de error retornado: ${code}`);
                }
            } catch (err: any) {
                errors++;
                setRowStatus(index, 'error', err.message);
                logs.push({ ref, status: 'error', msg: err.message });
            }

            setProgressSuccess(success);
            setProgressError(errors);
            setProgressLogs([...logs]);
        }

        setProgressComplete(true);
        setIsSending(false);
    }, [mapping, serviceUrl, buildContext, setRowStatus, setIsSending, setSendCancelled]);

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
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-full">{rows.length} filas</span>
                        </div>
                    </div>
                    {/* MasterTable — fills remaining space above detail */}
                    <div className="overflow-auto" style={{ flex: `1 1 ${100 - detailHeight}%` }}><MasterTable /></div>
                    {/* Vertical drag handle (table ↔ detail) */}
                    <div
                        className="h-1.5 cursor-row-resize bg-slate-800 hover:bg-indigo-500 active:bg-indigo-600 transition-colors shrink-0 flex items-center justify-center"
                        onMouseDown={() => handleMouseDown('v')}
                    >
                        <div className="w-8 h-0.5 bg-slate-600 rounded-full" />
                    </div>
                    {/* DetailPanel */}
                    <div className="overflow-auto" style={{ flex: `0 0 ${detailHeight}%` }}><DetailPanel /></div>
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
