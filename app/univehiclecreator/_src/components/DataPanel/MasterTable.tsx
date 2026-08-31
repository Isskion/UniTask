import React, { useCallback } from 'react';
import { useAppStore } from '../../store/appStore';

/* Memoized row component — prevents re-rendering ALL rows when only one changes */
const TableRow = React.memo(function TableRow({
    row, index, headers, isSelected, isChecked, onRowClick, onToggle, onDoubleClick,
}: {
    row: Record<string, unknown>;
    index: number;
    headers: string[];
    isSelected: boolean;
    isChecked: boolean;
    onRowClick: (i: number, e: React.MouseEvent) => void;
    onToggle: (i: number) => void;
    onDoubleClick: (ri: number, h: string, e: React.MouseEvent) => void;
}) {
    const statusIcon = () => {
        switch (row._status) {
            case 'sending': return <span className="text-[10px] animate-spin-slow">⏳</span>;
            case 'success': return <span className="text-[10px]" title={row._serverResponse ? String(row._serverResponse) : 'Creado con éxito'}>✅</span>;
            case 'error': return <span className="text-[10px] text-red-500 cursor-help" title={row._error ? String(row._error) : 'Error'}>❌</span>;
            default: return <span className="text-[8px] text-slate-300">⚪</span>;
        }
    };

    return (
        <tr
            className={`border-b border-slate-100 cursor-pointer transition-colors ${isSelected
                ? 'bg-indigo-50/80 border-l-2 border-l-indigo-500'
                : isChecked
                    ? 'bg-sky-50/40'
                    : index % 2 === 0
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-slate-50/20 hover:bg-slate-50'
                }`}
            onClick={(e) => onRowClick(index, e)}
        >
            <td className="w-7 px-2 py-1 text-center">
                <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600"
                    checked={isChecked}
                    onChange={() => onToggle(index)}
                />
            </td>
            <td className="w-8 px-1 py-1 text-center">{statusIcon()}</td>
            {headers.map((h) => (
                <td
                    key={h}
                    className="px-2 py-1 text-[11px] text-slate-700 whitespace-nowrap max-w-[180px] truncate"
                    onDoubleClick={(e) => onDoubleClick(index, h, e)}
                >
                    {String(row[h] ?? '')}
                </td>
            ))}
        </tr>
    );
});

export default function MasterTable() {
    const rows = useAppStore((s) => s.rows);
    const headers = useAppStore((s) => s.headers);
    const selectedRow = useAppStore((s) => s.selectedRow);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const setSelectedRow = useAppStore((s) => s.setSelectedRow);
    const toggleSelection = useAppStore((s) => s.toggleSelection);
    const toggleSelectAll = useAppStore((s) => s.toggleSelectAll);
    const updateRowData = useAppStore((s) => s.updateRowData);

    const handleRowClick = useCallback((index: number, e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        setSelectedRow(index);
    }, [setSelectedRow]);

    const handleCellDoubleClick = useCallback((rowIndex: number, header: string, e: React.MouseEvent) => {
        const td = e.currentTarget as HTMLTableCellElement;
        const currentValue = String(rows[rowIndex]?.[header] ?? '');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'w-full px-1 py-0.5 text-[11px] border border-indigo-400 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50';
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
            if (ke.key === 'Escape') td.textContent = currentValue;
        };
    }, [rows, updateRowData]);

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="text-3xl mb-2 opacity-30">📋</div>
                <p className="text-xs text-slate-400">Carga un archivo Excel para comenzar</p>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full">
            <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-900 text-slate-200">
                    <tr className="border-b border-slate-700">
                        <th className="w-7 px-2 py-2 text-center">
                            <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600"
                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                checked={selectedIndices.size === rows.length && rows.length > 0}
                            />
                        </th>
                        <th className="w-8 px-1 py-2 text-center text-[10px] font-bold text-slate-400">#</th>
                        {headers.map((h) => (
                            <th
                                key={h}
                                className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-slate-300"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <TableRow
                            key={i}
                            row={row}
                            index={i}
                            headers={headers}
                            isSelected={selectedRow === i}
                            isChecked={selectedIndices.has(i)}
                            onRowClick={handleRowClick}
                            onToggle={toggleSelection}
                            onDoubleClick={handleCellDoubleClick}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
