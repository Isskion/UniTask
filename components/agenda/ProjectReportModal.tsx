"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
    format, isValid, startOfDay, endOfDay, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, addDays, addWeeks, addMonths, isAfter, subWeeks,
    differenceInCalendarDays,
} from "date-fns";
import { es } from "date-fns/locale";
import {
    X, BarChart2, PieChart as PieChartIcon, TrendingUp, Download, FileSpreadsheet, Loader2,
    ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer,
} from "recharts";
import {
    ProjectHours, PeriodKind, PeriodRange, buildPeriodRange, customRange,
    getAgendaEntriesRange, aggregateProjectHours,
} from "@/lib/project-hours";
import { Project } from "@/types";
import { AgendaEntry, ActivityType, ACTIVITY_CONFIG, ResultStatus } from "@/types/agenda";
import { formatHours } from "@/lib/agenda-utils";

type ChartType  = 'bar' | 'pie' | 'wave';
// 'week' se quitó del desglose de la tabla: con el selector de fechas propio (día/semana/mes/horquilla)
// y la vista "Evolución" (agrupación temporal real), un desglose "por semana" en la tabla quedaba redundante.
type Breakdown  = 'activity' | 'consultant' | 'phase';
type WaveBucket = 'day' | 'week' | 'month';

interface Props {
    row: ProjectHours;
    tenantId: string;
    /** Proyecto completo (con phaseMapping/budgetPhases) — permite recalcular el informe al cambiar de
     *  rango de fechas dentro del propio modal. Si no se pasa (proyecto no resuelto), el modal se queda
     *  con la foto estática de `row` y no ofrece cambiar de periodo. */
    project?: Project;
    onClose: () => void;
}

type BreakdownItem = { name: string; previstas: number; realizadas: number; color?: string };
type WavePoint = { name: string; creadas: number; sinCerrar: number };

const PIE_COLORS = [
    '#4F46E5','#10B981','#F59E0B','#EF4444',
    '#A855F7','#06B6D4','#F97316','#6B7280','#8B5CF6','#EC4899',
];

const CLOSED_RESULTS = new Set<ResultStatus>([ResultStatus.HECHO, ResultStatus.CANCELADO]);
const MAX_WAVE_BUCKETS = 180;

function fmt(h: number): string {
    if (!h || h <= 0) return '0h';
    return formatHours(h) || '0h';
}

function toDate(ts: any): Date {
    if (!ts) return new Date(0);
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
    return new Date(ts);
}

const TODAY_ISO = format(new Date(), 'yyyy-MM-dd');

/** Un <input type="date"> puede quedar vacío mientras el usuario edita — sin esto, esa cadena vacía se
 *  cuela como Invalid Date hasta buildWaveBuckets(), donde date-fns `format()` la revienta con una
 *  excepción no capturada (RangeError) que tira el modal entero sin recuperación. */
function safeIso(iso: string): string {
    return isValid(new Date(iso + 'T00:00:00')) ? iso : TODAY_ISO;
}

function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
}

function safeName(s: string) {
    return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ─── Buckets para la gráfica de olas — mismo patrón de bucketing que el resto del proyecto
//     (lib/project-hours.ts / TeamCapacityKpi), con tope de seguridad para rangos muy amplios. ───────────
interface WaveBucketDef { key: string; label: string; start: Date; end: Date }

function buildWaveBuckets(range: PeriodRange, kind: WaveBucket): WaveBucketDef[] {
    // Cinturón de seguridad: si algún caller pasa un rango inválido, no propagar Invalid Date a
    // date-fns `format()` (lanza RangeError sin capturar y tira el render).
    if (!isValid(range.from) || !isValid(range.to) || isAfter(range.from, range.to)) return [];
    const START = { day: startOfDay, week: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }), month: startOfMonth };
    const END   = { day: endOfDay,   week: (d: Date) => endOfWeek(d,   { weekStartsOn: 1 }), month: endOfMonth };
    const STEP  = { day: addDays,    week: addWeeks,                                          month: addMonths };
    const LABEL_FMT = { day: 'dd/MM', week: "'Sem' dd/MM", month: 'MMM yy' };
    const KEY_FMT    = { day: 'yyyy-MM-dd', week: 'yyyy-MM-dd', month: 'yyyy-MM' };

    const buckets: WaveBucketDef[] = [];
    let cursor = START[kind](range.from);
    let i = 0;
    while (!isAfter(cursor, range.to) && i < MAX_WAVE_BUCKETS) {
        const end = END[kind](cursor);
        buckets.push({
            key: format(cursor, KEY_FMT[kind]),
            label: format(cursor, LABEL_FMT[kind], { locale: es }),
            start: cursor,
            end: isAfter(end, range.to) ? range.to : end,
        });
        cursor = STEP[kind](cursor, 1);
        i++;
    }
    return buckets;
}

