"use client";

import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { X, ClipboardPaste, Loader2, AlertCircle, Save } from "lucide-react";
import { MoscowPriority } from "@/types";

export interface ParsedMoscowData {
    title: string;
    observations: string;
    priority: MoscowPriority;
    moduleCode: string;
}

interface MoscowBulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ParsedMoscowData[]) => Promise<void>;
}

export default function MoscowBulkImportModal({ isOpen, onClose, onSave }: MoscowBulkImportModalProps) {
    const { theme } = useTheme();
    const isLight = theme === "light";
    
    const [pasteData, setPasteData] = useState("");
    const [parsedData, setParsedData] = useState<ParsedMoscowData[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const parsePriority = (val: string): MoscowPriority => {
        const lower = val.toLowerCase().trim();
        if (lower.startsWith('m')) return 'must';
        if (lower.startsWith('s')) return 'should';
        if (lower.startsWith('c')) return 'could';
        if (lower.startsWith('w')) return 'wont';
        return 'must'; // default
    };

    const handleParse = (text: string) => {
        setPasteData(text);
        setError(null);
        
        if (!text.trim()) {
            setParsedData([]);
            return;
        }

        try {
            const lines = text.split('\n');
            const parsed: ParsedMoscowData[] = [];

            for (const line of lines) {
                if (!line.trim()) continue;
                
                const cols = line.split('\t').map(c => c.trim());
                if (cols.length === 0) continue;
                
                // Smart detection: Find priority column
                let priority: MoscowPriority = 'must';
                let pIndex = -1;
                
                for (let i = 0; i < cols.length; i++) {
                    const lower = cols[i].toLowerCase();
                    if (lower.includes('must') || lower === 'm') { priority = 'must'; pIndex = i; break; }
                    if (lower.includes('should') || lower === 's') { priority = 'should'; pIndex = i; break; }
                    if (lower.includes('could') || lower === 'c') { priority = 'could'; pIndex = i; break; }
                    if (lower.includes('wont') || lower.includes("won't") || lower === 'w') { priority = 'wont'; pIndex = i; break; }
                }

                let title = "";
                let observations = "";
                
                if (pIndex >= 2) {
                    title = cols[pIndex - 2];
                    observations = cols[pIndex - 1];
                } else if (pIndex === 1) {
                    title = cols[0];
                    observations = cols.length > 2 ? cols[2] : "";
                } else if (pIndex === 0) {
                    title = cols.length > 1 ? cols[1] : "";
                    observations = cols.length > 2 ? cols[2] : "";
                } else {
                    // Fallback if no priority explicitly found. Try to see if any cell contains "should" or "could" or "won't" anywhere
                    const fullText = line.toLowerCase();
                    if (fullText.includes("should")) { priority = 'should'; }
                    else if (fullText.includes("could")) { priority = 'could'; }
                    else if (fullText.includes("won't") || fullText.includes("wont")) { priority = 'wont'; }
                    else { priority = 'must'; }
                    
                    title = cols[0] || "Sin título";
                    // If there are exactly two columns and one is clearly a priority string
                    if (cols.length >= 2) {
                        observations = cols[cols.length - 1].toLowerCase().includes("should") || 
                                       cols[cols.length - 1].toLowerCase().includes("must") ||
                                       cols[cols.length - 1].toLowerCase().includes("could") ? 
                                       cols[cols.length - 2] : cols[cols.length - 1];
                    } else {
                         observations = cols[1] || "";
                    }
                }
                
                parsed.push({
                    title: title || "Sin título",
                    observations: observations || "",
                    priority,
                    moduleCode: "01", // Default to General
                });
            }
            
            setParsedData(parsed);
        } catch (err) {
            setError("Error al procesar los datos pegados. Asegúrate de copiar directamente desde Excel.");
            setParsedData([]);
        }
    };

    const handleSave = async () => {
        if (parsedData.length === 0) return;
        setIsSaving(true);
        try {
            await onSave(parsedData);
            setPasteData("");
            setParsedData([]);
            onClose();
        } catch (err) {
            setError("Hubo un error al guardar los requisitos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-4xl max-h-[90vh] rounded-xl flex flex-col overflow-hidden shadow-2xl transition-colors border",
                isLight ? "bg-white border-zinc-200" : "bg-[#09090b] border-white/10"
            )}>
                {/* Header */}
                <div className={cn("p-5 flex items-center justify-between border-b shrink-0",
                    isLight ? "bg-zinc-50/80 border-zinc-200" : "bg-white/5 border-white/10"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", isLight ? "bg-primary/10 text-primary" : "bg-primary/20 text-primary")}>
                            <ClipboardPaste className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className={cn("text-lg font-bold", isLight ? "text-zinc-900" : "text-white")}>
                                Importación Masiva (MoSCoW)
                            </h2>
                            <p className={cn("text-xs mt-0.5", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                Copia filas desde Excel y pégalas aquí. Columnas: Requisito | Observaciones | Prioridad (M/S/C/W)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className={cn("p-2 rounded-lg transition-colors disabled:opacity-50",
                            isLight ? "hover:bg-zinc-200 text-zinc-500" : "hover:bg-white/10 text-zinc-400"
                        )}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Left: Input */}
                    <div className={cn("w-full md:w-1/2 p-5 flex flex-col border-r", isLight ? "border-zinc-200" : "border-white/10")}>
                        <label className={cn("text-xs font-bold uppercase tracking-wider mb-2", isLight ? "text-zinc-600" : "text-zinc-400")}>
                            Pegar datos (TSV)
                        </label>
                        <textarea
                            value={pasteData}
                            onChange={e => handleParse(e.target.value)}
                            placeholder="Ejemplo:&#10;Login con Google&#9;Usar Firebase Auth&#9;Must&#10;Modo oscuro&#9;Tema visual dark&#9;Should"
                            className={cn(
                                "flex-1 w-full p-4 text-sm font-mono border rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                                isLight 
                                    ? "bg-zinc-50 border-zinc-300 text-zinc-800 placeholder:text-zinc-400" 
                                    : "bg-black/40 border-white/10 text-zinc-200 placeholder:text-zinc-600"
                            )}
                        />
                        {error && (
                            <div className="mt-3 flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Right: Preview */}
                    <div className={cn("w-full md:w-1/2 flex flex-col bg-opacity-50", isLight ? "bg-zinc-50/50" : "bg-black/20")}>
                        <div className={cn("p-4 border-b flex justify-between items-center", isLight ? "border-zinc-200" : "border-white/10")}>
                            <h3 className={cn("text-sm font-bold", isLight ? "text-zinc-800" : "text-zinc-200")}>
                                Vista previa
                            </h3>
                            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full",
                                parsedData.length > 0 
                                    ? (isLight ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/20 text-emerald-400")
                                    : (isLight ? "bg-zinc-200 text-zinc-600" : "bg-white/10 text-zinc-400")
                            )}>
                                {parsedData.length} filas detectadas
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {parsedData.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-3">
                                    <ClipboardPaste className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm font-medium">No hay datos para mostrar</p>
                                    <p className="text-xs">Pega tu contenido a la izquierda para ver la previsualización</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {parsedData.map((item, idx) => {
                                        const pColor = 
                                            item.priority === 'must' ? 'text-red-500' :
                                            item.priority === 'should' ? 'text-amber-500' :
                                            item.priority === 'could' ? 'text-blue-500' : 'text-zinc-500';

                                        return (
                                            <div key={idx} className={cn("p-3 rounded-lg border text-sm flex flex-col gap-1",
                                                isLight ? "bg-white border-zinc-200" : "bg-white/5 border-white/5"
                                            )}>
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold truncate pr-2">{item.title}</span>
                                                    <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0", pColor, 
                                                        isLight ? "border-current bg-white" : "border-current bg-black/50"
                                                    )}>{item.priority}</span>
                                                </div>
                                                {item.observations && (
                                                    <span className={cn("text-xs truncate", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                                        {item.observations}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className={cn("p-5 border-t mt-auto flex justify-end gap-3", isLight ? "border-zinc-200 bg-white" : "border-white/10 bg-[#09090b]")}>
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className={cn("px-4 py-2 text-sm font-medium rounded-lg", 
                                    isLight ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-white/5"
                                )}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={parsedData.length === 0 || isSaving}
                                className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? "Guardando..." : `Guardar ${parsedData.length} requisitos`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
