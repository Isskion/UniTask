/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { parseSheet } from '../../utils/excelParser';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function MultiSheetWizard({ isOpen, onClose }: Props) {
    const multiSheet = useAppStore((s) => s.multiSheet);
    const setMultiSheet = useAppStore((s) => s.setMultiSheet);
    const headers = useAppStore((s) => s.headers);

    const [activeStep, setActiveStep] = useState(0);

    if (!isOpen) return null;

    const wb = multiSheet.workbook;
    const sheetNames = wb ? wb.SheetNames : [];

    const handleToggle = () => {
        setMultiSheet({ enabled: !multiSheet.enabled });
    };

    const handleMainSheetChange = (name: string) => {
        setMultiSheet({
            config: { ...multiSheet.config, mainSheet: name },
        });
        if (wb) {
            const parsed = parseSheet(wb, name);
            setMultiSheet({
                sheetHeaders: {
                    ...multiSheet.sheetHeaders,
                    [name]: parsed.headers,
                },
                sheets: {
                    ...multiSheet.sheets,
                    [name]: parsed.rows,
                },
            });
        }
    };

    const addRelation = () => {
        setMultiSheet({
            config: {
                ...multiSheet.config,
                relations: [
                    ...multiSheet.config.relations,
                    { sheet: '', key: '', targetPath: 'Orden.Items', itemTag: 'pOrdenPedidoItem' },
                ],
            },
        });
    };

    const updateRelation = (idx: number, field: string, value: string) => {
        const relations = [...multiSheet.config.relations];
        (relations[idx] as any)[field] = value;

        if (field === 'sheet' && wb && value && !multiSheet.sheetHeaders[value]) {
            const parsed = parseSheet(wb, value);
            setMultiSheet({
                sheetHeaders: { ...multiSheet.sheetHeaders, [value]: parsed.headers },
                sheets: { ...multiSheet.sheets, [value]: parsed.rows },
            });
        }

        setMultiSheet({ config: { ...multiSheet.config, relations } });
    };

    const removeRelation = (idx: number) => {
        const relations = multiSheet.config.relations.filter((_, i) => i !== idx);
        setMultiSheet({ config: { ...multiSheet.config, relations } });
    };

    const steps = ['Hoja Principal', 'Relaciones', 'Resumen'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-cyan-600">
                    <h2 className="text-lg font-bold text-white">📊 Wizard Multi-Hoja</h2>
                </div>

                <div className="p-6 space-y-5">
                    {/* Toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="text-sm font-semibold text-slate-700">Modo Multi-Hoja</label>
                        <button
                            className={`px-4 py-1.5 text-sm font-bold rounded-xl transition-all duration-300 ${multiSheet.enabled
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                            onClick={handleToggle}
                        >
                            {multiSheet.enabled ? '✅ Activado' : '⬜ Desactivado'}
                        </button>
                    </div>

                    {multiSheet.enabled && (
                        <>
                            {/* Step Indicator */}
                            <div className="flex items-center gap-2">
                                {steps.map((label, i) => (
                                    <button
                                        key={i}
                                        className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 border ${activeStep === i
                                                ? 'bg-teal-100 text-teal-700 border-teal-200 shadow-sm'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-white'
                                            }`}
                                        onClick={() => setActiveStep(i)}
                                    >
                                        <span className="font-black mr-1">{i + 1}.</span> {label}
                                    </button>
                                ))}
                            </div>

                            {/* Step 1 */}
                            {activeStep === 0 && (
                                <div className="space-y-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-700">1. Selecciona la hoja principal</h3>
                                    <select
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 transition-all"
                                        value={multiSheet.config.mainSheet}
                                        onChange={(e) => handleMainSheetChange(e.target.value)}
                                    >
                                        <option value="">— Seleccionar —</option>
                                        {sheetNames.map((n) => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Columna clave (para JOIN)</label>
                                        <select
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-300 transition-all"
                                            value={multiSheet.config.mainKey}
                                            onChange={(e) =>
                                                setMultiSheet({
                                                    config: { ...multiSheet.config, mainKey: e.target.value },
                                                })
                                            }
                                        >
                                            <option value="">— Seleccionar —</option>
                                            {headers.map((h) => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Step 2 */}
                            {activeStep === 1 && (
                                <div className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-700">2. Configura relaciones (hojas secundarias)</h3>
                                    {multiSheet.config.relations.map((rel, i) => (
                                        <div key={i} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
                                            <select
                                                className="flex-1 px-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                                value={rel.sheet}
                                                onChange={(e) => updateRelation(i, 'sheet', e.target.value)}
                                            >
                                                <option value="">Hoja</option>
                                                {sheetNames.filter((n) => n !== multiSheet.config.mainSheet).map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                            <select
                                                className="flex-1 px-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                                value={rel.key}
                                                onChange={(e) => updateRelation(i, 'key', e.target.value)}
                                            >
                                                <option value="">Clave</option>
                                                {(multiSheet.sheetHeaders[rel.sheet] || []).map((h) => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <input
                                                className="w-32 px-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                                value={rel.targetPath}
                                                onChange={(e) => updateRelation(i, 'targetPath', e.target.value)}
                                                placeholder="Orden.Items"
                                            />
                                            <button
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                                onClick={() => removeRelation(i)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        className="w-full py-2 text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 border-dashed rounded-xl hover:bg-teal-100 transition-colors"
                                        onClick={addRelation}
                                    >
                                        + Añadir relación
                                    </button>
                                </div>
                            )}

                            {/* Step 3 */}
                            {activeStep === 2 && (
                                <div className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-700">3. Resumen</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><strong className="text-slate-700">Hoja principal:</strong> <span className="text-teal-700 font-mono">{multiSheet.config.mainSheet || '(sin configurar)'}</span></p>
                                        <p><strong className="text-slate-700">Clave:</strong> <span className="text-teal-700 font-mono">{multiSheet.config.mainKey || '(sin configurar)'}</span></p>
                                        <p><strong className="text-slate-700">Relaciones:</strong> {multiSheet.config.relations.length}</p>
                                        {multiSheet.config.relations.map((r, i) => (
                                            <p key={i} className="text-xs text-slate-500 ml-4 font-mono">
                                                ↳ {r.sheet || '?'} → {r.targetPath}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        className="px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
