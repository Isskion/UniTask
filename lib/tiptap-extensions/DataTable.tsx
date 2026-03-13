"use client";

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

function DataTableView({ node }: NodeViewProps) {
    const headers: string[] = node.attrs.headers ?? [];
    const rows: string[][] = node.attrs.rows ?? [];
    const [filters, setFilters] = useState<Record<number, string>>({});

    const filteredRows = useMemo(() => {
        return rows.filter(row =>
            headers.every((_, i) => {
                const filter = (filters[i] ?? '').toLowerCase();
                return !filter || String(row[i] ?? '').toLowerCase().includes(filter);
            })
        );
    }, [rows, headers, filters]);

    const hasActiveFilters = Object.values(filters).some(v => v.length > 0);

    return (
        <NodeViewWrapper>
            <div className="my-4 rounded-xl border border-border overflow-hidden" contentEditable={false}>
                {/* Header bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Search className="w-3 h-3" />
                        Tabla importada
                    </span>
                    {hasActiveFilters && (
                        <button
                            onClick={() => setFilters({})}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            <X className="w-3 h-3" /> Limpiar filtros
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr>
                                {headers.map((h, i) => (
                                    <th key={i} className="bg-muted border-b border-border px-3 pt-2 pb-1.5 min-w-[120px]">
                                        <div className="font-semibold text-foreground mb-1.5 truncate" title={h}>
                                            {h || <span className="text-muted-foreground italic">Col {i + 1}</span>}
                                        </div>
                                        <input
                                            type="text"
                                            value={filters[i] ?? ''}
                                            onChange={e => setFilters(prev => ({ ...prev, [i]: e.target.value }))}
                                            placeholder="Filtrar..."
                                            className="w-full text-xs px-2 py-1 rounded-md border border-border bg-background outline-none focus:border-primary/60 font-normal placeholder:text-muted-foreground/50 transition-colors"
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row, ri) => (
                                <tr key={ri} className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                                    {headers.map((_, i) => (
                                        <td key={i} className="px-3 py-2 text-foreground">
                                            {String(row[i] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={headers.length} className="text-center text-muted-foreground px-3 py-8 text-xs">
                                        Sin resultados para los filtros aplicados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 border-t border-border">
                    {hasActiveFilters
                        ? `${filteredRows.length} de ${rows.length} filas`
                        : `${rows.length} filas · ${headers.length} columnas`
                    }
                </div>
            </div>
        </NodeViewWrapper>
    );
}

export const DataTable = Node.create({
    name: 'dataTable',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            headers: {
                default: [],
                parseHTML: el => {
                    try { return JSON.parse(el.getAttribute('data-headers') || '[]'); } catch { return []; }
                },
                renderHTML: attrs => ({ 'data-headers': JSON.stringify(attrs.headers) }),
            },
            rows: {
                default: [],
                parseHTML: el => {
                    try { return JSON.parse(el.getAttribute('data-rows') || '[]'); } catch { return []; }
                },
                renderHTML: attrs => ({ 'data-rows': JSON.stringify(attrs.rows) }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="data-table"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'data-table' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(DataTableView);
    },
});
