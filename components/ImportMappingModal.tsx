"use client";

import { useState, useEffect } from "react";
import { X, Search, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface Props {
    headers: string[];
    onConfirm: (mapping: Record<string, string>) => void;
    onCancel: () => void;
}

const UNITASK_FIELDS = [
    { id: "title", label: "Título / Nombre (*)", required: true },
    { id: "wbs", label: "WBS / Nº Esquema (*)", required: true },
    { id: "startDate", label: "Fecha de Inicio", required: false },
    { id: "endDate", label: "Fecha de Finalización", required: false },
    { id: "duration", label: "Duración (Texto)", required: false },
    { id: "percentComplete", label: "% Completado", required: false },
    { id: "description", label: "Notas / Descripción", required: false },
    { id: "priority", label: "Prioridad", required: false },
    { id: "ignore", label: "-- Ignorar --", required: false }
];

export function ImportMappingModal({ headers, onConfirm, onCancel }: Props) {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    // Auto-map based on common heuristics
    useEffect(() => {
        const initialMapping: Record<string, string> = {};

        headers.forEach(h => {
            const lower = h.toLowerCase();
            if (lower.includes('nombre') || lower.includes('title') || lower.includes('name')) {
                initialMapping[h] = 'title';
            } else if (lower.includes('esquema') || lower.includes('outline') || lower.includes('wbs')) {
                initialMapping[h] = 'wbs';
            } else if (lower.includes('inicio') || lower.includes('start')) {
                initialMapping[h] = 'startDate';
            } else if (lower.includes('fin') || lower.includes('end')) {
                initialMapping[h] = 'endDate';
            } else if (lower.includes('duración') || lower.includes('duration')) {
                initialMapping[h] = 'duration';
            } else if (lower.includes('%') || lower.includes('completado') || lower.includes('complete')) {
                initialMapping[h] = 'percentComplete';
            } else if (lower.includes('notas') || lower.includes('notes') || lower.includes('desc')) {
                initialMapping[h] = 'description';
            } else if (lower.includes('prioridad') || lower.includes('priority')) {
                initialMapping[h] = 'priority';
            } else {
                initialMapping[h] = 'ignore';
            }
        });

        setMapping(initialMapping);
    }, [headers]);

    const handleConfirm = () => {
        // Validation
        const values = Object.values(mapping);
        if (!values.includes('title')) {
            setError("Debes mapear una columna al 'Título / Nombre'.");
            return;
        }
        if (!values.includes('wbs')) {
            setError("Debes mapear una columna al 'WBS / Nº Esquema'.");
            return;
        }

        setError(null);
        onConfirm(mapping);
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex flex-col items-center justify-center p-4">
            <div className={cn(
                "w-full max-w-2xl rounded-xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 min-h-[400px] max-h-[85vh]",
                isLight ? "bg-white border border-zinc-200" : "bg-zinc-900 border border-white/10"
            )}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-indigo-500/5">
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Mapeo de Importación</h2>
                        <p className="text-sm text-zinc-500 mt-1">Conecta las columnas del archivo Excel con los campos de UniTask.</p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                        <div className="grid grid-cols-2 gap-4 p-4 border-b border-white/10 bg-white/5 font-semibold text-sm">
                            <div className="text-zinc-400">Columna en Archivo XML/XLSX</div>
                            <div className="text-zinc-400">Campo en UniTask</div>
                        </div>
                        <div className="divide-y divide-white/5">
                            {headers.map((header) => (
                                <div key={header} className="grid grid-cols-2 gap-4 p-4 items-center hover:bg-white/[0.02]">
                                    <div className="font-medium truncate pr-4 text-sm" title={header}>
                                        {header}
                                    </div>
                                    <div>
                                        <select
                                            value={mapping[header] || 'ignore'}
                                            onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                                            className={cn(
                                                "w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors",
                                                mapping[header] !== 'ignore'
                                                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 focus:border-indigo-500"
                                                    : (isLight ? "bg-zinc-100 border-transparent text-zinc-600 focus:border-zinc-300" : "bg-zinc-800 border-transparent text-zinc-400 focus:border-zinc-600")
                                            )}
                                        >
                                            {UNITASK_FIELDS.map(field => (
                                                <option key={field.id} value={field.id} className={isLight ? "bg-white text-black" : "bg-zinc-900 text-white"}>
                                                    {field.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/10 shrink-0 flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" /> Importar Datos
                    </button>
                </div>
            </div>
        </div>
    );
}
