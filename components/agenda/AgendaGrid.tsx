"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AgendaEntry, AgendaConsultant, DayType, AgendaFilters, ACTIVITY_CONFIG } from "@/types/agenda";
import { getDayType, formatDayHeader, formatHours } from "@/lib/agenda-utils";
import { AgendaCell } from "./AgendaCell";
import { AgendaEntryModal } from "./AgendaEntryModal";

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
                No hay consultores que coincidan con los filtros activos.
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
                            <th className="bg-[#111113] border-r border-b border-white/8 px-3 py-2 text-left text-zinc-500 font-medium">
                                Consultor
                            </th>
                            {dayMeta.map(({ date, type, header }) => {
                                const isWeekend = type === DayType.FDS;
                                const isHoliday = type === DayType.DNH;
                                return (
                                    <th
                                        key={date.toISOString()}
                                        className={cn(
                                            "border-r border-b border-white/8 px-2 py-2 text-center font-medium",
                                            isHoliday ? "bg-red-900/40 text-red-200" :
                                            isWeekend ? "bg-zinc-900/80 text-zinc-500" :
                                                        "bg-[#111113] text-zinc-200"
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
                            <th className="bg-[#111113] border-b border-white/8 px-2 py-2 text-center text-zinc-500 font-medium">
                                Total
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {visibleConsultants.map(consultant => {
                            const rowTotal = rowTotals.get(consultant.userId) || 0;
                            return (
                                <tr key={consultant.id} className="group/row">
                                    {/* ── Consultant name ─────────────────────── */}
                                    <td className="sticky left-0 z-10 bg-[#111113] border-r border-b border-white/8 px-3 py-2 align-top group-hover/row:bg-[#141416]">
                                        <div className="flex flex-col">
                                            <span className="text-zinc-200 font-semibold text-[11px] truncate">{consultant.name}</span>
                                            <span className={cn(
                                                "text-[9px] mt-0.5 font-medium uppercase tracking-wider",
                                                consultant.region === 'IBERIA' ? "text-indigo-400/70" : "text-emerald-400/70"
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
                                            <td key={iso} className="align-top p-0">
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
                                    <td className="border-b border-l border-white/8 px-2 py-2 text-center align-middle bg-[#0f0f11]">
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
                        <tr className="bg-[#0d0d10] border-t border-white/10">
                            <td className="sticky left-0 z-10 bg-[#0d0d10] border-r border-white/8 px-3 py-2 text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
                                Total semana
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
