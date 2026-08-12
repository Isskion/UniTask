'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    DiscoveryField, DiscoverySection, ProjectDiscoveryInstance, DiscoveryResponses, SECTION_META_KEY
} from '@/types/relevamiento';
import {
    getProjectDiscoveryInstance, getAllSectionsResponses, getSectionResponses,
    updateFieldResponse, setFieldNotApplicable, setSectionNotApplicable, createNoteLink,
    appendTableRow, removeTableRow
} from '@/lib/discovery';
import { processDiscoveryExcelUpload } from '@/lib/discoveryImporter';
import { CheckCircle2, MinusCircle, Circle, Loader2, FileSpreadsheet, X, Plus, Trash2, Printer, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoveryQuestionnaireProps {
    tenantId: string;
    projectId: string;
    uid: string;
    selectedText: string;
    selectedNoteId: string | null;
    onTextConsumed: () => void;
}

function isFieldFilled(field: DiscoveryField, value: any): boolean {
    if (field.type === 'table') return Array.isArray(value) && value.length > 0;
    if (field.type === 'multiselect') return Array.isArray(value) && value.length > 0;
    if (field.type === 'boolean') return typeof value === 'boolean';
    return value !== undefined && value !== null && String(value).trim() !== '';
}

function deriveFieldStatus(field: DiscoveryField, response: any): 'pending' | 'filled' | 'not_applicable' {
    if (response?.status === 'not_applicable') return 'not_applicable';
    if (isFieldFilled(field, response?.value)) return 'filled';
    return 'pending';
}

function getSectionSummary(section: DiscoverySection, resp: DiscoveryResponses | null | undefined) {
    const meta = resp?.[SECTION_META_KEY];
    if (meta?.notApplicable) return { total: section.fields.length, done: section.fields.length, notApplicable: true };
    let done = 0;
    for (const field of section.fields) {
        const status = deriveFieldStatus(field, resp?.[field.id]);
        if (status !== 'pending') done++;
    }
    return { total: section.fields.length, done, notApplicable: false };
}

export default function DiscoveryQuestionnaire({ tenantId, projectId, uid, selectedText, selectedNoteId, onTextConsumed }: DiscoveryQuestionnaireProps) {
    const [instance, setInstance] = useState<ProjectDiscoveryInstance | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [sectionResponses, setSectionResponses] = useState<Record<string, DiscoveryResponses | null>>({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [importTargetFieldId, setImportTargetFieldId] = useState<string>('');
    const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const inst = await getProjectDiscoveryInstance(tenantId, projectId);
            if (cancelled) return;
            setInstance(inst);
            if (inst && inst.sections.length > 0) {
                setActiveSectionId(inst.sections[0].id);
                const all = await getAllSectionsResponses(tenantId, projectId, inst.sections.map(s => s.id));
                if (!cancelled) setSectionResponses(all);
            }
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [tenantId, projectId]);

    useEffect(() => {
        const section = instance?.sections.find(s => s.id === activeSectionId);
        const firstTableField = section?.fields.find(f => f.type === 'table');
        setImportTargetFieldId(firstTableField?.id || '');
    }, [instance, activeSectionId]);

    const updateLocalFieldValue = (sectionId: string, fieldId: string, value: any, status: string) => {
        setSectionResponses(prev => ({
            ...prev,
            [sectionId]: {
                ...(prev[sectionId] || { id: 'responses_' + sectionId, projectId, tenantId }),
                [fieldId]: { value, status, updatedBy: uid, updatedAt: prev[sectionId]?.[fieldId]?.updatedAt ?? null },
            } as DiscoveryResponses,
        }));
    };

    const handleTextFieldChange = (field: DiscoveryField, value: string) => {
        if (!activeSectionId) return;
        const sectionId = activeSectionId;
        updateLocalFieldValue(sectionId, field.id, value, 'filled');
        if (debounceTimers.current[field.id]) clearTimeout(debounceTimers.current[field.id]);
        debounceTimers.current[field.id] = setTimeout(async () => {
            try {
                await updateFieldResponse(projectId, sectionId, tenantId, field.id, value, uid);
            } catch (error) {
                console.error('[Discovery] Error guardando respuesta:', error);
            }
        }, 600);
    };

    const handleImmediateFieldChange = async (field: DiscoveryField, value: any) => {
        if (!activeSectionId) return;
        const sectionId = activeSectionId;
        updateLocalFieldValue(sectionId, field.id, value, 'filled');
        try {
            await updateFieldResponse(projectId, sectionId, tenantId, field.id, value, uid);
        } catch (error) {
            console.error('[Discovery] Error guardando respuesta:', error);
        }
    };

    const handleToggleFieldNA = async (field: DiscoveryField) => {
        if (!activeSectionId) return;
        const sectionId = activeSectionId;
        const current = sectionResponses[sectionId]?.[field.id];
        const nextNA = current?.status !== 'not_applicable';
        updateLocalFieldValue(sectionId, field.id, nextNA ? null : (current?.value ?? null), nextNA ? 'not_applicable' : 'empty');
        try {
            await setFieldNotApplicable(tenantId, projectId, sectionId, field.id, nextNA, uid);
        } catch (error) {
            console.error('[Discovery] Error marcando campo como no aplica:', error);
        }
    };

    const handleToggleSectionNA = async () => {
        if (!activeSectionId) return;
        const sectionId = activeSectionId;
        const current = sectionResponses[sectionId]?.[SECTION_META_KEY]?.notApplicable ?? false;
        const next = !current;
        setSectionResponses(prev => ({
            ...prev,
            [sectionId]: {
                ...(prev[sectionId] || { id: 'responses_' + sectionId, projectId, tenantId }),
                [SECTION_META_KEY]: { notApplicable: next, updatedBy: uid, updatedAt: null },
            } as DiscoveryResponses,
        }));
        try {
            await setSectionNotApplicable(tenantId, projectId, sectionId, next, uid);
        } catch (error) {
            console.error('[Discovery] Error marcando sección como no aplica:', error);
        }
    };

    const handleAssignText = async (field: DiscoveryField) => {
        if (!selectedText || !activeSectionId) return;
        const sectionId = activeSectionId;

        // En multiselect el texto asignado se ACUMULA como un tag más (no pisa los ya elegidos);
        // en el resto de tipos, el texto asignado reemplaza el valor del campo.
        let nextValue: any = selectedText;
        if (field.type === 'multiselect') {
            const current: string[] = Array.isArray(sectionResponses[sectionId]?.[field.id]?.value)
                ? sectionResponses[sectionId]![field.id].value
                : [];
            nextValue = current.includes(selectedText) ? current : [...current, selectedText];
        }

        updateLocalFieldValue(sectionId, field.id, nextValue, 'filled');
        try {
            await updateFieldResponse(projectId, sectionId, tenantId, field.id, nextValue, uid);
            if (selectedNoteId) {
                await createNoteLink(tenantId, selectedNoteId, {
                    type: 'project_discovery', id: projectId, sectionId, fieldId: field.id
                }, uid);
            }
            onTextConsumed();
        } catch (error) {
            console.error('[Discovery] Error asignando texto:', error);
            alert('Hubo un error al asignar el texto.');
        }
    };

    const reloadActiveSectionResponses = async (sectionId: string) => {
        const resp = await getSectionResponses(tenantId, projectId, sectionId);
        setSectionResponses(prev => ({ ...prev, [sectionId]: resp }));
    };

    // Alta manual de una fila de un campo tabla — para catálogos pequeños donde montar un Excel
    // no compensa. Reusa appendTableRow (misma operación atómica que usa el import de Excel).
    const handleAddTableRow = async (field: DiscoveryField, row: Record<string, any>) => {
        if (!activeSectionId) return;
        const sectionId = activeSectionId;
        try {
            await appendTableRow(tenantId, projectId, sectionId, field.id, row, uid);
            await reloadActiveSectionResponses(sectionId);
        } catch (error) {
            console.error('[Discovery] Error añadiendo fila manual:', error);
            alert('No se pudo añadir la fila.');
        }
    };

    const handleRemoveTableRow = async (field: DiscoveryField, rowId: string) => {
        if (!activeSectionId) return;
        const sectionId = activeSectionId;
        if (!confirm('¿Eliminar esta fila?')) return;
        try {
            await removeTableRow(tenantId, projectId, sectionId, field.id, rowId, uid);
            await reloadActiveSectionResponses(sectionId);
        } catch (error) {
            console.error('[Discovery] Error eliminando fila:', error);
            alert('No se pudo eliminar la fila.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeSectionId) return;
        const sectionId = activeSectionId;
        const section = instance?.sections.find(s => s.id === sectionId);
        const targetTableField = section?.fields.find(f => f.id === importTargetFieldId && f.type === 'table');

        setUploading(true);
        try {
            let result;
            if (targetTableField && targetTableField.columns) {
                const columnMap: Record<string, string> = {};
                for (const col of targetTableField.columns) columnMap[col.label] = col.id;
                result = await processDiscoveryExcelUpload(file, tenantId, projectId, uid, {
                    mode: 'table', sectionId, fieldId: targetTableField.id, columnMap,
                });
            } else {
                result = await processDiscoveryExcelUpload(file, tenantId, projectId, uid, {
                    mode: 'scalar', mapping: { 'Pregunta 1': { sectionId, fieldId: 'f_01_01' } },
                });
            }
            alert(`Importación completada: ${result.success} exitosos, ${result.errors.length} errores.` + (result.errors.length ? `\n\n${result.errors.slice(0, 5).join('\n')}` : ''));
            await reloadActiveSectionResponses(sectionId);
        } catch (error: any) {
            alert('Error en importación: ' + error.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleExportWBS = () => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "Fase de Proyecto;Descripción;Entregables Clave;Duración Estimada;Responsable;Requisito DDS\n";

        const sec21Id = instance?.sections.find(s => s.id.includes('21') || s.title.toLowerCase().includes('próximos pasos') || s.title.toLowerCase().includes('wbs'))?.id || 'sec-21';
        const sec21Resp = sectionResponses[sec21Id];
        const isDdsRequired = sec21Resp?.['p21_2']?.value || "No Obligatorio (Solo WBS Excel)";

        const defaultRows = [
            { fase: "1. Descubrimiento & Alineación WBS", desc: "Workshops de relevamiento inicial e integración de la WBS (Excel de Proyecto)", entregables: "Excel WBS de Proyecto (DDS Opcional)", duracion: "1-3 Semanas", resp: "Consultor UNIGIS" },
            { fase: "2. Parametrización & Reglas", desc: "Configuración del TMS, optimizador, tarifas y app chofer", entregables: "Entorno UNIGIS Configurado", duracion: "4 Semanas", resp: "Equipo Técnico UNIGIS" },
            { fase: "3. Desarrollo de Integraciones", desc: "Construcción de conectores API REST con SAP y GPS", entregables: "APIs Probadamente Funcionales", duracion: "4 Semanas", resp: "Equipo IT UNIGIS / Cliente" },
            { fase: "4. Pruebas & Formación", desc: "Pruebas UAT integradas y capacitación por roles", entregables: "Acta de Aceptación UAT", duracion: "2 Semanas", resp: "Consultor & Cliente" },
            { fase: "5. Go-Live & Soporte", desc: "Puesta en marcha asistida y monitoreo en operación real", entregables: "Sistema en Producción Real", duracion: "2 Semanas", resp: "Equipo Mixto UNIGIS/Cliente" }
        ];

        const tableData = Array.isArray(sec21Resp?.['t65']?.value) ? sec21Resp['t65'].value : defaultRows;

        tableData.forEach((r: any) => {
            const line = `"${r.fase || r.Fase || ''}";"${r.desc || r.Descripción || ''}";"${r.entregables || r.Entregables || ''}";"${r.duracion || r.Duración || ''}";"${r.resp || r.Responsable || ''}";"${isDdsRequired}"`;
            csvContent += line + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const a = document.createElement('a');
        a.href = encodedUri;
        a.download = `WBS_Proyecto_${projectId.replace(/\s+/g, '_')}.csv`;
        a.click();
        alert("📊 Estructura WBS (Excel) exportada exitosamente. El DDS es un documento opcional.");
    };

    const handleExportJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ projectId, tenantId, responses: sectionResponses }, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `Discovery_${projectId}.json`;
        a.click();
    };

    const handlePrintDDS = () => {
        window.print();
    };

    const overall = useMemo(() => {
        if (!instance) return { done: 0, total: 0, pct: 0 };
        let done = 0, total = 0;
        for (const section of instance.sections) {
            const s = getSectionSummary(section, sectionResponses[section.id]);
            done += s.done;
            total += s.total;
        }
        return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    }, [instance, sectionResponses]);

    if (loading) {
        return (
            <div className="flex-1 min-w-0 flex items-center justify-center bg-background text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Cargando cuestionario...</span>
            </div>
        );
    }

    if (!instance) {
        return <div className="flex-1 min-w-0 p-4 text-muted-foreground text-sm">Instancia de relevamiento no encontrada.</div>;
    }

    const activeSection = instance.sections.find(s => s.id === activeSectionId);
    const activeResponses = activeSectionId ? sectionResponses[activeSectionId] : null;
    const sectionNotApplicable = !!activeResponses?.[SECTION_META_KEY]?.notApplicable;
    const tableFieldsInSection = activeSection?.fields.filter(f => f.type === 'table') || [];

    return (
        <div className="flex-1 min-w-0 flex flex-col bg-background">
            <div className="p-4 border-b border-border flex items-center justify-between gap-4 shrink-0 bg-card">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground truncate">Discovery (Relevamiento)</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{overall.done}/{overall.total} preguntas resueltas ({overall.pct}%)</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-32 h-2 rounded-full bg-muted overflow-hidden shrink-0 hidden sm:block">
                        <div className="h-full bg-primary transition-all" style={{ width: `${overall.pct}%` }} />
                    </div>

                    <button 
                        onClick={handleExportWBS}
                        title="Exportar WBS (Excel / CSV Independiente de DDS)"
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>WBS Excel</span>
                    </button>

                    <button 
                        onClick={handleExportJSON}
                        title="Exportar Respuestas JSON"
                        className="flex items-center gap-1.5 bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold border border-border transition-colors cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>JSON</span>
                    </button>

                    <button 
                        onClick={handlePrintDDS}
                        title="Imprimir Documento DDS (Opcional)"
                        className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir DDS</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 min-h-0">
                <div className="w-64 shrink-0 border-r border-border overflow-y-auto">
                    {instance.sections.map(sec => {
                        const summary = getSectionSummary(sec, sectionResponses[sec.id]);
                        const isActive = sec.id === activeSectionId;
                        return (
                            <button
                                key={sec.id}
                                onClick={() => setActiveSectionId(sec.id)}
                                className={cn(
                                    "w-full text-left px-3 py-2.5 border-b border-border/50 flex items-start gap-2 transition-colors",
                                    isActive ? "bg-primary/10" : "hover:bg-muted"
                                )}
                            >
                                <span className="mt-0.5 shrink-0">
                                    {summary.notApplicable ? (
                                        <MinusCircle className="w-4 h-4 text-muted-foreground" />
                                    ) : summary.done === summary.total && summary.total > 0 ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <Circle className={cn("w-4 h-4", summary.done > 0 ? "text-amber-500" : "text-muted-foreground/40")} />
                                    )}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className={cn("block text-xs font-medium truncate", isActive ? "text-primary" : "text-foreground")}>{sec.title}</span>
                                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                                        {summary.notApplicable ? 'No aplica' : `${summary.done}/${summary.total}`}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    {activeSection && (
                        <>
                            <div className="p-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
                                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={sectionNotApplicable}
                                        onChange={handleToggleSectionNA}
                                        className="rounded border-border accent-primary"
                                    />
                                    Esta sección no aplica a este proyecto
                                </label>
                                {tableFieldsInSection.length > 0 && !sectionNotApplicable && (
                                    <div className="flex items-center gap-2">
                                        {tableFieldsInSection.length > 1 && (
                                            <select
                                                className="border border-border bg-muted rounded-lg px-2 py-1.5 text-xs text-foreground outline-none"
                                                value={importTargetFieldId}
                                                onChange={(e) => setImportTargetFieldId(e.target.value)}
                                                title="Campo tabla destino del import"
                                            >
                                                {tableFieldsInSection.map(f => (
                                                    <option key={f.id} value={f.id}>{f.label}</option>
                                                ))}
                                            </select>
                                        )}
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            id="excel-upload"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                        <label
                                            htmlFor="excel-upload"
                                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold transition-colors"
                                        >
                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                            {uploading ? 'Importando...' : 'Importar Excel'}
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {sectionNotApplicable ? (
                                    <p className="text-sm text-muted-foreground italic text-center py-10">
                                        Esta sección está marcada como "No aplica". Desmarca la casilla de arriba para volver a editarla.
                                    </p>
                                ) : (
                                    activeSection.fields.map(field => (
                                        <FieldCard
                                            key={field.id}
                                            field={field}
                                            response={activeResponses?.[field.id]}
                                            selectedText={selectedText}
                                            onTextChange={handleTextFieldChange}
                                            onImmediateChange={handleImmediateFieldChange}
                                            onToggleNA={handleToggleFieldNA}
                                            onAssign={handleAssignText}
                                            onAddTableRow={handleAddTableRow}
                                            onRemoveTableRow={handleRemoveTableRow}
                                        />
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusPill({ status }: { status: 'pending' | 'filled' | 'not_applicable' }) {
    if (status === 'filled') {
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">Obtenida</span>;
    }
    if (status === 'not_applicable') {
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">No aplica</span>;
    }
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 shrink-0">Pendiente</span>;
}

interface FieldCardProps {
    field: DiscoveryField;
    response: any;
    selectedText: string;
    onTextChange: (field: DiscoveryField, value: string) => void;
    onImmediateChange: (field: DiscoveryField, value: any) => void;
    onToggleNA: (field: DiscoveryField) => void;
    onAssign: (field: DiscoveryField) => void;
    onAddTableRow: (field: DiscoveryField, row: Record<string, any>) => void;
    onRemoveTableRow: (field: DiscoveryField, rowId: string) => void;
}

function FieldCard({ field, response, selectedText, onTextChange, onImmediateChange, onToggleNA, onAssign, onAddTableRow, onRemoveTableRow }: FieldCardProps) {
    const status = deriveFieldStatus(field, response);
    const naActive = status === 'not_applicable';
    const value = response?.value;

    return (
        <div className={cn("mb-4 p-4 rounded-xl border border-border bg-card shadow-sm", naActive && "opacity-60")}>
            <div className="flex items-start justify-between gap-3 mb-1">
                <label className="text-sm font-semibold text-foreground">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>
                <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={status} />
                    {field.type !== 'table' && (
                        <button
                            onClick={() => onToggleNA(field)}
                            className={cn("p-1 rounded hover:bg-muted transition-colors", naActive ? "text-foreground" : "text-muted-foreground")}
                            title={naActive ? "Quitar 'No aplica'" : "Marcar como No aplica"}
                        >
                            <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
            {field.helpText && <p className="text-xs text-muted-foreground mb-2">{field.helpText}</p>}

            {naActive ? (
                <p className="text-xs text-muted-foreground italic">Marcado como no aplica.</p>
            ) : field.type === 'table' ? (
                <TableFieldView
                    field={field}
                    rows={Array.isArray(value) ? value : []}
                    onAddRow={(row) => onAddTableRow(field, row)}
                    onRemoveRow={(rowId) => onRemoveTableRow(field, rowId)}
                />
            ) : field.type === 'boolean' ? (
                <div className="flex gap-2">
                    <button
                        onClick={() => onImmediateChange(field, true)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors", value === true ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}
                    >
                        Sí
                    </button>
                    <button
                        onClick={() => onImmediateChange(field, false)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors", value === false ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}
                    >
                        No
                    </button>
                </div>
            ) : field.type === 'multiselect' ? (
                <MultiSelectField
                    field={field}
                    value={Array.isArray(value) ? value : []}
                    selectedText={selectedText}
                    onChange={(next) => onImmediateChange(field, next)}
                    onAssign={() => onAssign(field)}
                />
            ) : (
                // 'text', 'number' y 'select' comparten el mismo input libre: las opciones de la
                // plantilla (si las hay) son solo sugerencias vía <datalist>, nunca una lista cerrada
                // — el catálogo real (tipos de operativa, modelo logístico...) varía por proyecto/cliente.
                <div className="flex gap-2">
                    <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        list={field.type === 'select' && field.options?.length ? `${field.id}-options` : undefined}
                        value={value ?? ''}
                        onChange={(e) => onTextChange(field, e.target.value)}
                        placeholder={field.type === 'select' ? 'Elige una sugerencia o escribe la respuesta...' : 'Escribe la respuesta o pégala desde Unileaks...'}
                        className="flex-1 border border-border bg-background rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
                    />
                    {field.type === 'select' && field.options?.length ? (
                        <datalist id={`${field.id}-options`}>
                            {field.options.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    ) : null}
                    {selectedText && (
                        <button
                            onClick={() => onAssign(field)}
                            className="shrink-0 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                            title="Pegar el texto seleccionado en Unileaks"
                        >
                            Asignar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

interface MultiSelectFieldProps {
    field: DiscoveryField;
    value: string[];
    selectedText: string;
    onChange: (next: string[]) => void;
    onAssign: () => void;
}

// Catálogo de la plantilla como sugerencias, no como lista cerrada: el consultor siempre puede
// escribir un valor propio o pegarlo desde Unileaks, porque el catálogo real (tipos de operativa,
// modos, etc.) cambia de un proyecto/cliente a otro.
function MultiSelectField({ field, value, selectedText, onChange, onAssign }: MultiSelectFieldProps) {
    const [draft, setDraft] = useState('');
    const suggestions = (field.options || []).filter(opt => !value.includes(opt));

    const addTag = (text: string) => {
        const clean = text.trim();
        if (!clean || value.includes(clean)) return;
        onChange([...value, clean]);
        setDraft('');
    };
    const removeTag = (text: string) => onChange(value.filter(v => v !== text));

    return (
        <div className="flex flex-col gap-2">
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map(v => (
                        <span key={v} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                            {v}
                            <button onClick={() => removeTag(v)} className="p-0.5 hover:bg-primary/20 rounded-full" title="Quitar">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {suggestions.map(opt => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => addTag(opt)}
                            className="px-2.5 py-1 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                            + {opt}
                        </button>
                    ))}
                </div>
            )}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(draft); } }}
                    placeholder="Escribe un valor propio y pulsa Enter..."
                    className="flex-1 border border-border bg-background rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                />
                {selectedText && (
                    <button
                        onClick={onAssign}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                        title="Añadir el texto seleccionado en Unileaks como un valor más"
                    >
                        Asignar
                    </button>
                )}
            </div>
        </div>
    );
}

function formatCellValue(v: any): string {
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    return v === undefined || v === null ? '' : String(v);
}

interface TableFieldViewProps {
    field: DiscoveryField;
    rows: any[];
    onAddRow: (row: Record<string, any>) => void;
    onRemoveRow: (rowId: string) => void;
}

// El import de Excel sigue siendo la vía recomendada para catálogos grandes (vehículos, tarifas...),
// pero para secciones con pocas filas montar un Excel no compensa — este formulario permite
// teclearlas directamente, fila a fila, con el mismo guardado atómico que usa el import.
function TableFieldView({ field, rows, onAddRow, onRemoveRow }: TableFieldViewProps) {
    const columns = field.columns || [];
    const emptyDraft = () => Object.fromEntries(columns.map(c => [c.id, '']));
    const [draft, setDraft] = useState<Record<string, string>>(emptyDraft());

    const handleAdd = () => {
        const hasValue = columns.some(c => (draft[c.id] ?? '').trim() !== '');
        if (!hasValue) return;
        const row: Record<string, any> = {};
        for (const col of columns) {
            const raw = draft[col.id] ?? '';
            if (col.type === 'boolean') row[col.id] = raw === '' ? null : raw === 'true';
            else if (col.type === 'number') row[col.id] = raw === '' ? '' : Number(raw);
            else row[col.id] = raw;
        }
        onAddRow(row);
        setDraft(emptyDraft());
    };

    return (
        <div>
            <div className="flex items-center justify-end mb-1">
                <span className="text-xs text-muted-foreground">{rows.length} fila(s)</span>
            </div>
            {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground italic mb-2">Sin filas todavía — impórtalas desde Excel o añádelas a mano abajo.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-border mb-2">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-muted">
                                {columns.map(col => (
                                    <th key={col.id} className="text-left p-1.5 border-b border-border font-semibold text-foreground">{col.label}</th>
                                ))}
                                <th className="w-6 border-b border-border" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={row._rowId} className="border-b border-border/60 last:border-b-0 group">
                                    {columns.map(col => (
                                        <td key={col.id} className="p-1.5 text-foreground">{formatCellValue(row[col.id])}</td>
                                    ))}
                                    <td className="p-1.5">
                                        <button
                                            onClick={() => onRemoveRow(row._rowId)}
                                            className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Eliminar fila"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="rounded-lg border border-dashed border-border p-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Añadir fila manualmente</p>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {columns.map(col => (
                        col.type === 'boolean' ? (
                            <select
                                key={col.id}
                                value={draft[col.id] ?? ''}
                                onChange={(e) => setDraft(d => ({ ...d, [col.id]: e.target.value }))}
                                className="border border-border bg-background rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">{col.label}</option>
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        ) : (
                            <input
                                key={col.id}
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={draft[col.id] ?? ''}
                                onChange={(e) => setDraft(d => ({ ...d, [col.id]: e.target.value }))}
                                placeholder={col.label}
                                className="flex-1 min-w-[110px] border border-border bg-background rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                            />
                        )
                    ))}
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-3 h-3" /> Añadir fila
                </button>
            </div>
        </div>
    );
}
