"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AgendaEntry, AgendaConsultant, DayType, AgendaFilters, ACTIVITY_CONFIG } from "@/types/agenda";
import { getDayType, formatDayHeader, formatHours } from "@/lib/agenda-utils";
import { useLanguage } from "@/context/LanguageContext";
import { AgendaCell } from "./AgendaCell";
import { AgendaEntryModal } from "./AgendaEntryModal";

const REGION_COLOR_LIST = [
    "text-indigo-500", "text-emerald-500", "text-amber-500",
    "text-cyan-500",   "text-rose-500",    "text-violet-500",
];
const regionColorCache = new Map<string, string>();
function REGION_COLORS(region: string): string {
    if (!regionColorCache.has(region)) {
        const idx = [...region].reduce((acc, c) => acc + c.charCodeAt(0), 0) % REGION_COLOR_LIST.length;
        regionColorCache.set(region, REGION_COLOR_LIST[idx]);
    }
    return regionColorCache.get(region)!;
}

interface Props {
    weekDays: Date[];
    consultants: AgendaConsultant[];
    entries: AgendaEntry[];
    filters: AgendaFilters;
    tenantId: string;
}

interface ModalState {
    open: boolean;
    consultant: AgendaConsultant | null;
    date: Date | null;
    entry: AgendaEntry | null;
}

const CLOSED_MODAL: ModalState = { open: false, consultant: null, date: null, entry: null };

