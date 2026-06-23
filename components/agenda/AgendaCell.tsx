"use client";

import { Plus, AlertTriangle } from "lucide-react";
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
    runningEntryIds: Set<string>;
}

function fmtMinutes(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function AgendaCell({ consultant, date, dayType, entries, onAdd, onEdit, runningEntryIds }: Props) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === 'dark' || theme === 'red';
    const isWeekend = dayType === DayType.FDS;
    const isHoliday = dayType === DayType.DNH;
    const isDisabled = isWeekend || isHoliday;

    const totalHours = entries.reduce((sum, e) => sum + (e.scheduledHours || 0), 0);

    return (
        <div className="min-h-[80px] p-1.5 flex flex-col gap-1 relative transition-colors">
            {entries.map(entry => {
                const actCfg  = ACTIVITY_CONFIG[entry.activityType];
                const resCfg  = RESULT_CONFIG[entry.result];
                const isRunning   = runningEntryIds.has(entry.id);
                const actualMins  = ((entry as any).actualMinutes as number) || 0;
                const scheduledMins = Math.round((entry.scheduledHours || 0) * 60);

                return (
                    <button
                        key={entry.id}
                        onClick={() => onEdit(entry)}
                        title={entry.needsDateReview ? 'Fecha estimada al importar — revisa el día real o reimporta cuando el Excel tenga la fecha correcta' : undefined}
                        className={cn(
                            "w-full text-left rounded-md px-2 py-1 border text-[10px] leading-tight transition-all hover:brightness-110 active:scale-[0.98]",
                            actCfg.bgClass,
                            entry.needsDateReview ? "border-amber-400/60 border-dashed" : actCfg.borderClass,
                            isDark ? "text-white" : actCfg.textClass,
                        )}
                    >
                        {/* Fila 1: tipo de tarea + dot de estado */}
                        <div className="flex items-center justify-between gap-1">
                            <span className={cn("font-semibold truncate", actCfg.textClass)}>
                                {actCfg.label}
                            </span>
                            {entry.needsDateReview ? (
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-amber-400" />
                            ) : (
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", resCfg.dotClass)} />
                            )}
                        </div>

                        {entry.needsDateReview && (
                            <p className="text-[9px] font-semibold text-amber-400 mt-0.5">Revisar fecha</p>
                        )}

                        {/* Fila 2: proyecto (nombre del cliente/proyecto principal) */}
                        {entry.projectName && (
                            <p className={cn("truncate mt-0.5", actCfg.textClass, "opacity-90")}>
                                {entry.projectName}
                            </p>
                        )}

                        {/* Fila 3: descripción truncada a una línea */}
                        {entry.description && (
                            <p className={cn("truncate mt-0.5 opacity-75", actCfg.textClass)}>
                                {entry.description}
                            </p>
                        )}

                        {/* Fila 4: código de proyecto como referencia secundaria */}
                        {entry.projectCode && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: entry.projectColor || '#6b7280' }}
                                />
                                <span className={cn("text-[9px] font-mono truncate", actCfg.textClass, "opacity-60")}>
                                    {entry.projectCode}
                                </span>
                            </div>
                        )}

                        {/* Fila 4: horas planificadas — siempre visibles */}
                        {entry.scheduledHours > 0 && (
                            <p className={cn("mt-0.5 text-[9px] font-mono", actCfg.textClass, "opacity-70")}>
                                {formatHours(entry.scheduledHours)}
                            </p>
                        )}

                        {/* Barra de progreso: solo visible con timer activo */}
                        {isRunning && scheduledMins > 0 && (() => {
                            const pct  = Math.min(100, Math.max(4, Math.round((actualMins / scheduledMins) * 100)));
                            const over = actualMins > scheduledMins;
                            return (
                                <div className="mt-1 space-y-0.5">
                                    <div className="w-full h-1 rounded-full bg-black/20 overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all", over ? "bg-red-400" : "bg-emerald-400 animate-pulse")}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <p className={cn("text-[8px] font-mono", over ? "text-red-400" : "text-emerald-400")}>
                                        {fmtMinutes(actualMins)} / {formatHours(entry.scheduledHours)}
                                    </p>
                                </div>
                            );
                        })()}
                    </button>
                );
            })}

            {/* Total horas si hay más de una entrada */}
            {entries.length > 1 && totalHours > 0 && (
                <div className="text-[9px] text-muted-foreground font-mono px-1">
                    Total: {formatHours(totalHours)}
                </div>
            )}

            {/* Botón añadir */}
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

            {/* Etiqueta FDS / festivo */}
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
