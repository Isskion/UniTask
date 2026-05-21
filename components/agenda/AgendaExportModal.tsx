"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { X, ChevronUp, ChevronDown, FileSpreadsheet, FileText, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgendaEntry } from "@/types/agenda";
import { useLanguage } from "@/context/LanguageContext";
import { formatHours } from "@/lib/agenda-utils";

// ─── Column registry ──────────────────────────────────────────────────────────

interface ColDef {
    key:     string;
    label:   string;
    width:   number;   // for Excel column width
    enabled: boolean;  // default on/off
}

const ALL_COLS: ColDef[] = [
    { key: 'fecha',       label: 'Fecha',          width: 13, enabled: true  },
    { key: 'consultor',   label: 'Consultor',      width: 22, enabled: true  },
    { key: 'actividad',   label: 'Actividad',      width: 22, enabled: true  },
    { key: 'cliente',     label: 'Cliente',        width: 24, enabled: true  },
    { key: 'descripcion', label: 'Descripción',    width: 32, enabled: true  },
    { key: 'horario',     label: 'Horario',        width: 14, enabled: true  },
    { key: 'horas',       label: 'Horas',          width: 8,  enabled: true  },
    { key: 'estado',      label: 'Estado',         width: 14, enabled: true  },
    { key: 'proyecto',    label: 'Proyecto',       width: 22, enabled: true  },
    { key: 'codProyecto', label: 'Cód. Proyecto',  width: 14, enabled: true  },
    { key: 'division',    label: 'División',       width: 18, enabled: false },
    { key: 'dia',         label: 'Día semana',     width: 13, enabled: false },
    { key: 'region',      label: 'Región',         width: 14, enabled: false },
    { key: 'semana',      label: 'Semana',         width: 18, enabled: false },
    { key: 'jiraRecord',  label: 'Registro Jira',  width: 40, enabled: false },
];

function getVal(e: AgendaEntry, key: string, dateObj: Date): string {
    switch (key) {
        case 'fecha':       return format(dateObj, 'dd/MM/yyyy');
        case 'dia':         return format(dateObj, 'EEEE', { locale: es });
        case 'consultor':   return e.consultantName;
        case 'region':      return e.region        || '';
        case 'division':    return e.divisionName  || '';
        case 'actividad':   return e.activityType;
        case 'cliente':     return e.client;
        case 'descripcion': return e.description;
        case 'horario':     return e.scheduleRaw;
        case 'horas':       return String(e.scheduledHours);
        case 'estado':      return e.result;
        case 'proyecto':    return e.projectName   || '';
        case 'codProyecto': return e.projectCode   || '';
        case 'semana':      return e.weekMonth;
        case 'jiraRecord':  return e.jiraRecord;
        default:            return '';
    }
}

// ─── Serializers ──────────────────────────────────────────────────────────────

