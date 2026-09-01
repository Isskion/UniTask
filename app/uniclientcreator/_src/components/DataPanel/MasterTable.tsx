/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useCallback, useState, useRef } from 'react';
import { useAppStore } from '../../store/appStore';

// ─── Memoized Row ──────────────────────────────────────────────────────────────

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
    const formatCell = (val: any) => {
        if (val instanceof Date || Object.prototype.toString.call(val) === '[object Date]') {
            const yr = val.getFullYear();
            if (yr === 1899 || yr === 1900) {
                return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
            }
            return `${yr}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
        }
        return String(val ?? '');
    };

    const statusIcon = () => {
        switch (row._status) {
            case 'sending': return <span className="text-[10px] animate-spin-slow">⏳</span>;
            case 'success': return <span className="text-[10px]">✅</span>;
            case 'error': return <span className="text-[10px]" title={String(row._error || '')}>❌</span>;
            default: return null;
        }
    };

    // #23: Traffic light
    const validationLight = () => {
        if (!row._validationInfo) return <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>;
        const info = row._validationInfo as any;
        if (info.isValid && info.warnings === 0) return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" title="Fila válida"></span>;
        if (info.isValid && info.warnings > 0) return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]" title={`${info.warnings} advertencias`}></span>;
        return <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)] animate-pulse" title={`${info.errors} errores`}></span>;
    };

    const isGrouped = row._grouped === true;
    const itemCount = (row._itemCount as number) || 0;

    return (
        <tr
            className={`border-b cursor-pointer transition-all duration-100 ${isSelected
                ? 'bg-indigo-50/80 border-l-[3px] border-l-indigo-500 border-b-indigo-100'
                : isChecked
                    ? 'bg-sky-50/40 border-l-[3px] border-l-sky-400 border-b-sky-100/50'
                    : row._status === 'success'
                        ? 'bg-emerald-50/20 border-b-slate-100/60 hover:bg-emerald-50/40'
                        : row._status === 'error'
                            ? 'bg-red-50/20 border-b-slate-100/60 hover:bg-red-50/40'
                            : index % 2 === 0
                                ? 'bg-white border-b-slate-100/60 hover:bg-slate-50/80'
                                : 'bg-slate-50/20 border-b-slate-100/60 hover:bg-slate-100/40'
                }`}
            onClick={(e) => onRowClick(index, e)}
        >
            <td className="w-7 px-1 py-1 text-center">
                <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600"
                    checked={isChecked}
                    onChange={() => onToggle(index)}
                />
            </td>
            <td className="w-8 px-1 py-1 text-center">
                <div className="flex items-center justify-center gap-1">
                    {validationLight()}
                    {statusIcon()}
                    {/* #18: Grouping badge */}
                    {isGrouped && (
                        <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1 rounded-full border border-amber-200" title={`${itemCount} items agrupados`}>
                            {itemCount}
                        </span>
                    )}
                </div>
            </td>
            {headers.map((h) => (
                <td
                    key={h}
                    className="px-2 py-1 text-[11px] text-slate-600 whitespace-nowrap max-w-[180px] truncate font-medium"
                    onDoubleClick={(e) => onDoubleClick(index, h, e)}
                >
                    {formatCell((row as Record<string, any>)[h])}
                </td>
            ))}
        </tr>
    );
});

// import { validateOrderRow, buildDuplicateMap } from '../../utils/validation'; // not used in UniClientCreator
const validateOrderRow = (_row: any, _index: number, _mapping: any, _duplicateMap: any) => ({
    isValid: true,
    issues: [] as { severity: 'error' | 'warning'; message: string }[]
});
const buildDuplicateMap = (_rows: any[], _mapping: any) => new Map<string, number[]>();

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function MasterTable() {
    const rows = useAppStore((s) => s.rows);
    const headers = useAppStore((s) => s.headers);
    const selectedRow = useAppStore((s) => s.selectedRow);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const setSelectedRow = useAppStore((s) => s.setSelectedRow);
    const toggleSelection = useAppStore((s) => s.toggleSelection);
    const toggleSelectAll = useAppStore((s) => s.toggleSelectAll);
    const updateRowData = useAppStore((s) => s.updateRowData);
    const mapping = useAppStore((s) => s.mapping);
    const navigateToField = useAppStore((s) => s.navigateToField);

    // #2: Quick filter
    const [filterQuery, setFilterQuery] = useState('');
    // #6: Drag & Drop
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reverseMap = useMemo(() => {
        const map: Record<string, { short: string; full: string }[]> = {};
        for (const [field, col] of Object.entries(mapping)) {
            if (!col) continue;
            const key = String(col).trim().toLowerCase();
            if (!map[key]) map[key] = [];
            const short = field.split('.').pop() || field;
            map[key].push({ short, full: field });
        }
        return map;
    }, [mapping]);

    // #23, #32, #53: Inline row validation
    // validateOrderRow/buildDuplicateMap están desactivados (stub constante, ver arriba) —
    // NO dependen realmente de `mapping`. Antes sí figuraba en las deps de abajo y provocaba
    // reconstruir + re-renderizar TODAS las filas (sin virtualizar) en cada click del
    // Mapeador, congelando la UI con Excels grandes. Se recalcula solo si cambian
    // rows/duplicateMap para que, si algún día se reactiva la validación real, siga siendo correcto.
    const duplicateMap = useMemo(() => buildDuplicateMap(rows as Record<string, string>[], mapping), [rows, mapping]);

    // Filtered rows with injected validation info
    const filteredRows = useMemo(() => {
        let baseRows = rows.map((r, i) => {
            const validation = validateOrderRow(r as Record<string, string>, i, mapping, duplicateMap);
            const errors = validation.issues.filter(iss => iss.severity === 'error').length;
            const warnings = validation.issues.filter(iss => iss.severity === 'warning').length;

            // We mutate a shallow copy or inject directly if allowed. To avoid React state mutation issues, we clone IF needed,
            // but we can just pass an enriched object to the view logic.
            return {
                originalIndex: i,
                row: {
                    ...r,
                    _validationInfo: { isValid: validation.isValid, errors, warnings }
                }
            };
        });

        if (!filterQuery.trim()) return baseRows;

        const q = filterQuery.toLowerCase();
        return baseRows.filter(({ row }) =>
            headers.some((h) => String((row as Record<string, any>)[h] ?? '').toLowerCase().includes(q))
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mapping/duplicateMap excluidos a propósito: ver comentario arriba
    }, [rows, headers, filterQuery]);

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

    // #6: Drag & Drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.match(/\.(xlsx?|xls)$/i)) {
                // Trigger file load through the hidden input in the parent
                // We dispatch a custom event that page.tsx can listen to
                const event = new CustomEvent('excel-drop', { detail: { file } });
                window.dispatchEvent(event);
            }
        }
    }, []);

    // Empty state with Drag & Drop zone
    if (rows.length === 0) {
        return (
            <div
                className={`flex flex-col items-center justify-center h-full p-8 text-center transition-all duration-300 ${isDragOver
                    ? 'bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-dashed border-indigo-300 rounded-2xl'
                    : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className={`transition-all duration-300 ${isDragOver ? 'scale-110 -translate-y-1' : ''}`}>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
                        <span className="text-3xl opacity-50">{isDragOver ? '📥' : '📋'}</span>
                    </div>
                    <p className="text-sm text-slate-600 font-semibold mb-1">
                        {isDragOver ? '¡Suelta el archivo aquí!' : 'Arrastra un archivo Excel aquí'}
                    </p>
                    <p className="text-xs text-slate-400">o usa el botón 📂 del menú superior</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex-1 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag overlay */}
            {isDragOver && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-indigo-50/90 border-2 border-dashed border-indigo-400 rounded-xl">
                    <div className="text-center">
                        <div className="text-4xl mb-2">📂</div>
                        <p className="text-sm font-bold text-indigo-600">Suelta para reemplazar datos</p>
                    </div>
                </div>
            )}

            {/* #2: Quick filter bar */}
            {rows.length > 5 && (
                <div className="sticky top-0 z-10 px-2 py-1 bg-white/95 backdrop-blur-sm border-b border-slate-100">
                    <input
                        type="text"
                        className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400"
                        placeholder="🔍 Filtrar filas... (busca en todas las columnas)"
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                    />
                    {filterQuery && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-500">
                            {filteredRows.length}/{rows.length}
                        </span>
                    )}
                </div>
            )}

            <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10" style={{ top: rows.length > 5 ? '32px' : '0' }}>
                    <tr className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
                        <th className="w-7 px-1 py-1.5 text-center">
                            <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600"
                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                checked={selectedIndices.size === rows.length && rows.length > 0}
                            />
                        </th>
                        <th className="w-8 px-1 py-1.5 text-center text-[10px] font-bold text-slate-400">#</th>
                        {headers.map((h) => {
                            const matchKey = String(h).trim().toLowerCase();
                            const mappedList = reverseMap[matchKey];
                            const isMapped = !!mappedList;
                            return (
                                <th
                                    key={h}
                                    className={`px-2 py-1.5 text-left text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors ${
                                        isMapped 
                                            ? 'font-extrabold text-indigo-700 bg-indigo-50/60 border-b-2 border-b-indigo-500 cursor-pointer hover:bg-indigo-100/60' 
                                            : 'font-semibold text-slate-500 hover:bg-slate-50'
                                    }`}
                                    onClick={isMapped && mappedList?.length ? () => navigateToField(mappedList[0].full) : undefined}
                                    title={isMapped && mappedList?.length ? `Mapeado a: ${mappedList.map((f) => f.full).join(', ')} (Click para ir a campo)` : undefined}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {h}
                                        {isMapped && <span className="text-[8px] text-indigo-400">●</span>}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {filteredRows.map(({ row, originalIndex }) => (
                        <TableRow
                            key={originalIndex}
                            row={row}
                            index={originalIndex}
                            headers={headers}
                            isSelected={selectedRow === originalIndex}
                            isChecked={selectedIndices.has(originalIndex)}
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