export function AgendaGrid({ weekDays, consultants, entries, filters, tenantId }: Props) {
    const { t } = useLanguage();
    const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);

    // ── Apply filters ──────────────────────────────────────────────────────────
    const visibleConsultants = useMemo(() => {
        return consultants.filter(c => {
            if (filters.region !== 'ALL' && c.region !== filters.region) return false;
            if (filters.consultantIds.length > 0 && !filters.consultantIds.includes(c.userId)) return false;
            return true;
        });
    }, [consultants, filters]);

    // ── Build lookup: consultantId + dateISO → entries[] ──────────────────────
    const entryMap = useMemo(() => {
        const map = new Map<string, AgendaEntry[]>();
        entries.forEach(e => {
            const date = e.date && typeof (e.date as any).toDate === 'function'
                ? (e.date as any).toDate()
                : new Date(e.date as unknown as string);
            const iso  = date.toISOString().split('T')[0];
            const key  = `${e.consultantId}::${iso}`;
            if (!map.has(key)) map.set(key, []);
            const filtered = filters.activityTypes.length > 0
                ? (filters.activityTypes.includes(e.activityType) ? [e] : [])
                : [e];
            const filteredResult = filters.results.length > 0
                ? filtered.filter(f => filters.results.includes(f.result))
                : filtered;
            map.get(key)!.push(...filteredResult);
        });
        return map;
    }, [entries, filters]);

    // ── Day metadata ───────────────────────────────────────────────────────────
    const dayMeta = useMemo(() => weekDays.map(d => ({
        date:    d,
        iso:     d.toISOString().split('T')[0],
        type:    getDayType(d),
        header:  formatDayHeader(d),
    })), [weekDays]);

    // ── Column totals ──────────────────────────────────────────────────────────
    const colTotals = useMemo(() => dayMeta.map(({ iso }) => {
        let total = 0;
        visibleConsultants.forEach(c => {
            const key = `${c.userId}::${iso}`;
            const cellEntries = entryMap.get(key) || [];
            total += cellEntries.reduce((s, e) => s + (e.scheduledHours || 0), 0);
        });
        return total;
    }), [dayMeta, visibleConsultants, entryMap]);

    // ── Row totals ─────────────────────────────────────────────────────────────
    const rowTotals = useMemo(() => {
        const map = new Map<string, number>();
        visibleConsultants.forEach(c => {
            let total = 0;
            dayMeta.forEach(({ iso }) => {
                const key = `${c.userId}::${iso}`;
                const cellEntries = entryMap.get(key) || [];
                total += cellEntries.reduce((s, e) => s + (e.scheduledHours || 0), 0);
            });
            map.set(c.userId, total);
        });
        return map;
    }, [visibleConsultants, dayMeta, entryMap]);

    // ── Modal handlers ─────────────────────────────────────────────────────────
    function openAdd(consultant: AgendaConsultant, date: Date) {
        setModal({ open: true, consultant, date, entry: null });
    }
    function openEdit(consultant: AgendaConsultant, date: Date, entry: AgendaEntry) {
        setModal({ open: true, consultant, date, entry });
    }

    if (visibleConsultants.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm py-24">
                {t('agenda.noConsultantsFilter')}
            </div>
        );
    }

    return (
        <>
            <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full border-collapse text-xs" style={{ minWidth: '900px' }}>
                    <colgroup>
                        <col style={{ width: '160px', minWidth: '140px' }} />
                        {weekDays.map((_, i) => <col key={i} style={{ minWidth: '120px' }} />)}
                        <col style={{ width: '70px' }} />
                    </colgroup>

                    {/* ── Day headers ────────────────────────────────────────── */}
                    <thead className="sticky top-0 z-20">
                        <tr>
                            <th className="bg-card border-r border-b border-border px-3 py-2 text-left text-muted-foreground font-medium">
                                {t('agenda.consultantCol')}
                            </th>
                            {dayMeta.map(({ date, type, header }) => {
                                const isWeekend = type === DayType.FDS;
                                const isHoliday = type === DayType.DNH;
                                return (
                                    <th
                                        key={date.toISOString()}
                                        className={cn(
                                            "border-r border-b border-border px-2 py-2 text-center font-medium",
                                            isHoliday ? "bg-red-900/40 text-red-200" :
                                            isWeekend ? "bg-muted/40 text-muted-foreground" :
                                                        "bg-card text-foreground"
                                        )}
                                    >
                                        <div className="text-[10px] uppercase tracking-widest opacity-60">{header.abbr}</div>
                                        <div className="text-lg font-black leading-none mt-0.5">{header.num}</div>
                                        <div className="text-[9px] opacity-40 mt-0.5">{header.month}</div>
                                        {isHoliday && (
                                            <div className="text-[8px] text-red-400 mt-0.5 uppercase tracking-wide">Festivo</div>
                                        )}
                                    </th>
                                );
                            })}
                            <th className="bg-card border-b border-border px-2 py-2 text-center text-muted-foreground font-medium">
                                {t('agenda.totalCol')}
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {visibleConsultants.map(consultant => {
                            const rowTotal = rowTotals.get(consultant.userId) || 0;
                            return (
                                <tr key={consultant.id} className="group/row">
                                    {/* ── Consultant name ─────────────────────── */}
                                    <td className="sticky left-0 z-10 bg-card border-r border-b border-border px-3 py-2 align-top group-hover/row:bg-accent/30">
                                        <div className="flex flex-col justify-start">
                                            <span className="text-foreground font-semibold text-[11px] truncate">{consultant.name}</span>
                                            <span className={cn(
                                                "text-[9px] mt-0.5 font-medium uppercase tracking-wider",
                                                REGION_COLORS[consultant.region] ?? "text-violet-500"
                                            )}>
                                                {consultant.region}
                                            </span>
                                        </div>
                                    </td>

                                    {/* ── Day cells ───────────────────────────── */}
                                    {dayMeta.map(({ date, iso, type }) => {
                                        const key  = `${consultant.userId}::${iso}`;
                                        const cellEntries = entryMap.get(key) || [];
                                        return (
                                            <td
                                                key={iso}
                                                className={cn(
                                                    "align-top p-0 border-r border-b border-border group",
                                                    type === DayType.FDS  ? "bg-muted/30" :
                                                    type === DayType.DNH  ? "bg-red-950/20" :
                                                    "hover:bg-accent/20"
                                                )}
                                            >
                                                <AgendaCell
                                                    consultant={consultant}
                                                    date={date}
                                                    dayType={type}
                                                    entries={cellEntries}
                                                    onAdd={() => openAdd(consultant, date)}
                                                    onEdit={entry => openEdit(consultant, date, entry)}
                                                />
                                            </td>
                                        );
                                    })}

                                    {/* ── Row total ───────────────────────────── */}
                                    <td className="border-b border-l border-border px-2 py-2 text-center align-middle bg-muted/20">
                                        {rowTotal > 0 ? (
                                            <span className="text-indigo-300 font-semibold">{formatHours(rowTotal)}</span>
                                        ) : (
                                            <span className="text-zinc-700">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}

                        {/* ── Column totals row ───────────────────────────────── */}
                        <tr className="bg-muted/30 border-t border-border">
                            <td className="sticky left-0 z-10 bg-muted/30 border-r border-border px-3 py-2 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                                {t('agenda.weekTotal')}
                            </td>
                            {colTotals.map((total, i) => (
                                <td key={i} className="border-r border-white/8 px-2 py-2 text-center">
                                    {total > 0 ? (
                                        <span className="text-zinc-300 font-semibold">{formatHours(total)}</span>
                                    ) : (
                                        <span className="text-zinc-700">—</span>
                                    )}
                                </td>
                            ))}
                            <td className="px-2 py-2 text-center">
                                {(() => {
                                    const grand = colTotals.reduce((s, t) => s + t, 0);
                                    return grand > 0
                                        ? <span className="text-white font-bold">{formatHours(grand)}</span>
                                        : <span className="text-zinc-700">—</span>;
                                })()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── Modal ─────────────────────────────────────────────────────── */}
            {modal.open && modal.consultant && modal.date && (
                <AgendaEntryModal
                    isOpen={modal.open}
                    onClose={() => setModal(CLOSED_MODAL)}
                    consultant={modal.consultant}
                    date={modal.date}
                    entry={modal.entry}
                    tenantId={tenantId}
                />
            )}
        </>
    );
}