function csvEsc(v: string): string {
    return (v.includes(';') || v.includes('"') || v.includes('\n'))
        ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

type ExportFormat = 'excel' | 'csv' | 'txt';

interface Props {
    entries:    AgendaEntry[];
    totalHours: number;
    weekLabel:  string;
    onClose:    () => void;
}

export function AgendaExportModal({ entries, totalHours, weekLabel, onClose }: Props) {
    const { t } = useLanguage();
    const [cols,        setCols]        = useState<ColDef[]>(ALL_COLS.map(c => ({ ...c })));
    const [fmt,         setFmt]         = useState<ExportFormat>('excel');
    const [isExporting, setIsExporting] = useState(false);

    const enabled = cols.filter(c => c.enabled);
    const slug    = weekLabel.replace(/[^\w-]/g, '_');

    // ── Column controls ────────────────────────────────────────────────────────
    const toggle    = (key: string) => setCols(p => p.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c));
    const selectAll = ()            => setCols(p => p.map(c => ({ ...c, enabled: true  })));
    const clearAll  = ()            => setCols(p => p.map(c => ({ ...c, enabled: false })));
    const moveUp    = (i: number)   => {
        if (i === 0) return;
        setCols(p => { const n = [...p]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; });
    };
    const moveDown  = (i: number)   => {
        if (i === cols.length - 1) return;
        setCols(p => { const n = [...p]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; });
    };

    // ── Export ─────────────────────────────────────────────────────────────────
    async function doExport() {
        if (enabled.length === 0) return;
        setIsExporting(true);
        try {
            const rows = entries.map(e => {
                const d = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string);
                return enabled.map(c => getVal(e, c.key, d));
            });

            if (fmt === 'excel') {
                const ExcelJS = (await import('exceljs')).default;
                const wb      = new ExcelJS.Workbook();
                wb.creator    = 'UniTask';
                const ws      = wb.addWorksheet('Agenda');

                ws.columns = enabled.map(c => ({ header: c.label, key: c.key, width: c.width }));

                const hRow = ws.getRow(1);
                hRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
                hRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
                hRow.alignment = { vertical: 'middle', horizontal: 'center' };
                hRow.height    = 22;

                rows.forEach((row, ri) => {
                    const obj: Record<string, string | number> = {};
                    enabled.forEach((c, ci) => { obj[c.key] = c.key === 'horas' ? parseFloat(row[ci]) || 0 : row[ci]; });
                    const wsRow = ws.addRow(obj);
                    wsRow.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: ri % 2 === 0 ? 'FFF0F0FF' : 'FFFFFFFF' } };
                    wsRow.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
                });

                // Total footer only when 'horas' column is present
                const horasIdx = enabled.findIndex(c => c.key === 'horas');
                if (horasIdx >= 0) {
                    const tot: Record<string, string | number> = {};
                    enabled.forEach((c, i) => { tot[c.key] = i === 0 ? 'TOTAL' : c.key === 'horas' ? totalHours : ''; });
                    const tRow = ws.addRow(tot);
                    tRow.font   = { bold: true };
                    tRow.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
                    tRow.border = { top: { style: 'medium', color: { argb: 'FF4F46E5' } } };
                }

                const buf = await wb.xlsx.writeBuffer();
                downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `agenda-${slug}.xlsx`);

            } else if (fmt === 'csv') {
                const lines = [
                    enabled.map(c => csvEsc(c.label)).join(';'),
                    ...rows.map(r => r.map(csvEsc).join(';')),
                ];
                downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `agenda-${slug}.csv`);

            } else {
                const header = enabled.map(c => c.label).join('\t');
                const sep    = enabled.map(c => '─'.repeat(Math.max(c.label.length, 4))).join('\t');
                const lines  = [header, sep, ...rows.map(r => r.join('\t'))];
                downloadBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' }), `agenda-${slug}.txt`);
            }

            onClose();
        } catch (err) {
            console.error('[AgendaExportModal]', err);
        } finally {
            setIsExporting(false);
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    const FORMATS = [
        { id: 'excel' as const, Icon: FileSpreadsheet, label: 'Excel (.xlsx)', cls: 'text-emerald-600 border-emerald-600/40 bg-emerald-600/10' },
        { id: 'csv'   as const, Icon: FileText,        label: 'CSV (.csv)',    cls: 'text-blue-600   border-blue-600/40   bg-blue-600/10'   },
        { id: 'txt'   as const, Icon: AlignLeft,       label: 'Texto (.txt)',  cls: 'text-amber-600  border-amber-600/40  bg-amber-600/10'  },
    ] as const;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">{t('agenda.exportConfig')}</h2>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {entries.length} {t('agenda.nEntries')} · <strong className="text-foreground">{formatHours(totalHours)}</strong> {t('agenda.plannedAbbr')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Format selector */}
                <div className="px-5 py-3 border-b border-border shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {t('agenda.exportFormat')}
                    </p>
                    <div className="flex gap-2">
                        {FORMATS.map(({ id, Icon, label, cls }) => (
                            <button
                                key={id}
                                onClick={() => setFmt(id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex-1 justify-center",
                                    fmt === id ? cls : "text-muted-foreground border-border bg-secondary/30 hover:bg-accent"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Column list */}
                <div className="flex flex-col flex-1 overflow-hidden px-5 py-3 min-h-0">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('agenda.exportColumns')} <span className="text-indigo-500">({enabled.length})</span>
                        </p>
                        <div className="flex gap-2">
                            <button onClick={selectAll} className="text-[10px] text-indigo-500 hover:text-indigo-400 transition-colors">
                                {t('agenda.exportSelectAll')}
                            </button>
                            <span className="text-muted-foreground/30">·</span>
                            <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                                {t('agenda.exportSelectNone')}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
                        {cols.map((col, idx) => (
                            <div
                                key={col.key}
                                className={cn(
                                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all",
                                    col.enabled ? "bg-secondary/40" : "opacity-40 hover:opacity-60"
                                )}
                            >
                                {/* Checkbox */}
                                <button
                                    onClick={() => toggle(col.key)}
                                    className={cn(
                                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all",
                                        col.enabled
                                            ? "bg-indigo-600 border-indigo-600"
                                            : "border-border bg-transparent hover:border-muted-foreground"
                                    )}
                                >
                                    {col.enabled && (
                                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>

                                {/* Label */}
                                <span className="flex-1 text-xs text-foreground select-none">{col.label}</span>

                                {/* Order badge */}
                                {col.enabled && (
                                    <span className="text-[9px] text-muted-foreground/50 tabular-nums w-3 text-center">
                                        {enabled.findIndex(c => c.key === col.key) + 1}
                                    </span>
                                )}

                                {/* Up/Down */}
                                <div className="flex gap-0.5 shrink-0">
                                    <button
                                        onClick={() => moveUp(idx)}
                                        disabled={idx === 0}
                                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => moveDown(idx)}
                                        disabled={idx === cols.length - 1}
                                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border shrink-0">
                    {enabled.length === 0 && (
                        <p className="text-[11px] text-amber-500">{t('agenda.exportNoneWarning')}</p>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"
                        >
                            {t('agenda.cancel')}
                        </button>
                        <button
                            onClick={doExport}
                            disabled={enabled.length === 0 || isExporting}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isExporting ? '...' : t('agenda.exportBtn')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
