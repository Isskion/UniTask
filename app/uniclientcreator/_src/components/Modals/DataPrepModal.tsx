import { useState } from 'react';
import { useAppStore } from '../../store/appStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function DataPrepModal({ isOpen, onClose }: Props) {
    const headers = useAppStore((s) => s.headers);
    const rows = useAppStore((s) => s.rows);
    const setHeaders = useAppStore((s) => s.setHeaders);
    const setRows = useAppStore((s) => s.setRows);

    const [activeTab, setActiveTab] = useState<'calc' | 'transform'>('calc');

    // Calc state
    const [calcName, setCalcName] = useState('');
    const [calcFormula, setCalcFormula] = useState('');
    
    // Transform state
    const [trCol, setTrCol] = useState('');
    const [trRule, setTrRule] = useState<'uppercase' | 'lowercase' | 'trim' | 'replace' | 'multiply'>('trim');
    const [trParam1, setTrParam1] = useState('');
    const [trParam2, setTrParam2] = useState('');

    const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    if (!isOpen) return null;

    const showFeedback = (msg: string, type: 'success' | 'error') => {
        setFeedback({ msg, type });
        setTimeout(() => setFeedback(null), 3000);
    };

    // ─── #57 / #58: Columna Calculada ───────────────────────────────────────
    const handleAddCalculated = () => {
        if (!calcName.trim() || !calcFormula.trim()) {
            showFeedback('Nombre y fórmula son obligatorios', 'error');
            return;
        }
        if (headers.includes(calcName.trim())) {
            showFeedback('Ya existe una columna con ese nombre', 'error');
            return;
        }

        try {
            const regex = /\{\{([^}]+)\}\}/g; // Matches {{ColumnName}}
            const newRows = rows.map((r) => {
                let val = calcFormula;
                let match;
                while ((match = regex.exec(calcFormula)) !== null) {
                    const colName = match[1];
                    const colVal = String(r[colName] ?? '');
                    val = val.replace(`{{${colName}}}`, colVal);
                }
                return { ...r, [calcName.trim()]: val.trim() };
            });

            setHeaders([...headers, calcName.trim()]);
            setRows(newRows);
            setCalcName('');
            setCalcFormula('');
            showFeedback('Columna calculada añadida exitosamente', 'success');
        } catch (err) {
            showFeedback('Error al evaluar la fórmula', 'error');
        }
    };

    const insertToFormula = (col: string) => {
        setCalcFormula(prev => prev + `{{${col}}}`);
    };

    // ─── #56: Transformar Columna ───────────────────────────────────────────
    const handleTransform = () => {
        if (!trCol) {
            showFeedback('Selecciona una columna', 'error');
            return;
        }
        
        try {
            const newRows = rows.map(r => {
                const row = { ...r };
                let val = String(row[trCol] ?? '');

                switch (trRule) {
                    case 'uppercase': val = val.toUpperCase(); break;
                    case 'lowercase': val = val.toLowerCase(); break;
                    case 'trim': val = val.trim(); break;
                    case 'replace': val = val.replace(new RegExp(trParam1, 'g'), trParam2); break;
                    case 'multiply': 
                        const num = parseFloat(val);
                        const mult = parseFloat(trParam1);
                        if (!isNaN(num) && !isNaN(mult)) val = String(num * mult);
                        break;
                }
                row[trCol] = val;
                return row;
            });
            setRows(newRows);
            showFeedback(`Regla aplicada a ${rows.length} filas`, 'success');
        } catch (err) {
            showFeedback('Error al aplicar regla', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex bg-slate-100">
                    <button
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'calc' ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-200'}`}
                        onClick={() => setActiveTab('calc')}
                    >
                        ➕ Columna Calculada
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'transform' ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-200'}`}
                        onClick={() => setActiveTab('transform')}
                    >
                        🔄 Transformar Datos
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto">
                    {/* Feedback */}
                    {feedback && (
                        <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-bold ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {feedback.msg}
                        </div>
                    )}

                    {activeTab === 'calc' && (
                        <div className="space-y-4">
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800">
                                <span className="font-bold">Info:</span> Crea una columna combinando texto libre y valores actuales. <br/>Ejemplo: <code>{"{{Calle}} {{Numero}}, {{Ciudad}}"}</code>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre nueva columna</label>
                                <input 
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                    value={calcName}
                                    onChange={e => setCalcName(e.target.value)}
                                    placeholder="Ej: DireccionCompleta"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Fórmula</label>
                                <textarea 
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                                    rows={3}
                                    value={calcFormula}
                                    onChange={e => setCalcFormula(e.target.value)}
                                    placeholder="{{NombreColumna}} texto fijo {{OtraColumna}}"
                                />
                                <div className="mt-2 text-xs text-slate-500">Insertar variable:</div>
                                <div className="flex flex-wrap gap-1 mt-1 max-h-32 overflow-auto p-1 bg-slate-50 rounded border border-slate-200">
                                    {headers.map(h => (
                                        <button key={h} className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] hover:bg-indigo-50 hover:border-indigo-300" onClick={() => insertToFormula(h)}>
                                            {h}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors" onClick={handleAddCalculated}>
                                Crear Columna
                            </button>
                        </div>
                    )}

                    {activeTab === 'transform' && (
                        <div className="space-y-4">
                             <div className="bg-sky-50 p-3 rounded-lg border border-sky-100 text-xs text-sky-800">
                                <span className="font-bold">Info:</span> Modifica masivamente los datos de una columna existente. Esta acción sobrescribe los datos actuales.
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Columna a afectar</label>
                                <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm" value={trCol} onChange={e => setTrCol(e.target.value)}>
                                    <option value="">-- Seleccionar --</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Regla de transformación</label>
                                <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm" value={trRule} onChange={e => setTrRule(e.target.value as any)}>
                                    <option value="uppercase">A MAYÚSCULAS</option>
                                    <option value="lowercase">a minúsculas</option>
                                    <option value="trim">Limpiar espacios extremos (Trim)</option>
                                    <option value="replace">Reemplazar texto</option>
                                    <option value="multiply">Multiplicar por número</option>
                                </select>
                            </div>

                            {trRule === 'replace' && (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-500">Buscar (Regex permitida)</label>
                                        <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm" value={trParam1} onChange={e => setTrParam1(e.target.value)} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] text-slate-500">Reemplazar por</label>
                                        <input className="w-full border border-slate-300 rounded px-2 py-1 text-sm" value={trParam2} onChange={e => setTrParam2(e.target.value)} />
                                    </div>
                                </div>
                            )}

                             {trRule === 'multiply' && (
                                <div>
                                    <label className="block text-[10px] text-slate-500">Factor (Ej: 1000 para pasar Ton a Kg)</label>
                                    <input type="number" className="w-full border border-slate-300 rounded px-2 py-1 text-sm" value={trParam1} onChange={e => setTrParam1(e.target.value)} />
                                </div>
                            )}

                            <button className="w-full py-2 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-500 transition-colors" onClick={handleTransform}>
                                Aplicar Transformación
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 border-t border-slate-200 text-right">
                    <button className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
