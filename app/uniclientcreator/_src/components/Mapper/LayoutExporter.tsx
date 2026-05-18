"use client";
import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../../store/appStore';
import { FIELD_GROUPS } from '../../data/schema';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'export' | 'import';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a human-friendly header name from the schema field path */
function fieldPathToHeader(path: string): string {
    // "Orden.Cliente.RefCliente" → "RefCliente"
    const parts = path.split('.');
    return parts[parts.length - 1];
}

/** Group mapped fields by their schema section */
function groupMappedFields(mapping: Record<string, string>): { section: string; fields: { path: string; excelCol: string }[] }[] {
    const groups: Record<string, { path: string; excelCol: string }[]> = {};
    for (const [fieldPath, excelCol] of Object.entries(mapping)) {
        if (!excelCol || excelCol === '__BOOL_TRUE__' || excelCol === '__BOOL_FALSE__') continue;
        // find the section this field belongs to  
        let section = 'Otros';
        for (const [tabId, fields] of Object.entries(FIELD_GROUPS)) {
            if (fields.includes(fieldPath)) {
                section = tabId;
                break;
            }
        }
        if (!groups[section]) groups[section] = [];
        groups[section].push({ path: fieldPath, excelCol });
    }
    return Object.entries(groups).map(([section, fields]) => ({ section, fields }));
}

