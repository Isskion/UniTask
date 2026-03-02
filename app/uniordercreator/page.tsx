'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppStore } from '@/app/uniordercreator/_src/store/appStore';
import { parseExcelFile, groupRows } from '@/app/uniordercreator/_src/utils/excelParser';
import { levenshtein } from '@/app/uniordercreator/_src/utils/levenshtein';
import { getAllFields } from '@/app/uniordercreator/_src/data/schema';
import { generateValidationReport, type ValidationReport } from '@/app/uniordercreator/_src/utils/validation';
import { buildXml, type BuildXmlContext } from '@/app/uniordercreator/_src/services/xmlBuilder';
// IMPORTANTE: Ya no llamamos a soapService (Express), usaremos fetch a nuestra propia API Route Next.js
// import { soapCall } from '@/app/uniordercreator/_src/services/soapService';
import { UNIGIS_ERROR_CODES } from '@/app/uniordercreator/_src/data/errorCodes';
import { type ProgressLog } from '@/app/uniordercreator/_src/components/Modals/ProgressModal';

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
import MappingActions from '@/app/uniordercreator/_src/components/Mapper/MappingActions';
import SavedMappings from '@/app/uniordercreator/_src/components/Mapper/SavedMappings';

import '@/app/uniordercreator/_src/i18n';
import '@/app/uniordercreator/_src/App.css';

function UnigisOrderCreatorPageInner() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modals / Wizards state
    const [loginOpen, setLoginOpen] = useState(true);
    const [progressOpen, setProgressOpen] = useState(false);
    const [validationOpen, setValidationOpen] = useState(false);
    const [massEditOpen, setMassEditOpen] = useState(false);
    const [dynWizardOpen, setDynWizardOpen] = useState(false);
    const [multiSheetWizOpen, setMultiSheetWizOpen] = useState(false);
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
    const orderUrl = useAppStore((s) => s.orderUrl);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const setRowStatus = useAppStore((s) => s.setRowStatus);
    const setIsSending = useAppStore((s) => s.setIsSending);
    const setSendCancelled = useAppStore((s) => s.setSendCancelled);
    const multiSheet = useAppStore((s) => s.multiSheet);

    // ─── Excel loading ──────────────────────────────────────────────────
    const handleLoadExcel = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const data = evt.target?.result as ArrayBuffer;
                const { sheet, workbook } = parseExcelFile(data);
                setHeaders(sheet.headers);
                setRows(sheet.rows);

                // Store workbook for multi-sheet
                useAppStore.getState().setMultiSheet({ workbook });

                // Auto-mapping
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
            };
            reader.readAsArrayBuffer(file);
            e.target.value = '';
        },
        [setHeaders, setRows, setMapping],
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
                logs.push({ ref: 'CANCELADO', status: 'warn', msg: 'Envío cancelado por el usuario' });
                setProgressLogs([...logs]);
                break;
            }

            const { row, index } = batch[i];
            setRowStatus(index, 'sending');
            setProgressCurrent(i + 1);

            const refCol = mapping['Orden.RefDocumento'];
            const ref = row[refCol] || `Fila ${index + 1}`;

            try {
                const xml = buildXml(row, ctx);

                // MODIFICACIÓN NEXT.JS: Llamar a la API Route local en lugar de soapService
                const res = await fetch('/api/unigis/soap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: orderUrl,
                        action: 'http://unisolutions.com.ar/CrearOrdenesPedido',
                        version: '1.1',
                        body: xml,
                        timeoutMs: 30000,
                    })
                });

                const response = await res.json();

                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

                const codeMatch = /CrearOrdenesPedidoResult>(-?\d+)<\/CrearOrdenesPedidoResult/i.exec(response.text);
                const code = codeMatch ? parseInt(codeMatch[1]) : null;

                if (code === null) {
                    if (response.text.includes('fault') || response.text.includes('error')) {
                        throw new Error('Error en respuesta del servidor');
                    }
                    success++;
                    setRowStatus(index, 'success', undefined, response.text);
                    logs.push({ ref, status: 'success', msg: 'OK' });
                } else if (code > 0) {
                    success++;
                    setRowStatus(index, 'success', undefined, response.text);
                    logs.push({ ref, status: 'success', msg: `Código ${code}` });
                } else {
                    throw new Error(UNIGIS_ERROR_CODES[String(code)] || `Código ${code}`);
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
    }, [mapping, orderUrl, buildContext, setRowStatus, setIsSending, setSendCancelled]);

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
    const [detailHeight, setDetailHeight] = useState(35); // % of left panel for DetailPanel
    const [mapperHeight, setMapperHeight] = useState(380); // px for bottom mapper
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
                const headerH = 72; // header height px
                const leftPanelTop = headerH + 16; // p-4
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
            />

            {/* MAIN CONTENT — Resizable horizontal split */}
            <div className="flex flex-1 overflow-hidden p-4 gap-0" style={{ paddingBottom: 0 }}>
                {/* Panel izquierdo: DataPanel */}
                <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ width: `${leftWidth}%` }}>
                    <div className="flex justify-between items-center p-3 border-b border-slate-100 bg-slate-50/50">
                        <span className="font-semibold text-slate-800">📦 Pedidos (Maestro)</span>
                        <div className="flex gap-2 items-center">
                            <button className="p-1.5 hover:bg-slate-200 rounded transition-colors" onClick={() => setDynWizardOpen(true)} title="Campos Dinámicos">🔧</button>
                            <button className="p-1.5 hover:bg-slate-200 rounded transition-colors" onClick={() => setMultiSheetWizOpen(true)} title="Multi-Hoja">📊</button>
                            <button className="p-1.5 hover:bg-slate-200 rounded transition-colors" onClick={() => setMappingActionsOpen(true)} title="Acciones de Mapeo">🗺️</button>
                            <button className="p-1.5 hover:bg-amber-100 rounded transition-colors text-amber-600" onClick={() => setSavedMappingsOpen(true)} title="Plantillas en la Nube">☁️</button>
                            <button
                                className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-500"
                                onClick={() => { if (confirm('¿Limpiar todo el mapeo actual?')) setMapping({}); }}
                                title="Limpiar Mapeo"
                            >🧹</button>
                            <span className="text-sm text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-full">{rows.length} filas</span>
                        </div>
                    </div>
                    {/* MasterTable — fills remaining space above detail */}
                    <div className="overflow-auto" style={{ flex: `1 1 ${100 - detailHeight}%` }}><MasterTable /></div>
                    {/* Vertical drag handle (table ↔ detail) */}
                    <div
                        className="h-1.5 cursor-row-resize bg-slate-200 hover:bg-indigo-400 active:bg-indigo-500 transition-colors shrink-0 flex items-center justify-center"
                        onMouseDown={() => handleMouseDown('v')}
                    >
                        <div className="w-8 h-0.5 bg-slate-400 rounded-full" />
                    </div>
                    {/* DetailPanel */}
                    <div className="overflow-auto" style={{ flex: `0 0 ${detailHeight}%` }}><DetailPanel /></div>
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
            <DynamicFieldsWizard isOpen={dynWizardOpen} onClose={() => setDynWizardOpen(false)} />
            <MultiSheetWizard isOpen={multiSheetWizOpen} onClose={() => setMultiSheetWizOpen(false)} />
            <MappingActions isOpen={mappingActionsOpen} onClose={() => setMappingActionsOpen(false)} />
            <SavedMappings isOpen={savedMappingsOpen} onClose={() => setSavedMappingsOpen(false)} />
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

    return <UnigisOrderCreatorPageInner />;
}
