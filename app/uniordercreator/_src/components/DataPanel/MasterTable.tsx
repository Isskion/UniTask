import { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';

export default function MasterTable() {
    const rows = useAppStore((s) => s.rows);
    const headers = useAppStore((s) => s.headers);
    const mapping = useAppStore((s) => s.mapping);
    const navigateToField = useAppStore((s) => s.navigateToField);
    const selectedRow = useAppStore((s) => s.selectedRow);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const setSelectedRow = useAppStore((s) => s.setSelectedRow);
    const toggleSelection = useAppStore((s) => s.toggleSelection);
    const toggleSelectAll = useAppStore((s) => s.toggleSelectAll);
    const updateRowData = useAppStore((s) => s.updateRowData);

    // Reverse mapping: Excel column → { short name, full path }[]
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

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-4xl mb-4 shadow-inner">
                    📋
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Sin datos</h3>
                <p className="text-sm text-slate-500">Carga un archivo Excel para comenzar</p>
            </div>
        );
    }

    const handleRowClick = (index: number, e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        setSelectedRow(index);
    };

    const handleCellDoubleClick = (rowIndex: number, header: string, e: React.MouseEvent) => {
        const td = e.currentTarget as HTMLTableCellElement;
        const currentValue = String(rows[rowIndex][header] ?? '');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'w-full px-2 py-1 text-sm border border-indigo-400 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50';
        td.textContent = '';
        td.appendChild(input);
        input.focus();
        input.select();

        const finish = () => {
            updateRowData(rowIndex, header, input.value);
            td.textContent = input.value;
        };

        input.onblur = finish;
        input.onkeydown = (ke) => {
            if (ke.key === 'Enter') finish();
            if (ke.key === 'Escape') {
                td.textContent = currentValue;
            }
        };
    };

    const statusIcon = (row: Record<string, unknown>) => {
        switch (row._status) {
            case 'sending':
                return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs animate-spin-slow">⏳</span>;
            case 'success':
                return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs shadow-sm shadow-emerald-200">✅</span>;
            case 'error':
                return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs shadow-sm shadow-red-200">❌</span>;
            default:
                return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs">⚪</span>;
        }
    };

    return (
        <div className="overflow-auto flex-1">
            <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                        <th className="w-10 p-2 text-center">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/50 cursor-pointer accent-indigo-600"
                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                checked={selectedIndices.size === rows.length && rows.length > 0}
                            />
                        </th>
                        <th className="w-12 p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                        {headers.map((h) => (
                            <th
                                key={h}
                                className={`p-2 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${reverseMap[h] ? 'text-indigo-700 bg-indigo-50/50' : 'text-slate-500'
                                    }`}
                            >
                                <div className="flex items-center gap-1.5">
                                    {h}
                                    {reverseMap[h] && (
                                        <button
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 hover:text-indigo-700 transition-colors cursor-pointer border border-indigo-200/50"
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
                    {rows.map((row, i) => (
                        <tr
                            key={i}
                            className={`border-b border-slate-100 cursor-pointer transition-all duration-150 ${selectedRow === i
                                    ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                                    : selectedIndices.has(i)
                                        ? 'bg-sky-50/50'
                                        : i % 2 === 0
                                            ? 'bg-white hover:bg-slate-50'
                                            : 'bg-slate-50/30 hover:bg-slate-100/60'
                                }`}
                            onClick={(e) => handleRowClick(i, e)}
                        >
                            <td className="w-10 p-2 text-center">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/50 cursor-pointer accent-indigo-600"
                                    checked={selectedIndices.has(i)}
                                    onChange={() => toggleSelection(i)}
                                />
                            </td>
                            <td className="w-12 p-2 text-center">{statusIcon(row)}</td>
                            {headers.map((h) => (
                                <td
                                    key={h}
                                    className="p-2 text-sm text-slate-700 whitespace-nowrap max-w-[200px] truncate"
                                    onDoubleClick={(e) => handleCellDoubleClick(i, h, e)}
                                >
                                    {String(row[h] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