export default function LayoutExporter({ isOpen, onClose, initialMode = 'export' }: Props) {
    const mapping = useAppStore((s) => s.mapping);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const dynamicFieldCounts = useAppStore((s) => s.dynamicFieldCounts);
    const rows = useAppStore((s) => s.rows);
    const headers = useAppStore((s) => s.headers);
    const setMapping = useAppStore((s) => s.setMapping);

    const [templateName, setTemplateName] = useState('');
    const [includeSampleData, setIncludeSampleData] = useState(true);
    const [includeFieldPaths, setIncludeFieldPaths] = useState(true);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialMode);
    const [importing, setImporting] = useState(false);

    // Gather all mapped columns (non-bool)
    const mappedEntries = Object.entries(mapping).filter(
        ([, v]) => v && v !== '__BOOL_TRUE__' && v !== '__BOOL_FALSE__'
    );
    const mappedCount = mappedEntries.length;
    const boolCount = Object.keys(booleanOverrides).length;
    const groupedFields = groupMappedFields(mapping);

    // ─── Export Excel Layout ──────────────────────────────────────────
    const handleExport = useCallback(() => {
        if (mappedEntries.length === 0) {
            setFeedback({ type: 'error', msg: 'No hay campos mapeados para exportar.' });
            return;
        }

        const wb = XLSX.utils.book_new();

        // --- Sheet 1: DATA LAYOUT ---
        const layoutHeaders = mappedEntries.map(([, excelCol]) => excelCol);
        const sheetData: (string | number)[][] = [layoutHeaders];

        // Optional: Field path descriptions row (row 2)
        if (includeFieldPaths) {
            const pathRow = mappedEntries.map(([fieldPath]) => fieldPath);
            sheetData.push(pathRow);
        }

        // Optional: Sample data row from first data row
        if (includeSampleData && rows.length > 0) {
            const sampleRow = mappedEntries.map(([, excelCol]) => {
                const val = rows[0][excelCol];
                return val !== undefined && val !== null ? String(val) : '';
            });
            sheetData.push(sampleRow);
        }

        const wsLayout = XLSX.utils.aoa_to_sheet(sheetData);

        // Style: Set column widths based on header length
        wsLayout['!cols'] = layoutHeaders.map((h) => ({
            wch: Math.max(h.length + 4, 14),
        }));

        XLSX.utils.book_append_sheet(wb, wsLayout, 'Plantilla');

        // --- Sheet 2: MAPPING METADATA (hidden) ---
        const metaRows: string[][] = [
            ['__UNITASK_LAYOUT_V1__'],
            ['Campo UNIGIS', 'Columna Excel', 'Tipo'],
        ];
        for (const [fieldPath, excelCol] of Object.entries(mapping)) {
            if (!excelCol) continue;
            const type = excelCol === '__BOOL_TRUE__' || excelCol === '__BOOL_FALSE__' ? 'boolean' : 'column';
            metaRows.push([fieldPath, excelCol, type]);
        }
        // Include boolean overrides
        metaRows.push([]);
        metaRows.push(['__BOOLEAN_OVERRIDES__']);
        for (const [field, value] of Object.entries(booleanOverrides)) {
            metaRows.push([field, String(value)]);
        }
        // Include dynamic field counts
        metaRows.push([]);
        metaRows.push(['__DYNAMIC_FIELD_COUNTS__']);
        for (const [section, count] of Object.entries(dynamicFieldCounts)) {
            metaRows.push([section, String(count)]);
        }
        // Include multi-sheet config
        if (false && { mainSheet: '', mainKey: '', relations: [] }.mainSheet) {
            metaRows.push([]);
            metaRows.push(['__MULTI_SHEET_CONFIG__']);
            metaRows.push(['mainSheet', { mainSheet: '', mainKey: '', relations: [] }.mainSheet]);
            metaRows.push(['mainKey', { mainSheet: '', mainKey: '', relations: [] }.mainKey]);
            for (const rel of { mainSheet: '', mainKey: '', relations: [] }.relations) {
                metaRows.push(['relation', rel.sheet, rel.key, rel.targetPath, rel.itemTag]);
            }
        }

        const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
        XLSX.utils.book_append_sheet(wb, wsMeta, '_mapping');

        // Generate filename
        const datePart = new Date().toISOString().slice(0, 10);
        const namePart = templateName.trim()
            ? templateName.trim().replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s_-]/g, '').replace(/\s+/g, '_')
            : 'layout';
        const filename = `UniTask_${namePart}_${datePart}.xlsx`;

        XLSX.writeFile(wb, filename);
        setFeedback({ type: 'success', msg: `✅ Plantilla "${filename}" exportada correctamente` });
        setTimeout(() => setFeedback(null), 4000);
    }, [mappedEntries, rows, mapping, booleanOverrides, dynamicFieldCounts, templateName, includeSampleData, includeFieldPaths]);

    // ─── Import Excel Layout ──────────────────────────────────────────
    const handleImport = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            setImporting(true);
            try {
                const data = await file.arrayBuffer();
                const wb = XLSX.read(data, { type: 'array' });

                // Look for the _mapping metadata sheet
                const metaSheet = wb.Sheets['_mapping'];
                if (!metaSheet) {
                    setFeedback({ type: 'error', msg: '❌ Este archivo no parece ser una plantilla de UniTask. Falta la hoja "_mapping".' });
                    setImporting(false);
                    return;
                }

                const metaData = XLSX.utils.sheet_to_json<string[]>(metaSheet, { header: 1 });

                // Validate magic header
                if (!metaData[0] || metaData[0][0] !== '__UNITASK_LAYOUT_V1__') {
                    setFeedback({ type: 'error', msg: '❌ Formato de plantilla no reconocido.' });
                    setImporting(false);
                    return;
                }

                // Parse mapping
                const newMapping: Record<string, string> = {};
                const newBoolOverrides: Record<string, boolean> = {};
                const newDynCounts: Record<string, number> = {};
                let section = 'mapping';

                for (let i = 2; i < metaData.length; i++) {
                    const row = metaData[i];
                    if (!row || row.length === 0) continue;

                    const firstCell = String(row[0] || '');

                    if (firstCell === '__BOOLEAN_OVERRIDES__') {
                        section = 'booleans';
                        continue;
                    }
                    if (firstCell === '__DYNAMIC_FIELD_COUNTS__') {
                        section = 'dynamic';
                        continue;
                    }
                    if (firstCell === '__MULTI_SHEET_CONFIG__') {
                        // multisheet section removed
                        continue;
                    }

                    if (section === 'mapping' && row[0] && row[1]) {
                        newMapping[String(row[0])] = String(row[1]);
                    }
                    if (section === 'booleans' && row[0]) {
                        newBoolOverrides[String(row[0])] = row[1] === 'true';
                    }
                    if (section === 'dynamic' && row[0] && row[1]) {
                        newDynCounts[String(row[0])] = parseInt(String(row[1])) || 0;
                    }
                    // Multi-sheet restoration could be added here
                }

                // Apply mapping
                setMapping(newMapping);
                const store = useAppStore.getState();
                if (Object.keys(newBoolOverrides).length > 0) {
                    for (const [k, v] of Object.entries(newBoolOverrides)) {
                        store.setBooleanOverride(k, v);
                    }
                }
                if (Object.keys(newDynCounts).length > 0) {
                    for (const [k, v] of Object.entries(newDynCounts)) {
                        store.setDynamicFieldCount(k, v);
                    }
                }

                const loadedCount = Object.values(newMapping).filter(v => v && v !== '__BOOL_TRUE__' && v !== '__BOOL_FALSE__').length;
                setFeedback({ type: 'success', msg: `✅ Plantilla importada: ${loadedCount} campos mapeados restaurados` });
                setTimeout(() => setFeedback(null), 5000);
            } catch (err: any) {
                console.error('[LayoutImport] Error:', err);
                setFeedback({ type: 'error', msg: `❌ Error al importar: ${err.message}` });
            } finally {
                setImporting(false);
            }
        };
        input.click();
    }, [setMapping]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-500">
                    <h2 className="text-lg font-bold text-white">📋 Plantilla Excel de Layout</h2>
                    <p className="text-sm text-emerald-100 mt-0.5">Exporta e importa configuraciones de mapeo como ficheros Excel</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        className={`flex-1 py-2.5 text-sm font-semibold transition-all ${activeTab === 'export'
                            ? 'text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        onClick={() => setActiveTab('export')}
                    >
                        📥 Exportar Layout
                    </button>
                    <button
                        className={`flex-1 py-2.5 text-sm font-semibold transition-all ${activeTab === 'import'
                            ? 'text-teal-700 border-b-2 border-teal-500 bg-teal-50/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        onClick={() => setActiveTab('import')}
                    >
                        📤 Importar Layout
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* ─── EXPORT TAB ─── */}
                    {activeTab === 'export' && (
                        <>
                            {/* Stats */}
                            <div className="flex gap-3">
                                <div className="flex-1 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                                    <div className="text-2xl font-black text-emerald-600">{mappedCount}</div>
                                    <div className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Columnas</div>
                                </div>
                                <div className="flex-1 p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                                    <div className="text-2xl font-black text-indigo-600">{boolCount}</div>
                                    <div className="text-[10px] text-indigo-500 font-medium uppercase tracking-wider">Booleanos</div>
                                </div>
                                <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-slate-600">{headers.length}</div>
                                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Excel Cols</div>
                                </div>
                            </div>

                            {/* Template Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nombre de la plantilla</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                                    placeholder="Ej: Europastry Pedidos Diarios"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                />
                            </div>

                            {/* Options */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={includeFieldPaths}
                                        onChange={(e) => setIncludeFieldPaths(e.target.checked)}
                                        className="w-4 h-4 accent-emerald-500 rounded"
                                    />
                                    <div>
                                        <div className="text-sm font-semibold text-slate-700">Incluir rutas de campos</div>
                                        <div className="text-[10px] text-slate-500">Añade una fila con las rutas UNIGIS (Orden.Cliente.RefCliente...)</div>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={includeSampleData}
                                        onChange={(e) => setIncludeSampleData(e.target.checked)}
                                        className="w-4 h-4 accent-emerald-500 rounded"
                                    />
                                    <div>
                                        <div className="text-sm font-semibold text-slate-700">Incluir fila de ejemplo</div>
                                        <div className="text-[10px] text-slate-500">Añade una fila con datos de la primera entrada como referencia</div>
                                    </div>
                                </label>
                            </div>

                            {/* Mapped Fields Preview */}
                            {groupedFields.length > 0 && (
                                <div className="space-y-1.5">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Campos incluidos</h3>
                                    <div className="max-h-36 overflow-auto rounded-xl border border-slate-200 bg-slate-50">
                                        {groupedFields.map((group) => (
                                            <div key={group.section} className="border-b border-slate-100 last:border-0">
                                                <div className="px-3 py-1.5 bg-slate-100/80 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0">
                                                    {group.section} ({group.fields.length})
                                                </div>
                                                <div className="px-3 py-1 flex flex-wrap gap-1">
                                                    {group.fields.map(({ path, excelCol }) => (
                                                        <span
                                                            key={path}
                                                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-600"
                                                            title={`${path} → ${excelCol}`}
                                                        >
                                                            <span className="font-medium text-slate-800">{excelCol}</span>
                                                            <span className="text-slate-300">→</span>
                                                            <span className="text-emerald-600">{fieldPathToHeader(path)}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Export Button */}
                            <button
                                className="w-full flex items-center justify-center gap-2.5 py-3 text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                                onClick={handleExport}
                                disabled={mappedCount === 0}
                            >
                                📥 Exportar Layout Excel ({mappedCount} columnas)
                            </button>
                        </>
                    )}

                    {/* ─── IMPORT TAB ─── */}
                    {activeTab === 'import' && (
                        <>
                            <div className="p-6 text-center space-y-4">
                                <div className="w-16 h-16 mx-auto bg-teal-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-teal-200">
                                    <span className="text-3xl">📤</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-700">Importar una Plantilla</h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Carga un fichero <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">UniTask_*.xlsx</code> previamente exportado para restaurar la configuración de mapeo.
                                    </p>
                                </div>
                                <button
                                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-400 hover:to-cyan-400 shadow-lg shadow-teal-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
                                    onClick={handleImport}
                                    disabled={importing}
                                >
                                    {importing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Importando...
                                        </>
                                    ) : (
                                        <>📂 Seleccionar Archivo Excel</>
                                    )}
                                </button>
                                <div className="text-[10px] text-slate-400 space-y-1">
                                    <p>Se restaurarán: mapeo de columnas, booleanos, campos dinámicos y configuración multi-hoja.</p>
                                    <p className="font-medium text-amber-500">⚠️ El mapeo actual será reemplazado.</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Feedback */}
                    {feedback && (
                        <div className={`p-3 rounded-xl text-sm font-medium text-center transition-all ${feedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : feedback.type === 'info'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {feedback.msg}
                        </div>
                    )}
                </div>

                {/* Footer */}
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