/** Intervalo de la gráfica de olas derivado del selector de fechas de cabecera — no tiene selector
 *  propio a propósito (había dos controles temporales con etiquetas parecidas — "Semana", "Mes" — pero
 *  significados distintos: uno el rango, otro el tamaño de cada punto — y generaba confusión). Mismo
 *  criterio que components/Dashboard.tsx: semana → por día, mes → por semana; en horquilla se elige
 *  según la amplitud real para no generar ni un único punto ni cientos. */
function autoWaveBucket(period: PeriodKind, range: PeriodRange): WaveBucket {
    if (period === 'day')   return 'day';
    if (period === 'week')  return 'day';
    if (period === 'month') return 'week';
    const days = differenceInCalendarDays(range.to, range.from);
    if (days <= 31)  return 'day';
    if (days <= 180) return 'week';
    return 'month';
}

const WAVE_BUCKET_LABEL: Record<WaveBucket, string> = { day: 'día', week: 'semana', month: 'mes' };

export default function ProjectReportModal({ row: initialRow, tenantId, project, onClose }: Props) {
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [breakdown, setBreakdown] = useState<Breakdown>('activity');
    const [exporting, setExporting] = useState(false);

    // ── Rango de fechas propio del informe (independiente del selector del padre) ──────────────
    const [period, setPeriod]   = useState<PeriodKind>('month');
    const [anchorIso, setAnchorIso] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
    const [dayIso, setDayIso]   = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
    const [fromIso, setFromIso] = useState<string>(() => format(subWeeks(new Date(), 4), 'yyyy-MM-dd'));
    const [toIso, setToIso]     = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));

    const range: PeriodRange = useMemo(() => {
        switch (period) {
            case 'day':   return buildPeriodRange('day',   new Date(safeIso(dayIso) + 'T00:00:00'));
            case 'range': return customRange(safeIso(fromIso), safeIso(toIso));
            case 'month': return buildPeriodRange('month', new Date(safeIso(anchorIso) + 'T00:00:00'));
            case 'week':
            default:      return buildPeriodRange('week',  new Date(safeIso(anchorIso) + 'T00:00:00'));
        }
    }, [period, dayIso, anchorIso, fromIso, toIso]);

    const periodLabel = `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}`;

    const [row, setRow] = useState<ProjectHours>(initialRow);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tenantId || !project) return; // sin proyecto resuelto, nos quedamos con la foto estática inicial
        let cancelled = false;
        setLoading(true);
        setError(null);
        getAgendaEntriesRange(tenantId, range)
            .then(entries => {
                if (cancelled) return;
                const rows = aggregateProjectHours([project], entries, []);
                const found = rows.find(r => r.projectId === project.id);
                setRow(found ?? { ...initialRow, planned: 0, real: 0, matchedEntries: [], unphased: { planned: 0, real: 0 }, byPhase: initialRow.byPhase.map(ph => ({ ...ph, planned: 0, real: 0 })) });
            })
            .catch(err => {
                if (cancelled) return;
                console.error('[ProjectReportModal] error recalculando periodo:', err);
                setError('No se pudo recalcular este periodo. Reintenta; si persiste, puede faltar un índice de Firestore (revisa la consola).');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [tenantId, project, range]);

    const entries = row.matchedEntries;

    const byActivity = useMemo<BreakdownItem[]>(() => {
        const map = new Map<string, BreakdownItem>();
        entries.forEach(e => {
            const cfg   = ACTIVITY_CONFIG[e.activityType as ActivityType];
            const name  = cfg?.label ?? (e.activityType || 'Sin actividad');
            const color = cfg?.color;
            const item  = map.get(name) ?? { name, previstas: 0, realizadas: 0, color };
            item.previstas += Number(e.scheduledHours) || 0;
            if (e.result === ResultStatus.HECHO) item.realizadas += Number(e.scheduledHours) || 0;
            map.set(name, item);
        });
        return [...map.values()].sort((a, b) => b.previstas - a.previstas);
    }, [entries]);

    const byConsultant = useMemo<BreakdownItem[]>(() => {
        const map = new Map<string, BreakdownItem>();
        entries.forEach(e => {
            const name = (e as any).consultantName || 'Desconocido';
            const item = map.get(name) ?? { name, previstas: 0, realizadas: 0 };
            item.previstas += Number(e.scheduledHours) || 0;
            if (e.result === ResultStatus.HECHO) item.realizadas += Number(e.scheduledHours) || 0;
            map.set(name, item);
        });
        return [...map.values()].sort((a, b) => b.previstas - a.previstas);
    }, [entries]);

    const byPhase = useMemo<BreakdownItem[]>(() => {
        const items: BreakdownItem[] = row.byPhase.map(ph => ({
            name: ph.name || '(fase)',
            previstas: ph.planned,
            realizadas: ph.real,
            color: ph.color,
        }));
        if (row.unphased.planned > 0 || row.unphased.real > 0)
            items.push({ name: 'Sin fase', previstas: row.unphased.planned, realizadas: row.unphased.real });
        return items;
    }, [row]);

    const chartData = useMemo<BreakdownItem[]>(() => {
        switch (breakdown) {
            case 'consultant': return byConsultant;
            case 'phase':      return byPhase;
            default:           return byActivity;
        }
    }, [breakdown, byActivity, byConsultant, byPhase]);

    // ── Gráfica de dos olas: creadas por bucket vs. sin cerrar (snapshot) ────────────────────────
    // Porta la misma lógica que components/Dashboard.tsx (chartData: active/totalActive) sobre
    // agenda_entries en vez de tasks — pero bucketizando por `date` (fecha de la entrada en la agenda),
    // NO por `createdAt` (fecha de alta del documento en Firestore). Se probó con createdAt y salía
    // vacío en casi cualquier rango: `entries` ya viene filtrado por `date` dentro de `range`
    // (getAgendaEntriesRange), así que si se bucketiza por createdAt —un campo distinto, típicamente
    // agrupado en el momento de una importación masiva— casi ninguna entrada caía dentro de los
    // buckets calculados a partir de ese mismo `range`. Bucketizar por `date` mantiene todo consistente
    // con el resto del informe (tabla, filtros, rango). "Sin cerrar" sigue usando `updatedAt` como
    // proxy de fecha de cierre (igual que Dashboard.tsx para tasks sin closedAt explícito).
    const waveBucket = useMemo(() => autoWaveBucket(period, range), [period, range]);
    const waveBuckets = useMemo(() => buildWaveBuckets(range, waveBucket), [range, waveBucket]);
    const waveData = useMemo<WavePoint[]>(() => {
        return waveBuckets.map(b => {
            let creadas = 0, sinCerrar = 0;
            entries.forEach(e => {
                const entryDate = toDate(e.date);
                if (entryDate >= b.start && entryDate <= b.end) creadas++;
                if (entryDate <= b.end) {
                    const closedByBucket = CLOSED_RESULTS.has(e.result) && toDate(e.updatedAt) <= b.end;
                    if (!closedByBucket) sinCerrar++;
                }
            });
            return { name: b.label, creadas, sinCerrar };
        });
    }, [waveBuckets, entries]);

    const breakdownBtns: { key: Breakdown; label: string }[] = [
        { key: 'activity',   label: 'Actividad' },
        { key: 'consultant', label: 'Consultor' },
        { key: 'phase',      label: 'Fase' },
    ];

    // ── Export PDF ────────────────────────────────────────────────────────────
    const exportPdf = async () => {
        setExporting(true);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const c0 = 14, c1 = 135, c2 = 168;

            doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
            doc.text(row.name, c0, 18);

            doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
            doc.text(`Periodo: ${periodLabel}`, c0, 26);
            doc.text(`Desglose: ${breakdownBtns.find(b => b.key === breakdown)?.label}`, c0, 31);
            doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, c0, 36);

            doc.setTextColor(40);
            let y = 48;

            // Cabecera tabla
            doc.setFillColor(79, 70, 229);
            doc.rect(c0, y - 5, 182, 8, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255);
            doc.text('Concepto', c0 + 2, y);
            doc.text('Previstas (h)', c1, y, { align: 'right' });
            doc.text('Realizadas (h)', c2, y, { align: 'right' });
            y += 6;

            doc.setFont('helvetica', 'normal'); doc.setTextColor(40);
            chartData.forEach((item, i) => {
                if (i % 2 === 0) {
                    doc.setFillColor(240, 240, 255);
                    doc.rect(c0, y - 4, 182, 6, 'F');
                }
                doc.text(item.name.slice(0, 55), c0 + 2, y);
                doc.text(item.previstas.toFixed(1), c1, y, { align: 'right' });
                doc.text(item.realizadas.toFixed(1), c2, y, { align: 'right' });
                y += 6;
                if (y > 270) { doc.addPage(); y = 20; }
            });

            // Fila total
            doc.setFillColor(220, 220, 250);
            doc.rect(c0, y - 4, 182, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL', c0 + 2, y);
            doc.text(row.planned.toFixed(1), c1, y, { align: 'right' });
            doc.text(row.real.toFixed(1),    c2, y, { align: 'right' });

            if (row.budget > 0) {
                y += 9;
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
                const pPrev = Math.round((row.planned / row.budget) * 100);
                const pReal = Math.round((row.real    / row.budget) * 100);
                doc.text(
                    `Presupuesto: ${row.budget.toFixed(1)}h  |  Consumo previsto: ${pPrev}%  |  Consumo real: ${pReal}%`,
                    c0, y
                );
            }

            doc.save(`informe-${safeName(row.name)}.pdf`);
        } catch (err) {
            console.error('[ProjectReportModal] PDF error:', err);
        } finally {
            setExporting(false);
        }
    };

    // ── Export Excel ──────────────────────────────────────────────────────────
    const exportExcel = async () => {
        setExporting(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();
            wb.creator = 'UniTask';

            // Hoja desglose
            const wsLabel = breakdownBtns.find(b => b.key === breakdown)?.label ?? 'Detalle';
            const ws = wb.addWorksheet(wsLabel);
            ws.columns = [
                { header: 'Concepto',       key: 'name',      width: 32 },
                { header: 'Previstas (h)',   key: 'prev',      width: 16 },
                { header: 'Realizadas (h)',  key: 'real',      width: 16 },
                { header: '% s/previstas',   key: 'pct',       width: 16 },
            ];
            const hRow = ws.getRow(1);
            hRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
            hRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
            hRow.alignment = { vertical: 'middle', horizontal: 'center' };
            hRow.height    = 22;
            chartData.forEach((item, i) => {
                const pct = row.planned > 0 ? Math.round((item.previstas / row.planned) * 100) : 0;
                const r = ws.addRow({ name: item.name, prev: item.previstas, real: item.realizadas, pct: `${pct}%` });
                r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF0F0FF' : 'FFFFFFFF' } };
            });
            const totRow = ws.addRow({ name: 'TOTAL', prev: row.planned, real: row.real, pct: '100%' });
            totRow.font   = { bold: true };
            totRow.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
            totRow.border = { top: { style: 'medium', color: { argb: 'FF4F46E5' } } };

            // Hoja resumen
            const ws2 = wb.addWorksheet('Resumen');
            ws2.columns = [{ width: 24 }, { width: 20 }];
            const addSummaryRow = (label: string, value: string | number) => {
                const r = ws2.addRow([label, value]);
                (r.getCell(1) as any).font = { bold: true, color: { argb: 'FF6B7280' } };
            };
            addSummaryRow('Proyecto',        row.name);
            addSummaryRow('Código',          row.code || '—');
            addSummaryRow('Periodo',         periodLabel);
            addSummaryRow('Presupuesto (h)', row.budget > 0 ? row.budget : '—');
            addSummaryRow('Previstas (h)',   row.planned);
            addSummaryRow('Realizadas (h)',  row.real);
            if (row.budget > 0) {
                addSummaryRow('% prev./pres.', `${Math.round((row.planned / row.budget) * 100)}%`);
                addSummaryRow('% real/pres.',  `${Math.round((row.real    / row.budget) * 100)}%`);
            }

            const buf  = await wb.xlsx.writeBuffer();
            downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `informe-${safeName(row.name)}.xlsx`);
        } catch (err) {
            console.error('[ProjectReportModal] Excel error:', err);
        } finally {
            setExporting(false);
        }
    };

    const kpis = [
        { label: 'Previstas',   value: fmt(row.planned), cls: 'text-white' },
        { label: 'Realizadas',  value: fmt(row.real),    cls: 'text-emerald-300' },
        { label: 'Presupuesto', value: row.budget > 0 ? fmt(row.budget) : '—', cls: 'text-zinc-300' },
        {
            label: '% consumido',
            value: row.budget > 0 ? `${Math.round((row.planned / row.budget) * 100)}%` : '—',
            cls: row.health === 'over' ? 'text-red-400' : row.health === 'warn' ? 'text-amber-400' : 'text-zinc-300',
        },
    ];

    const subtitle = breakdownBtns.find(b => b.key === breakdown)?.label;

    const periodBtns: { key: PeriodKind; label: string }[] = [
        { key: 'day',   label: 'Día' },
        { key: 'week',  label: 'Semana' },
        { key: 'month', label: 'Mes' },
        { key: 'range', label: 'Horquilla' },
    ];

    return (
        <>
            {/* Fondo */}
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Contenedor modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-7xl max-h-[92vh] flex flex-col rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden">

                    {/* Cabecera */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
                        <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base font-semibold text-white truncate flex items-center gap-2">
                                {row.name}
                                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
                            </h2>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{periodLabel} · {entries.length} entradas</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={exportPdf} disabled={exporting}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">
                                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                PDF
                            </button>
                            <button onClick={exportExcel} disabled={exporting}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-xs text-emerald-300 hover:text-emerald-100 hover:bg-emerald-600/30 transition-colors disabled:opacity-50">
                                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                Excel
                            </button>
                            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Selector de periodo propio del informe */}
                    {project && (
                        <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-white/10 shrink-0 bg-white/[0.02]">
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                                {periodBtns.map(b => (
                                    <button key={b.key} onClick={() => setPeriod(b.key)}
                                        className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                                            period === b.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                                        {b.label}
                                    </button>
                                ))}
                            </div>

                            {(period === 'week' || period === 'month') && (
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setAnchorIso(format(period === 'week' ? subWeeks(new Date(anchorIso + 'T00:00:00'), 1) : addMonths(new Date(anchorIso + 'T00:00:00'), -1), 'yyyy-MM-dd'))}
                                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setAnchorIso(format(period === 'week' ? addWeeks(new Date(anchorIso + 'T00:00:00'), 1) : addMonths(new Date(anchorIso + 'T00:00:00'), 1), 'yyyy-MM-dd'))}
                                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            {period === 'day' && (
                                <input type="date" value={dayIso} onChange={e => setDayIso(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-zinc-200 outline-none focus:border-indigo-500" />
                            )}
                            {period === 'range' && (
                                <div className="flex items-center gap-1.5">
                                    <input type="date" value={fromIso} onChange={e => setFromIso(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-zinc-200 outline-none focus:border-indigo-500" />
                                    <span className="text-zinc-600 text-xs">→</span>
                                    <input type="date" value={toIso} onChange={e => setToIso(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-zinc-200 outline-none focus:border-indigo-500" />
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 mx-5 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs shrink-0">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-4 divide-x divide-white/5 border-b border-white/10 shrink-0">
                        {kpis.map(k => (
                            <div key={k.label} className="px-5 py-3 text-center">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{k.label}</p>
                                <p className={cn("text-xl font-black mt-0.5", k.cls)}>{k.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Controles del gráfico superior */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 shrink-0 flex-wrap">
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                            <button onClick={() => setChartType('bar')}
                                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-all",
                                    chartType === 'bar' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                                <BarChart2 className="w-3.5 h-3.5" />Barras
                            </button>
                            <button onClick={() => setChartType('pie')}
                                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-all",
                                    chartType === 'pie' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                                <PieChartIcon className="w-3.5 h-3.5" />Tarta
                            </button>
                            <button onClick={() => setChartType('wave')}
                                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-all",
                                    chartType === 'wave' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                                <TrendingUp className="w-3.5 h-3.5" />Evolución
                            </button>
                        </div>

                        {chartType === 'wave' && (
                            <span className="text-[10px] text-zinc-500">
                                Agrupado por {WAVE_BUCKET_LABEL[waveBucket]} (según el rango de fechas de cabecera)
                            </span>
                        )}

                        <span className="text-[10px] text-zinc-600 ml-auto">
                            {chartType === 'wave' ? `${waveData.length} intervalos` : `${chartData.length} ${subtitle?.toLowerCase()}`}
                        </span>
                    </div>

                    {/* Cuerpo scrollable — el gráfico (barras/tarta/evolución) cambia con chartType, pero la
                        tabla de detalle SIEMPRE se muestra: es el informe de actividad, información vital que
                        no debe desaparecer solo por mirar la evolución temporal. */}
                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                        {entries.length === 0 ? (
                            <p className="text-center text-zinc-600 text-sm py-10">
                                Sin entradas en este periodo para este proyecto.
                            </p>
                        ) : (
                            <>
                                {/* Gráfico */}
                                {chartType === 'wave' ? (
                                    <div className="h-[22.5rem]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={waveData} margin={{ top: 4, right: 16, left: 0, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="colorCreadas" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.7} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorSinCerrar" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7} />
                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                                                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 4 }} />
                                                <Area type="monotone" dataKey="creadas" name="Creadas" stroke="#6366f1" strokeWidth={2} fill="url(#colorCreadas)" />
                                                <Area type="monotone" dataKey="sinCerrar" name="Sin cerrar" stroke="#f59e0b" strokeWidth={2} fill="url(#colorSinCerrar)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            {chartType === 'bar' ? (
                                                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 45 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }}
                                                        angle={-35} textAnchor="end" height={55} interval={0} />
                                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }}
                                                        tickFormatter={v => `${v}h`} width={38} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                                                        formatter={(v) => [`${Number(v ?? 0).toFixed(1)}h`]} />
                                                    <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 4 }} />
                                                    <Bar dataKey="previstas"  name="Previstas"  fill="#4F46E5" fillOpacity={0.8} radius={[3,3,0,0]} />
                                                    <Bar dataKey="realizadas" name="Realizadas" fill="#10B981" fillOpacity={0.9} radius={[3,3,0,0]} />
                                                </BarChart>
                                            ) : (
                                                <PieChart>
                                                    <Pie data={chartData} dataKey="previstas" nameKey="name"
                                                        cx="30%" cy="50%" outerRadius={90}
                                                        label={({ name, percent }) => (percent ?? 0) > 0.04 ? `${(name ?? '').slice(0, 10)} ${Math.round((percent ?? 0) * 100)}%` : ''}
                                                        labelLine={false}>
                                                        {chartData.map((item, i) => (
                                                            <Cell key={i} fill={item.color ?? PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.85} />
                                                        ))}
                                                    </Pie>
                                                    <Pie data={chartData} dataKey="realizadas" nameKey="name" legendType="none"
                                                        cx="70%" cy="50%" outerRadius={90}
                                                        label={({ percent }) => (percent ?? 0) > 0.04 ? `${Math.round((percent ?? 0) * 100)}%` : ''}
                                                        labelLine={false}>
                                                        {chartData.map((item, i) => (
                                                            <Cell key={i} fill={item.color ?? PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.85} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                                                        formatter={(v) => [`${Number(v ?? 0).toFixed(1)}h`]} />
                                                    <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
                                                </PieChart>
                                            )}
                                        </ResponsiveContainer>
                                        {chartType === 'pie' && (
                                            <p className="text-center text-[10px] text-zinc-600 -mt-1">
                                                Tarta izquierda: Previstas · Tarta derecha: Realizadas
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Informe de actividad — SIEMPRE visible, con su propio selector de desglose */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Informe de actividad</p>
                                        <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                                            {breakdownBtns.map(b => (
                                                <button key={b.key} onClick={() => setBreakdown(b.key)}
                                                    className={cn("px-2.5 py-1 rounded-md text-[11px] transition-all",
                                                        breakdown === b.key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                                                    {b.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-white/10 overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-white/5 text-zinc-400">
                                                    <th className="text-left px-4 py-2.5 font-semibold">{subtitle}</th>
                                                    <th className="text-right px-4 py-2.5 font-semibold w-28">Previstas</th>
                                                    <th className="text-right px-4 py-2.5 font-semibold w-28">Realizadas</th>
                                                    <th className="text-right px-4 py-2.5 font-semibold w-24">% s/total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {chartData.map((item, i) => {
                                                    const pct = row.planned > 0 ? Math.round((item.previstas / row.planned) * 100) : 0;
                                                    return (
                                                        <tr key={i} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                                                            <td className="px-4 py-2.5 text-zinc-200">
                                                                <span className="flex items-center gap-2">
                                                                    {item.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />}
                                                                    {item.name}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right text-zinc-100 font-medium tabular-nums">{fmt(item.previstas)}</td>
                                                            <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{fmt(item.realizadas)}</td>
                                                            <td className="px-4 py-2.5 text-right text-zinc-500 tabular-nums">{pct}%</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t-2 border-indigo-500/30 bg-indigo-500/5">
                                                    <td className="px-4 py-2.5 text-zinc-300 font-bold">Total</td>
                                                    <td className="px-4 py-2.5 text-right text-white font-bold tabular-nums">{fmt(row.planned)}</td>
                                                    <td className="px-4 py-2.5 text-right text-zinc-300 font-bold tabular-nums">{fmt(row.real)}</td>
                                                    <td className="px-4 py-2.5 text-right text-zinc-500 font-bold">100%</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
