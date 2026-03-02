/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';

export default function DetailPanel() {
    const rows = useAppStore((s) => s.rows);
    const selectedRow = useAppStore((s) => s.selectedRow);
    const mapping = useAppStore((s) => s.mapping);
    const navigateToField = useAppStore((s) => s.navigateToField);

    const reverseMap = useMemo(() => {
        const map: Record<string, { short: string; full: string }[]> = {};
        for (const [field, col] of Object.entries(mapping)) {
            if (!col) continue;
            if (!map[col]) map[col] = [];
            const short = field.split('.').pop() || field;
            map[col].push({ short, full: field });
        }
        return map;
    }, [mapping]);

    if (selectedRow < 0 || !rows[selectedRow]) return null;

    const row = rows[selectedRow];
    const items: Record<string, any>[] = row._items || [];
    const isGrouped = row._grouped === true;

    if (!isGrouped && items.length === 0) return null;

    // Collect all unique keys from the items
    const itemHeaders = items.length > 0
        ? Array.from(new Set(items.flatMap((item) => Object.keys(item))))
        : [];

    return (
        <div className="flex flex-col backdrop-blur-sm bg-white/60 border-t border-slate-200">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-transparent border-b border-slate-100">
                <span className="text-sm font-bold text-slate-700">📋 Items del Pedido (Fila {selectedRow + 1})</span>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200/50">
                    {items.length} items
                </span>
            </div>

            {items.length === 0 ? (
                <div className="flex items-center justify-center p-6 text-sm text-slate-500 italic">
                    Este pedido agrupado no tiene items aún. Usa &quot;Agrupar Pedidos&quot; para consolidar.
                </div>
            ) : (
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gradient-to-r from-amber-50 to-orange-50/50 border-b border-amber-200/50">
                                <th className="w-10 p-2 text-center text-xs font-bold text-amber-700 uppercase">#</th>
                                {itemHeaders.map((h) => (
                                    <th
                                        key={h}
                                        className={`p-2 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${reverseMap[h] ? 'text-indigo-700' : 'text-amber-700/70'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            {h}
                                            {reverseMap[h] && (
                                                <button
                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 transition-colors cursor-pointer"
                                                    title={reverseMap[h].map(f => f.full).join(', ')}
                                                    onClick={(e) => { e.stopPropagation(); navigateToField(reverseMap[h][0].full); }}
                                                >
                                                    ↗ {reverseMap[h][0].short}
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'}`}>
                                    <td className="w-10 p-2 text-center text-xs font-mono text-slate-500">{i + 1}</td>
                                    {itemHeaders.map((h) => (
                                        <td key={h} className="p-2 text-sm text-slate-700 whitespace-nowrap max-w-[180px] truncate">
                                            {String(item[h] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
