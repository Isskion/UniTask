"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgendaEntry, AgendaConsultant, DayType, ACTIVITY_CONFIG, RESULT_CONFIG, DAY_TYPE_CONFIG } from "@/types/agenda";
import { formatHours } from "@/lib/agenda-utils";

interface Props {
    consultant: AgendaConsultant;
    date: Date;
    dayType: DayType;
    entries: AgendaEntry[];
    onAdd: () => void;
    onEdit: (entry: AgendaEntry) => void;
}

export function AgendaCell({ consultant, date, dayType, entries, onAdd, onEdit }: Props) {
    const isWeekend  = dayType === DayType.FDS;
    const isHoliday  = dayType === DayType.DNH;
    const isDisabled = isWeekend || isHoliday;

    const totalHours = entries.reduce((sum, e) => sum + (e.scheduledHours || 0), 0);

    return (
        <div
            className={cn(
                "min-h-[80px] p-1.5 flex flex-col gap-1 border-r border-b border-white/5 relative group transition-colors",
                isWeekend ? "bg-zinc-900/60" : isHoliday ? "bg-red-950/20" : "bg-transparent hover:bg-white/[0.02]",
            )}
        >
            {/* Entries list */}
            {entries.map(entry => {
                const actCfg = ACTIVITY_CONFIG[entry.activityType];
                const resCfg = RESULT_CONFIG[entry.result];
                return (
                    <button
                        key={entry.id}
                        onClick={() => onEdit(entry)}
                        className={cn(
                            "w-full text-left rounded-md px-2 py-1.5 border text-[10px] leading-tight transition-all hover:brightness-110 active:scale-[0.98]",
                            actCfg.bgClass, actCfg.borderClass,
                        )}
                    >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={cn("font-semibold truncate", actCfg.textClass)}>
                                {actCfg.label}
                            </span>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", resCfg.dotClass)} />
                        </div>
                        {entry.projectCode && (
                            <div className="flex items-center gap-1 mb-0.5">
                                <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: entry.projectColor || '#6b7280' }}
                                />
                                <span className="text-[9px] font-mono text-zinc-500 truncate">{entry.projectCode}</span>
                            </div>
                        )}
                        {entry.client && (
                            <p className="text-zinc-400 truncate">{entry.client}</p>
                        )}
                        {entry.scheduledHours > 0 && (
                            <p className="text-zinc-500 mt-0.5">{formatHours(entry.scheduledHours)}</p>
                        )}
                    </button>
                );
            })}

            {/* Total hours badge (appears when there are entries) */}
            {entries.length > 1 && totalHours > 0 && (
                <div className="text-[9px] text-zinc-500 font-mono px-1">
                    Total: {formatHours(totalHours)}
                </div>
            )}

            {/* Add button — visible on hover if not disabled */}
            {!isDisabled && (
                <button
                    onClick={onAdd}
                    className={cn(
                        "absolute bottom-1.5 right-1.5 w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center transition-all",
                        "opacity-0 group-hover:opacity-100 hover:bg-indigo-600/30 hover:border-indigo-500/40 hover:text-indigo-300",
                    )}
                    title="Añadir entrada"
                >
                    <Plus className="w-3 h-3 text-zinc-400" />
                </button>
            )}

            {/* Holiday/Weekend label */}
            {isDisabled && (
                <span className={cn(
                    "text-[9px] font-medium uppercase tracking-wider px-1",
                    isHoliday ? "text-red-500/60" : "text-zinc-600",
                )}>
                    {DAY_TYPE_CONFIG[dayType].label}
                </span>
            )}
        </div>
    );
}
