"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgendaEntry, AgendaConsultant, DayType, ACTIVITY_CONFIG, RESULT_CONFIG, DAY_TKEYS } from "@/types/agenda";
import { formatHours } from "@/lib/agenda-utils";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/hooks/useTheme";

interface Props {
    consultant: AgendaConsultant;
    date: Date;
    dayType: DayType;
    entries: AgendaEntry[];
    onAdd: () => void;
    onEdit: (entry: AgendaEntry) => void;
}

export function AgendaCell({ consultant, date, dayType, entries, onAdd, onEdit }: Props) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark' || theme === 'red';
    const isWeekend  = dayType === DayType.FDS;
    const isHoliday  = dayType === DayType.DNH;
    const isDisabled = isWeekend || isHoliday;

    const totalHours = entries.reduce((sum, e) => sum + (e.scheduledHours || 0), 0);

    return (
        // bg, border and hover live on the parent <td> in AgendaGrid so they always
        // fill the full row height. This div only manages content layout.
        <div className="min-h-[80px] p-1.5 flex flex-col gap-1 relative transition-colors">
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
                            isDark ? "text-white" : actCfg.textClass,
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
                                <span className={cn("text-[9px] font-mono truncate", actCfg.textClass, "opacity-70")}>
                                    {entry.projectCode}
                                </span>
                            </div>
                        )}
                        {entry.client && (
                            <p className={cn("truncate", actCfg.textClass, "opacity-80")}>{entry.client}</p>
                        )}
                        {entry.scheduledHours > 0 && (
                            <p className={cn("mt-0.5", actCfg.textClass, "opacity-60")}>{formatHours(entry.scheduledHours)}</p>
                        )}
                    </button>
                );
            })}

            {/* Total hours badge */}
            {entries.length > 1 && totalHours > 0 && (
                <div className="text-[9px] text-muted-foreground font-mono px-1">
                    Total: {formatHours(totalHours)}
                </div>
            )}

            {/* Add button */}
            {!isDisabled && (
                <button
                    onClick={onAdd}
                    className={cn(
                        "absolute bottom-1.5 right-1.5 w-5 h-5 rounded-md bg-secondary/50 border border-border flex items-center justify-center transition-all",
                        "opacity-0 group-hover:opacity-100 hover:bg-indigo-600/30 hover:border-indigo-500/40 hover:text-indigo-400",
                    )}
                    title={t('agenda.addEntry')}
                >
                    <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
            )}

            {/* FDS / DNH label */}
            {isDisabled && (
                <span className={cn(
                    "text-[9px] font-medium uppercase tracking-wider px-1 mt-auto",
                    isHoliday ? "text-red-600/80" : "text-muted-foreground/70",
                )}>
                    {t(DAY_TKEYS[dayType])}
                </span>
            )}
        </div>
    );
}
