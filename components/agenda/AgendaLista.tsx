"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import {
    ChevronUp, ChevronDown, ChevronsUpDown,
    Search, List, FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    AgendaEntry, AgendaConsultant, AgendaFilters,
    ACTIVITY_CONFIG, RESULT_CONFIG, ACTIVITY_TKEYS, RESULT_TKEYS,
} from "@/types/agenda";
import { useLanguage } from "@/context/LanguageContext";
import { formatHours } from "@/lib/agenda-utils";

type SortField = 'date' | 'consultant' | 'activityType' | 'client' | 'scheduledHours' | 'result' | 'projectName';
type SortDir   = 'asc' | 'desc';

interface AgendaListaProps {
    entries:     AgendaEntry[];
    consultants: AgendaConsultant[];
    filters:     AgendaFilters;
    weekLabel:   string;
}

export function AgendaLista({ entries, filters, weekLabel }: AgendaListaProps) {
    const { t } = useLanguage();
    const [search,      setSearch]      = useState('');
    const [sortField,   setSortField]   = useState<SortField>('date');
    const [sortDir,     setSortDir]     = useState<SortDir>('asc');
    const [isExporting, setIsExporting] = useState(false);

    // Apply global filters (mirrors AgendaGrid logic)
    const baseFiltered = useMemo(() => entries.filter(e => {
        if (filters.consultantIds.length > 0 && !filters.consultantIds.includes(e.consultantId)) return false;
        if (filters.activityTypes.length > 0 && !filters.activityTypes.includes(e.activityType)) return false;
        if (filters.results.length > 0       && !filters.results.includes(e.result))             return false;
        return true;
    }), [entries, filters]);

    // Local text search
    const searched = useMemo(() => {
        if (!search.trim()) return baseFiltered;
        const q = search.toLowerCase();
        return baseFiltered.filter(e =>
            e.consultantName.toLowerCase().includes(q) ||
            e.client.toLowerCase().includes(q)         ||
            e.description.toLowerCase().includes(q)    ||
            (e.projectName || '').toLowerCase().includes(q) ||
            e.activityType.toLowerCase().includes(q)
        );
    }, [baseFiltered, search]);

    // Sort
    const sorted = useMemo(() => [...searched].sort((a, b) => {
        let va: string | number;
        let vb: string | number;
        switch (sortField) {
            case 'date':
                va = (a.date as Timestamp).seconds ?? 0;
                vb = (b.date as Timestamp).seconds ?? 0;
                break;
            case 'consultant':    va = a.consultantName;       vb = b.consultantName;       break;
            case 'activityType':  va = a.activityType;         vb = b.activityType;         break;
            case 'client':        va = a.client;               vb = b.client;               break;
            case 'scheduledHours':va = a.scheduledHours;       vb = b.scheduledHours;       break;
            case 'result':        va = a.result;               vb = b.result;               break;
            case 'projectName':   va = a.projectName || '';    vb = b.projectName || '';    break;
            default: return 0;
        }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
    }), [searched, sortField, sortDir]);

    const totalHours = sorted.reduce((acc, e) => acc + (e.scheduledHours || 0), 0);

    function handleSort(field: SortField) {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    }

    async function handleExportExcel() {
        setIsExporting(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'UniTask';
            const sheet = workbook.addWorksheet('Agenda');

            sheet.columns = [
                { header: 'Fecha',         key: 'fecha',        width: 13 },
                { header: 'Día',           key: 'dia',          width: 13 },
                { header: 'Consultor',     key: 'consultor',    width: 22 },
                { header: 'Región',        key: 'region',       width: 14 },
                { header: 'Actividad',     key: 'actividad',    width: 22 },
                { header: 'Cliente',       key: 'cliente',      width: 24 },
                { header: 'Descripción',   key: 'descripcion',  width: 32 },
                { header: 'Horario',       key: 'horario',      width: 14 },
                { header: 'Horas',         key: 'horas',        width: 8  },
                { header: 'Estado',        key: 'estado',       width: 14 },
                { header: 'Proyecto',      key: 'proyecto',     width: 22 },
                { header: 'Cód. Proyecto', key: 'codProyecto',  width: 14 },
            ];

            const headerRow = sheet.getRow(1);
            headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height    = 22;

            sorted.forEach(e => {
                const date = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string);
                sheet.addRow({
                    fecha:       format(date, 'dd/MM/yyyy'),
                    dia:         format(date, 'EEEE', { locale: es }),
                    consultor:   e.consultantName,
                    region:      e.region || '',
                    actividad:   e.activityType,
                    cliente:     e.client,
                    descripcion: e.description,
                    horario:     e.scheduleRaw,
                    horas:       e.scheduledHours,
                    estado:      e.result,
                    proyecto:    e.projectName  || '',
                    codProyecto: e.projectCode  || '',
                });
            });

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                row.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber % 2 === 0 ? 'FFF0F0FF' : 'FFFFFFFF' } };
                row.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
            });

            // Total row
            const totalRow = sheet.addRow({
                fecha: 'TOTAL', consultor: '', actividad: '', cliente: '',
                descripcion: '', horario: '', horas: totalHours, estado: '', proyecto: '',
            });
            totalRow.font   = { bold: true };
            totalRow.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
            totalRow.border = { top: { style: 'medium', color: { argb: 'FF4F46E5' } } };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url    = URL.createObjectURL(blob);
            const a      = document.createElement('a');
            a.href       = url;
            a.download   = `agenda-${weekLabel.replace(/[^\w-]/g, '_')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[AgendaLista] Excel export error:', err);
        } finally {
            setIsExporting(false);
        }
    }

    function SortIcon({ field }: { field: SortField }) {
        if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
        return sortDir === 'asc'
            ? <ChevronUp   className="w-3 h-3 text-indigo-400" />
            : <ChevronDown className="w-3 h-3 text-indigo-400" />;
    }

    type ColDef = { field: SortField | null; label: string };
    const columns: ColDef[] = [
        { field: 'date',          label: 'Fecha'                         },
        { field: 'consultant',    label: t('agenda.consultantCol')       },
        { field: 'activityType',  label: t('agenda.activityFilter')      },
        { field: 'client',        label: t('agenda.clientLabel')         },
        { field: null,            label: t('agenda.descLabel')           },
        { field: null,            label: t('agenda.schedule')            },
        { field: 'scheduledHours',label: t('agenda.plannedAbbr')        },
        { field: 'result',        label: t('agenda.statusLabel')         },
        { field: 'projectName',   label: t('agenda.project')            },
    ];

    return (
        <div className="flex flex-col flex-1 overflow-hidden">

            {/* Sub-toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/30 shrink-0 flex-wrap">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder={t('agenda.listSearch')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 w-56 text-xs bg-secondary/40 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                    />
                </div>

                <span className="text-xs text-muted-foreground ml-auto">
                    {sorted.length} {t('agenda.nEntries')} · <span className="font-semibold text-foreground">{formatHours(totalHours)}</span> {t('agenda.plannedAbbr')}
                </span>

                <button
                    onClick={handleExportExcel}
                    disabled={sorted.length === 0 || isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/10 border border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <FileDown className="w-3.5 h-3.5" />
                    {isExporting ? '...' : t('agenda.exportExcel')}
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
                        <List className="w-10 h-10 opacity-20" />
                        <p className="text-sm">{t('agenda.noData')}</p>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
                            <tr>
                                {columns.map(({ field, label }, i) => (
                                    <th
                                        key={i}
                                        onClick={() => field && handleSort(field)}
                                        className={cn(
                                            "px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                                            field && "cursor-pointer hover:text-foreground select-none"
                                        )}
                                    >
                                        <span className="flex items-center gap-1">
                                            {label}
                                            {field && <SortIcon field={field} />}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {sorted.map((e, idx) => {
                                const date   = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string);
                                const actCfg = ACTIVITY_CONFIG[e.activityType];
                                const resCfg = RESULT_CONFIG[e.result];
                                return (
                                    <tr
                                        key={e.id}
                                        className={cn(
                                            "border-b border-border/40 transition-colors hover:bg-accent/40",
                                            idx % 2 !== 0 && "bg-secondary/10"
                                        )}
                                    >
                                        {/* Date */}
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="font-medium text-foreground">{format(date, 'dd/MM/yyyy')}</div>
                                            <div className="text-[10px] text-muted-foreground capitalize">{format(date, 'EEE', { locale: es })}</div>
                                        </td>

                                        {/* Consultant */}
                                        <td className="px-3 py-2 whitespace-nowrap text-foreground">{e.consultantName}</td>

                                        {/* Activity */}
                                        <td className="px-3 py-2">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
                                                actCfg.bgClass, actCfg.textClass, actCfg.borderClass
                                            )}>
                                                {t(ACTIVITY_TKEYS[e.activityType]) || e.activityType}
                                            </span>
                                        </td>

                                        {/* Client */}
                                        <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{e.client || '—'}</td>

                                        {/* Description */}
                                        <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate" title={e.description}>
                                            {e.description || '—'}
                                        </td>

                                        {/* Schedule */}
                                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap tabular-nums">{e.scheduleRaw}</td>

                                        {/* Hours */}
                                        <td className="px-3 py-2 text-right font-semibold text-foreground tabular-nums whitespace-nowrap">
                                            {formatHours(e.scheduledHours)}
                                        </td>

                                        {/* Status */}
                                        <td className="px-3 py-2">
                                            <span className="flex items-center gap-1.5 whitespace-nowrap">
                                                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", resCfg.dotClass)} />
                                                <span className={cn("text-[10px] font-medium", resCfg.textClass)}>
                                                    {t(RESULT_TKEYS[e.result]) || e.result}
                                                </span>
                                            </span>
                                        </td>

                                        {/* Project */}
                                        <td className="px-3 py-2">
                                            {e.projectCode ? (
                                                <span className="inline-flex items-center gap-1.5">
                                                    {e.projectColor && (
                                                        <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: e.projectColor }} />
                                                    )}
                                                    <span className="font-medium text-foreground">{e.projectCode}</span>
                                                    {e.projectName && (
                                                        <span className="text-muted-foreground">· {e.projectName}</span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/40">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        <tfoot className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t-2 border-indigo-500/30">
                            <tr>
                                <td colSpan={6} className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {t('agenda.weekTotal')}
                                </td>
                                <td className="px-3 py-2 text-right text-sm font-bold text-foreground tabular-nums">
                                    {formatHours(totalHours)}
                                </td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
        </div>
    );
}
