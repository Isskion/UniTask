"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Upload, AlertTriangle, CheckCircle2, Loader2, FileSpreadsheet, MapPin, RefreshCw, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgendaConsultant } from "@/types/agenda";
import {
    parseAgendaExcel, resolveUnknownConsultants, executeImport, suggestConsultantMatch,
    ParsedExcelEntry, ImportPreview, ImportDiagnostics,
} from "@/lib/agenda-import";
import { updateConsultant } from "@/lib/agenda";
import { ACTIVITY_CONFIG } from "@/types/agenda";

// choice: '' = undecided (blocks import), 'SKIP' = explicitly leave these rows out, otherwise a consultant.userId
interface NameResolution {
    choice: string;
    remember: boolean;
}

interface Props {
    file: File;
    consultants: AgendaConsultant[];
    tenantId: string;
    userId: string;
    onClose: () => void;
    onSuccess: (written: number) => void;
}

type Phase = 'parsing' | 'preview' | 'importing' | 'done' | 'error';

export function AgendaImportModal({ file, consultants, tenantId, userId, onClose, onSuccess }: Props) {
    const [phase, setPhase] = useState<Phase>('parsing');
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [unknownConsultants, setUnknownConsultants] = useState<string[]>([]);
    const [nameResolutions, setNameResolutions] = useState<Record<string, NameResolution>>({});
    const [result, setResult] = useState<{ written: number; updated: number; skipped: number; unknownConsultants: string[] } | null>(null);
    const [error, setError] = useState<string>('');
    // consultantId → selected region (only populated for multi-region consultants in the Excel)
    const [regionOverrides, setRegionOverrides] = useState<Record<string, string>>({});

    // Re-analysis controls: which sheet to read + fallback Monday when Fecha_T can't be parsed
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [weekStartOverride, setWeekStartOverride] = useState<string>('');

    const applyPreview = useCallback((p: ImportPreview) => {
        const unknown = resolveUnknownConsultants(p.entries, consultants);
        setPreview(p);
        setUnknownConsultants(unknown);
        setNameResolutions({}); // force a fresh decision for every unknown name on each (re)parse
        setSelectedSheet(p.sheetName);

        // Pre-populate region overrides for multi-region consultants present in the Excel
        const namesInExcel = new Set(p.entries.map(e => e.consultantName.toUpperCase()));
        const initialOverrides: Record<string, string> = {};
        consultants.forEach(c => {
            const effectiveRegions = (c.regions ?? []).filter(r => r !== '*');
            if (effectiveRegions.length > 1 && namesInExcel.has(c.name.toUpperCase())) {
                initialOverrides[c.userId] = effectiveRegions[0];
            }
        });
        setRegionOverrides(initialOverrides);

        setPhase('preview');
    }, [consultants]);

    // Keep a ref to the latest applyPreview so the initial parse only re-runs when `file` changes,
    // not on every consultants snapshot update (which would otherwise discard a manual reanalysis).
    const applyPreviewRef = useRef(applyPreview);
    applyPreviewRef.current = applyPreview;

    useEffect(() => {
        parseAgendaExcel(file)
            .then(p => applyPreviewRef.current(p))
            .catch(err => {
                setError(String(err?.message || err));
                setPhase('error');
            });
    }, [file]);

    const handleReanalyze = useCallback(() => {
        setPhase('parsing');
        parseAgendaExcel(file, { sheetName: selectedSheet, weekStartOverride: weekStartOverride || undefined })
            .then(applyPreview)
            .catch(err => {
                setError(String(err?.message || err));
                setPhase('error');
            });
    }, [file, selectedSheet, weekStartOverride, applyPreview]);

    const handleImport = useCallback(async () => {
        if (!preview) return;
        setPhase('importing');
        try {
            const nameResolutionMap: Record<string, string> = {};
            Object.entries(nameResolutions).forEach(([name, r]) => {
                if (r.choice) nameResolutionMap[name] = r.choice;
            });

            const res = await executeImport(preview, consultants, tenantId, userId, regionOverrides, nameResolutionMap);

            // Persist "remember" choices as aliases so future imports resolve automatically
            const toRemember = Object.entries(nameResolutions).filter(([, r]) => r.remember && r.choice && r.choice !== 'SKIP');
            for (const [name, r] of toRemember) {
                const consultant = consultants.find(c => c.userId === r.choice);
                if (!consultant) continue;
                const existingAliases = consultant.aliases ?? [];
                if (existingAliases.includes(name)) continue;
                await updateConsultant(consultant.id, { aliases: [...existingAliases, name] });
            }

            setResult(res);
            setPhase('done');
            onSuccess(res.written);
        } catch (err: any) {
            setError(String(err?.message || err));
            setPhase('error');
        }
    }, [preview, consultants, tenantId, userId, regionOverrides, nameResolutions, onSuccess]);

    // Group by consultant for preview table
    const grouped = preview ? groupByConsultant(preview.entries) : [];
    const matchable = preview
        ? preview.entries.filter(e => {
            const upper = e.consultantName.toUpperCase();
            if (consultants.some(c => c.isActive && (c.name.toUpperCase() === upper || (c.aliases ?? []).some(a => a.toUpperCase() === upper)))) {
                return true;
            }
            const choice = nameResolutions[upper]?.choice;
            return !!choice && choice !== 'SKIP';
          }).length
        : 0;

    // Unknown names the importer hasn't made a decision on yet — blocks the Import button
    const unresolvedCount = unknownConsultants.filter(n => !nameResolutions[n]?.choice).length;

    // Entries whose Fecha_T was broken/empty — imported anyway with an estimated date and no hours
    const needsDateReviewCount = preview ? preview.entries.filter(e => e.needsDateReview).length : 0;

    // Consultants that appear in the Excel AND have multiple specific regions (excluding '*') → need region selector
    const multiRegionConsultants = preview
        ? consultants.filter(c => {
            const effectiveRegions = (c.regions ?? []).filter(r => r !== '*');
            return effectiveRegions.length > 1 &&
                preview.entries.some(e => e.consultantName.toUpperCase() === c.name.toUpperCase());
          })
        : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Importar agenda desde Excel</h2>
                            <p className="text-xs text-muted-foreground">{file.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                    {/* Parsing */}
                    {phase === 'parsing' && (
                        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Analizando Excel…</span>
                        </div>
                    )}

                    {/* Error */}
                    {phase === 'error' && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">Error al procesar el archivo</p>
                                <p className="text-xs mt-0.5 opacity-80">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Done */}
                    {phase === 'done' && result && (
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold">{result.written} entradas importadas correctamente</p>
                                    {result.updated > 0 && (
                                        <p className="text-xs mt-0.5 opacity-80">{result.updated} entradas actualizadas (cambio de estado/resultado detectado)</p>
                                    )}
                                    {result.skipped > 0 && (
                                        <p className="text-xs mt-0.5 opacity-80">{result.skipped} entradas omitidas (duplicadas o sin consultor)</p>
                                    )}
                                    {needsDateReviewCount > 0 && (
                                        <p className="text-xs mt-0.5 opacity-80">{needsDateReviewCount} se importaron con fecha estimada y sin horas (Fecha_T no era válida) — revísalas en la agenda o reimporta cuando el Excel tenga la fecha correcta</p>
                                    )}
                                </div>
                            </div>
                            {result.unknownConsultants.length > 0 && (
                                <UnknownBanner names={result.unknownConsultants} />
                            )}
                        </div>
                    )}

                    {/* Importing */}
                    {phase === 'importing' && (
                        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Escribiendo en Firestore…</span>
                        </div>
                    )}

                    {/* Preview */}
                    {phase === 'preview' && preview && (
                        <>
                            {/* Stats bar */}
                            <div className="flex items-center gap-4 text-xs">
                                <StatPill label="Hoja" value={preview.sheetName} />
                                <StatPill label="Semana" value={preview.weekLabel || '—'} />
                                <StatPill label="Entradas en Excel" value={String(preview.entries.length)} />
                                <StatPill label="A importar" value={String(matchable)} highlight />
                                {needsDateReviewCount > 0 && (
                                    <StatPill label="Con fecha estimada (sin horas)" value={String(needsDateReviewCount)} warn />
                                )}
                                {unresolvedCount > 0 && (
                                    <StatPill label="Pendientes de resolver" value={String(unresolvedCount)} warn />
                                )}
                            </div>

                            {/* Re-analysis controls: pick a different sheet / supply Monday when Fecha_T is broken */}
                            <div className="flex flex-wrap items-end gap-3 p-3 bg-secondary/30 border border-border rounded-xl">
                                {preview.sheetNames.length > 1 && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-muted-foreground font-medium">Hoja del libro</label>
                                        <select
                                            value={selectedSheet}
                                            onChange={e => setSelectedSheet(e.target.value)}
                                            className="px-2.5 py-1.5 rounded-lg text-xs bg-secondary/40 border border-border text-foreground focus:outline-none focus:border-indigo-500/60 transition-all"
                                        >
                                            {preview.sheetNames.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-muted-foreground font-medium">Lunes de esta semana (si las fechas no se detectan)</label>
                                    <input
                                        type="date"
                                        value={weekStartOverride}
                                        onChange={e => setWeekStartOverride(e.target.value)}
                                        className="px-2.5 py-1.5 rounded-lg text-xs bg-secondary/40 border border-border text-foreground focus:outline-none focus:border-indigo-500/60 transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleReanalyze}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Reanalizar
                                </button>
                            </div>

                            {/* Why 0 entries? */}
                            {preview.entries.length === 0 && (
                                <DiagnosticBanner diagnostics={preview.diagnostics} />
                            )}

                            {/* Unknown consultants — must be resolved before importing */}
                            {unknownConsultants.length > 0 && (
                                <UnknownResolver
                                    names={unknownConsultants}
                                    consultants={consultants}
                                    resolutions={nameResolutions}
                                    onChange={(name, choice) => setNameResolutions(prev => ({
                                        ...prev,
                                        [name]: { choice, remember: prev[name]?.remember ?? true },
                                    }))}
                                    onToggleRemember={name => setNameResolutions(prev => ({
                                        ...prev,
                                        [name]: { choice: prev[name]?.choice ?? '', remember: !(prev[name]?.remember ?? true) },
                                    }))}
                                />
                            )}

                            {/* Region selector for multi-region consultants */}
                            {multiRegionConsultants.length > 0 && (
                                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        Consultores con múltiples regiones — selecciona dónde asignar las entradas
                                    </div>
                                    <div className="grid gap-2">
                                        {multiRegionConsultants.map(c => (
                                            <div key={c.userId} className="flex items-center justify-between gap-3">
                                                <span className="text-xs text-foreground font-medium truncate">{c.name}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {(c.regions ?? []).filter(r => r !== '*').map(r => (
                                                        <button
                                                            key={r}
                                                            onClick={() => setRegionOverrides(prev => ({ ...prev, [c.userId]: r }))}
                                                            className={cn(
                                                                "px-2.5 py-0.5 rounded-md text-xs font-medium border transition-all",
                                                                regionOverrides[c.userId] === r
                                                                    ? "bg-indigo-600 border-indigo-500 text-white"
                                                                    : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                                            )}
                                                        >
                                                            {r}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Entries table */}
                            {grouped.length > 0 && (
                                <div className="border border-border rounded-xl overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-muted/40 border-b border-border">
                                                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Consultor</th>
                                                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Fecha</th>
                                                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tipo</th>
                                                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Proyecto / Descripción</th>
                                                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Horario</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.entries.map((entry, i) => {
                                                const upperName = entry.consultantName.toUpperCase();
                                                const resolutionChoice = nameResolutions[upperName]?.choice;
                                                const willSkip = unknownConsultants.includes(upperName) && (!resolutionChoice || resolutionChoice === 'SKIP');
                                                const actCfg = ACTIVITY_CONFIG[entry.activityType];
                                                const slashIdx = entry.comment.indexOf(' / ');
                                                const project = slashIdx >= 0 ? entry.comment.slice(0, slashIdx) : entry.comment;
                                                const desc    = slashIdx >= 0 ? entry.comment.slice(slashIdx + 3) : '';
                                                return (
                                                    <tr key={i} className={cn(
                                                        "border-b border-border last:border-0",
                                                        willSkip ? "opacity-40" : "hover:bg-muted/20"
                                                    )}>
                                                        <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">
                                                            {entry.consultantName}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                                                            {entry.date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                                            {entry.needsDateReview && (
                                                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Fecha estimada — Fecha_T no era válida en el Excel">
                                                                    estimada
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-1.5 whitespace-nowrap">
                                                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", actCfg.bgClass, actCfg.textClass)}>
                                                                {actCfg.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-1.5 max-w-[260px]">
                                                            <span className="font-semibold text-foreground">{project}</span>
                                                            {desc && <span className="text-muted-foreground ml-1">· {desc}</span>}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-muted-foreground font-mono whitespace-nowrap">
                                                            {entry.scheduleRaw || <span className="italic text-zinc-600">sin horas</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {(phase === 'preview' || phase === 'done' || phase === 'error') && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-all"
                        >
                            {phase === 'done' ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {phase === 'preview' && (
                            <button
                                onClick={handleImport}
                                disabled={matchable === 0 || unresolvedCount > 0}
                                title={unresolvedCount > 0 ? `Resuelve los ${unresolvedCount} nombre(s) pendientes arriba antes de importar` : undefined}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                {unresolvedCount > 0 ? `Resuelve ${unresolvedCount} nombre(s) pendientes` : `Importar ${matchable} entradas`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatPill({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs",
            warn      ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
            highlight ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                        "bg-muted/40 border-border text-muted-foreground"
        )}>
            <span className="opacity-70">{label}:</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}

function DiagnosticBanner({ diagnostics }: { diagnostics: ImportDiagnostics }) {
    const { sheetName, consultantRows, candidateCells, invalidDateCells, unknownActivityCells } = diagnostics;

    let detail: string;
    let solution: string;

    if (consultantRows === 0) {
        detail = `La hoja "${sheetName}" no tiene ningún nombre de consultor desde la fila 4 (columna B).`;
        solution = `Selecciona la hoja correcta en "Hoja del libro" arriba y pulsa "Reanalizar" — comprueba que "${sheetName}" es la semana que querías importar.`;
    } else if (candidateCells === 0) {
        detail = `Se encontraron ${consultantRows} consultor(es) en "${sheetName}", pero ninguna celda tiene la columna Actividad rellena.`;
        solution = `Revisa que "${sheetName}" es la semana correcta (cámbiala arriba si no) y que la columna Actividad está rellena para esos consultores.`;
    } else if (invalidDateCells > 0) {
        detail = `Se encontraron ${candidateCells} entrada(s) con Actividad en "${sheetName}", pero ${invalidDateCells} no tienen una fecha válida en la columna "Fecha_T" (puede mostrar #REF! u otro error de fórmula).`;
        solution = `La fórmula "Fecha_T" de "${sheetName}" está rota (p.ej. #REF!). Indica el lunes de esta semana en el campo "Lunes de esta semana" de arriba y pulsa "Reanalizar": las fechas se calcularán a partir de ese lunes según la columna de cada día.`;
    } else if (unknownActivityCells > 0) {
        detail = `Se encontraron ${candidateCells} entrada(s) con fecha válida en "${sheetName}", pero ${unknownActivityCells} tienen un tipo de "Actividad" no reconocido.`;
        solution = `Los tipos válidos son: Reunión Cliente, Reunión UNIGIS, Reunión Presencial, Reunión Interna, Comercial, Tareas a Realizar, Vacaciones, Viaje, Especial. Corrige el texto de la columna Actividad y reintenta.`;
    } else {
        detail = `No se ha encontrado ningún dato reconocible en "${sheetName}".`;
        solution = `Comprueba que el formato del Excel coincide con la plantilla esperada (filas/columnas, ver condiciones de importación).`;
    }

    return (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
                <p className="font-semibold">No se ha importado ninguna entrada</p>
                <p className="text-xs opacity-90">{detail}</p>
                <p className="text-xs opacity-90"><span className="font-semibold">Solución propuesta:</span> {solution}</p>
            </div>
        </div>
    );
}

function UnknownBanner({ names }: { names: string[] }) {
    return (
        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div>
                <p className="font-semibold">Consultores no encontrados en el sistema (sus entradas se omitirán):</p>
                <p className="mt-0.5 opacity-80">{names.join(', ')}</p>
            </div>
        </div>
    );
}

function UnknownResolver({ names, consultants, resolutions, onChange, onToggleRemember }: {
    names: string[];
    consultants: AgendaConsultant[];
    resolutions: Record<string, NameResolution>;
    onChange: (name: string, choice: string) => void;
    onToggleRemember: (name: string) => void;
}) {
    const activeConsultants = consultants.filter(c => c.isActive).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                Nombres del Excel sin coincidencia exacta — indica dónde deben caer estas tareas
            </div>
            <div className="space-y-2">
                {names.map(name => {
                    const resolution = resolutions[name];
                    const choice = resolution?.choice ?? '';
                    const remember = resolution?.remember ?? true;
                    const suggestion = suggestConsultantMatch(name, consultants);
                    const isMappedToConsultant = !!choice && choice !== 'SKIP';

                    return (
                        <div key={name} className="flex flex-wrap items-center gap-2 p-2 bg-background/40 border border-amber-500/10 rounded-lg">
                            <span className="text-xs font-semibold text-foreground min-w-[140px]">{name}</span>

                            <select
                                value={choice}
                                onChange={e => onChange(name, e.target.value)}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-xs border focus:outline-none transition-all",
                                    choice ? "bg-secondary/40 border-border text-foreground" : "bg-amber-500/10 border-amber-500/40 text-amber-300"
                                )}
                            >
                                <option value="">— Elige qué hacer —</option>
                                <option value="SKIP">Omitir estas filas (no importar)</option>
                                {activeConsultants.map(c => (
                                    <option key={c.userId} value={c.userId}>
                                        Asignar a: {c.name}{suggestion?.userId === c.userId ? ' (sugerido)' : ''}
                                    </option>
                                ))}
                            </select>

                            {suggestion && choice === '' && (
                                <button
                                    type="button"
                                    onClick={() => onChange(name, suggestion.userId)}
                                    className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                                >
                                    Usar sugerencia: {suggestion.name}
                                </button>
                            )}

                            {isMappedToConsultant && (
                                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer ml-auto">
                                    <input
                                        type="checkbox"
                                        checked={remember}
                                        onChange={() => onToggleRemember(name)}
                                        className="accent-indigo-500"
                                    />
                                    Recordar para futuras importaciones
                                </label>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function groupByConsultant(entries: ParsedExcelEntry[]): { name: string; entries: ParsedExcelEntry[] }[] {
    const map = new Map<string, ParsedExcelEntry[]>();
    entries.forEach(e => {
        if (!map.has(e.consultantName)) map.set(e.consultantName, []);
        map.get(e.consultantName)!.push(e);
    });
    return [...map.entries()].map(([name, entries]) => ({ name, entries }));
}
