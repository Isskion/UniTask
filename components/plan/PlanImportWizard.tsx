"use client";
/**
 * [Plan] Asistente de importación de plan (docs/plan-import-design.md §2):
 * fichero → revisión (nivel de hito, recuento por rol, avisos, árbol) → importación → resultado.
 */
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { X, Upload, Loader2, AlertTriangle, Info, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";
import { parsePlanRows, inferResponsibleSide, type ParsedPlan } from "@/lib/plan/planParser";
import { importPlan } from "@/lib/plan/planImport";
import { computeInitialStates } from "@/lib/plan/planInitialState";
import { PlanTree, ROLE_META, type PlanTreeRow } from "./PlanTree";

interface Props {
    project: Project;
    tenantId: string;
    userId: string;
    isLight: boolean;
    onClose: () => void;
    onImported: () => void;
}

type Step = "file" | "review" | "importing" | "done";

/** Filas cuyo texto viene en negrita (MS Project marca así las tareas resumen). SheetJS no lo expone. */
async function readBoldRows(buffer: ArrayBuffer): Promise<Set<number>> {
    const bold = new Set<number>();
    try {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        const ws = wb.worksheets[0];
        ws?.eachRow((row, rowNumber) => {
            let isBold = false;
            row.eachCell((cell) => { if (cell.font?.bold) isBold = true; });
            if (isBold) bold.add(rowNumber);
        });
    } catch (err) {
        // Solo afecta al aviso "resumen sin detalle"; la importación no depende de ello.
        console.warn("[PlanImport] No se pudo leer el formato (negritas) del Excel:", err);
    }
    return bold;
}

export function PlanImportWizard({ project, tenantId, userId, isLight, onClose, onImported }: Props) {
    const [step, setStep] = useState<Step>("file");
    const [fileName, setFileName] = useState("");
    const [rows, setRows] = useState<unknown[][] | null>(null);
    const [boldRows, setBoldRows] = useState<Set<number>>(new Set());
    const [milestoneLevel, setMilestoneLevel] = useState<number | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [reading, setReading] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [result, setResult] = useState<{ created: number; importId: string } | null>(null);
    const [openWarning, setOpenWarning] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const parsed: ParsedPlan | null = useMemo(() => {
        if (!rows) return null;
        try {
            return parsePlanRows(rows, { milestoneLevel, boldRows });
        } catch (err) {
            return null;
        }
    }, [rows, milestoneLevel, boldRows]);

    const warningRows = useMemo(() => {
        const w = parsed?.warnings.find((x) => x.code === openWarning);
        return new Set(w?.rows || []);
    }, [parsed, openWarning]);

    const initialStates = useMemo(() => (parsed ? computeInitialStates(parsed) : null), [parsed]);

    const treeRows: PlanTreeRow[] = useMemo(() => (parsed ? parsed.nodes.map((n) => ({
        key: n.key,
        parentKey: n.parentKey,
        level: n.level,
        code: n.code,
        title: n.name,
        role: n.role,
        status: initialStates?.get(n.key)?.status,
        progress: initialStates?.get(n.key)?.computed?.progress ?? null,
        end: n.end,
        effortDays: n.children.length ? null : (n.effortDays ?? n.durationDays),
        responsible: inferResponsibleSide(n.name, project.clientName),
        childCount: n.children.length,
        highlight: warningRows.has(n.rowNumber),
    })) : []), [parsed, initialStates, warningRows, project.clientName]);

    const handleFile = async (file: File) => {
        setError(null);
        setReading(true);
        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false });
            parsePlanRows(data); // valida cabeceras y filas; lanza con mensaje claro si no es un plan
            setBoldRows(await readBoldRows(buffer));
            setRows(data);
            setFileName(file.name);
            setMilestoneLevel(undefined);
            setStep("review");
        } catch (err) {
            console.error("[PlanImport] Error leyendo el Excel:", file.name, err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setReading(false);
        }
    };

    const handleImport = async () => {
        if (!parsed) return;
        setStep("importing");
        setError(null);
        try {
            const res = await importPlan({
                project, tenantId, userId, fileName, plan: parsed,
                onProgress: (done, total) => setProgress({ done, total }),
            });
            setResult(res);
            setStep("done");
            onImported();
        } catch (err) {
            console.error("[PlanImport] Error importando:", err);
            setError(err instanceof Error ? err.message : String(err));
            setStep("review");
        }
    };

    const card = isLight ? "bg-white border border-zinc-200" : "bg-zinc-900 border border-white/10";
    const muted = isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/10";

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={step === "importing" ? undefined : onClose}>
            <div className={cn("w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]", card)} onClick={(e) => e.stopPropagation()}>
                <div className={cn("p-4 border-b flex items-center justify-between shrink-0", isLight ? "border-zinc-200" : "border-white/10")}>
                    <div>
                        <h3 className="font-semibold text-lg">Importar plan de proyecto</h3>
                        <p className="text-sm text-zinc-500">{project.name}{fileName ? ` · ${fileName}` : ""}</p>
                    </div>
                    {step !== "importing" && (
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400" aria-label="Cerrar"><X className="w-5 h-5" /></button>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 text-sm flex gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                        </div>
                    )}

                    {step === "file" && (
                        <div className={cn("rounded-xl border-2 border-dashed p-10 text-center space-y-3", isLight ? "border-zinc-300" : "border-white/15")}>
                            <FileSpreadsheet className="w-10 h-10 mx-auto text-zinc-400" />
                            <p className="text-sm">Excel exportado de MS Project (columnas <b>Nombre de tarea</b>, Duración, Comienzo, Fin…).</p>
                            <p className="text-xs text-zinc-500">La jerarquía se lee de la sangría de los nombres. Las tareas al 100 % entran en Aprobación Final; el resto, pendientes (el avance se calcula en UniTask).</p>
                            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                            <button onClick={() => fileRef.current?.click()} disabled={reading}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">
                                {reading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {reading ? "Leyendo…" : "Seleccionar Excel"}
                            </button>
                        </div>
                    )}

                    {step === "review" && parsed && (
                        <>
                            <div className={cn("rounded-lg border p-3 flex flex-wrap items-center gap-3", muted)}>
                                <label className="text-sm font-semibold">Nivel de hito</label>
                                <select
                                    value={parsed.milestoneLevel}
                                    onChange={(e) => setMilestoneLevel(parseInt(e.target.value, 10))}
                                    className={cn("text-sm rounded-md border px-2 py-1 max-w-full", isLight ? "bg-white border-zinc-300" : "bg-zinc-800 border-white/10")}
                                >
                                    {parsed.levels.map((l) => (
                                        <option key={l.level} value={l.level}>
                                            {parsed.flowMode ? `${l.level} desde el flujo` : `Nivel ${l.level}`} — p. ej. “{l.sample.slice(0, 50)}” ({l.count})
                                            {l.level === parsed.suggestedMilestoneLevel ? " · sugerido" : ""}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-xs text-zinc-500">
                                    {parsed.flowMode ? "Contado desde cada flujo (III.1, III.2…): 2 = III.1.4.2." : "No se detectaron flujos: nivel absoluto desde la raíz."}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(Object.keys(ROLE_META) as (keyof typeof ROLE_META)[]).map((role) => (
                                    <span key={role} className={cn("px-2 py-1 rounded-md text-xs font-semibold", ROLE_META[role].className)}>
                                        {ROLE_META[role].label}: {parsed.roleCounts[role]}
                                    </span>
                                ))}
                                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-zinc-500/10">Total: {parsed.nodes.length}</span>
                            </div>

                            {parsed.warnings.length > 0 && (
                                <div className="space-y-1">
                                    {parsed.warnings.map((w) => (
                                        <button key={w.code} type="button"
                                            onClick={() => setOpenWarning(openWarning === w.code ? null : w.code)}
                                            className={cn("w-full text-left flex gap-2 p-2 rounded-md text-xs border",
                                                w.severity === "warning" ? "border-amber-500/30 bg-amber-500/10" : "border-sky-500/20 bg-sky-500/5",
                                                openWarning === w.code && "ring-1 ring-amber-500")}>
                                            {w.severity === "warning" ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" /> : <Info className="w-3.5 h-3.5 shrink-0 text-sky-500" />}
                                            <span className="flex-1">{w.message}</span>
                                            {w.rows?.length ? <span className="text-zinc-500 shrink-0">{openWarning === w.code ? "ocultar" : "ver filas"}</span> : null}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <PlanTree
                                key={`${parsed.milestoneLevel}-${openWarning}`}
                                rows={treeRows}
                                isLight={isLight}
                                showStatus
                                initialExpandLevel={openWarning ? Infinity : (parsed.nodes.find((n) => n.role === "milestone")?.level ?? 4) + 1}
                                filter={openWarning && warningRows.size ? (r) => !!r.highlight : undefined}
                            />
                        </>
                    )}

                    {step === "importing" && (
                        <div className="py-16 text-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                            <p className="text-sm">Creando tareas… {progress.done} / {progress.total || parsed?.nodes.length}</p>
                            <p className="text-xs text-zinc-500">No cierres esta ventana.</p>
                        </div>
                    )}

                    {step === "done" && result && (
                        <div className="py-12 text-center space-y-2">
                            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                            <p className="font-semibold">Plan importado: {result.created} tareas creadas en {project.name}.</p>
                            <p className="text-xs text-zinc-500">Lote {result.importId}. Las tareas están pendientes; hitos y padres se cerrarán solos al cerrar sus tareas.</p>
                        </div>
                    )}
                </div>

                <div className={cn("p-4 border-t flex justify-end gap-2 shrink-0", isLight ? "border-zinc-200" : "border-white/10")}>
                    {step === "review" && (
                        <>
                            <button onClick={() => { setStep("file"); setRows(null); setError(null); }} className="px-4 py-2 rounded-lg text-sm hover:bg-zinc-500/10">Cambiar fichero</button>
                            <button onClick={handleImport} disabled={!parsed || parsed.roleCounts.milestone === 0}
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50">
                                Importar {parsed?.nodes.length ?? 0} tareas
                            </button>
                        </>
                    )}
                    {step === "done" && (
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500">Ver el plan</button>
                    )}
                </div>
            </div>
        </div>
    );
}
