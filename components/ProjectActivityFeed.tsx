"use client";

import { useEffect, useState } from "react";
import { ProjectUpdate } from "@/types";
import { getProjectUpdates } from "@/lib/updates";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Calendar, CheckCircle2, AlertTriangle, FileText, ArrowRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

import { useAuth } from "@/context/AuthContext";

interface ProjectActivityFeedProps {
    projectId: string;
}

export default function ProjectActivityFeed({ projectId }: ProjectActivityFeedProps) {
    const { theme } = useTheme();
    const { tenantId } = useAuth(); // Get Tenant Context
    const isLight = theme === 'light';
    const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUpdates();
    }, [projectId, tenantId]);

    const loadUpdates = async () => {
        setLoading(true);
        // Fallback to "1" if no tenant, but typically should be set
        const data = await getProjectUpdates(projectId, tenantId || "1");
        setUpdates(data);
        setLoading(false);
    };

    // Group by Date for the "Day Header" effect
    const grouped = updates.reduce((acc, update) => {
        const dateKey = update.date?.toDate ? format(update.date.toDate(), 'yyyy-MM-dd') : 'unknown';
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(update);
        return acc;
    }, {} as Record<string, ProjectUpdate[]>);

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (loading) {
        return <div className="p-10 flex justify-center text-zinc-500"><Loader2 className="animate-spin w-6 h-6" /></div>;
    }

    if (updates.length === 0) {
        return (
            <div className="p-10 text-center border border-dashed border-white/10 rounded-xl m-4">
                <p className="text-zinc-500">No hay actividad registrada en este proyecto.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 max-w-3xl mx-auto pb-20">
            {sortedDates.map(dateKey => {
                const group = grouped[dateKey];
                const dateObj = new Date(dateKey);

                // Fancy Date Header
                let dateLabel = format(dateObj, "EEEE d 'de' MMMM", { locale: es });
                if (isToday(dateObj)) dateLabel = "Hoy";
                if (isYesterday(dateObj)) dateLabel = "Ayer";

                return (
                    <div key={dateKey} className="relative pl-6 border-l-2 border-white/10 space-y-6">
                        {/* Timeline Dot */}
                        {/* Timeline Dot */}
                        <div className={cn("absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 box-content", isLight ? "bg-white border-zinc-400" : "bg-background border-zinc-600")} />

                        {/* Date Header */}
                        <h3 className={cn("text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2", isLight ? "text-zinc-600" : "text-zinc-400")}>
                            <Calendar className="w-4 h-4" />
                            {dateLabel}
                            {isToday(dateObj) && <span className="bg-red-500 text-white text-[10px] px-2 rounded-full normal-case">En Curso</span>}
                        </h3>

                        {/* Updates for this day */}
                        <div className="grid gap-4">
                            {group.map(update => (
                                <UpdateCard key={update.id} update={update} isLight={isLight} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function UpdateCard({ update, isLight }: { update: ProjectUpdate, isLight: boolean }) {
    return (
        <div className={cn("border rounded-xl p-5 hover:bg-opacity-80 transition-colors shadow-sm relative overflow-hidden group",
            isLight ? "bg-white border-zinc-200 hover:bg-zinc-50" : "bg-card/30 border-white/5 hover:bg-card/50"
        )}>
            {/* Type Badge */}
            <div className="absolute top-0 right-0 p-3 opacity-50 group-hover:opacity-100 transition-opacity">
                {update.type === 'weekly' && <span className="text-xs font-mono text-muted-foreground">RESUMEN SEMANAL</span>}
                {update.type === 'daily' && <span className="text-xs font-mono text-primary">DAILY UPDATE</span>}
            </div>

            {/* Header: Author */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {update.authorName?.[0] || 'S'}
                </div>
                <span className={cn("text-xs font-medium", isLight ? "text-zinc-700" : "text-zinc-400")}>
                    {update.authorName || 'Sistema'}
                </span>
                <span className={cn("text-[10px]", isLight ? "text-zinc-500" : "text-zinc-500")}>
                    • {update.date?.toDate ? format(update.date.toDate(), 'HH:mm') : ''}
                </span>
            </div>

            {/* Content: Notes */}
            {update.content.notes && (
                <div className={cn("text-sm whitespace-pre-wrap leading-relaxed mb-4 font-light", isLight ? "text-zinc-900" : "text-zinc-200")}>
                    {update.content.notes}
                </div>
            )}

            {/* Content: Tasks / Next Steps */}
            {update.content.nextSteps && update.content.nextSteps.length > 0 && (
                <div className={cn("rounded-lg p-3 space-y-2 border", isLight ? "bg-zinc-50 border-zinc-200" : "bg-muted/30 border-white/5")}>
                    <h4 className={cn("text-[10px] uppercase font-bold flex items-center gap-2", isLight ? "text-zinc-600" : "text-muted-foreground")}>
                        <ArrowRight className="w-3 h-3" /> Acciones Clave
                    </h4>
                    <ul className="space-y-1.5">
                        {update.content.nextSteps.map((step, i) => (
                            <li key={i} className={cn("text-xs flex items-start gap-2", isLight ? "text-zinc-800" : "text-zinc-300")}>
                                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
