"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { ProjectUpdate } from "@/types";
import { getProjectUpdates } from "@/lib/updates";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Calendar, CheckCircle2, AlertTriangle, FileText, ArrowRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

import { useAuth } from "@/context/AuthContext";

interface ProjectActivityFeedProps {
    projectId: string;
    projectTenantId?: string; // New: Specific tenant of the project
    projectName?: string;
    searchQuery?: string;
}

export interface ProjectActivityFeedHandle {
    copyResults: () => void;
}

const ProjectActivityFeed = forwardRef<ProjectActivityFeedHandle, ProjectActivityFeedProps>(({ projectId, projectTenantId, projectName = "Proyecto", searchQuery = "" }, ref) => {
    const { theme } = useTheme();
    const { tenantId } = useAuth(); // Get Tenant Context
    const isLight = theme === 'light';
    const { showToast } = useToast();
    const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [fullHistoryLoaded, setFullHistoryLoaded] = useState(false);
    const [fetchingHistory, setFetchingHistory] = useState(false);

    useEffect(() => {
        loadUpdates(false);
    }, [projectId, tenantId]);

    // Trigger Full History Load when searching - Debounced slightly by effect nature, but need gating
    useEffect(() => {
        if (searchQuery && !fullHistoryLoaded && !fetchingHistory) {
            loadUpdates(true);
        }
    }, [searchQuery, fullHistoryLoaded, fetchingHistory]);

    const loadUpdates = async (loadFull: boolean) => {
        // If loading full history, only set fetching flag, don't wipe UI
        if (loadFull) {
            setFetchingHistory(true);
        } else {
            setLoading(true);
        }

        // limit = -1 for full history, 50 for default
        const limitCount = loadFull ? -1 : 50;

        try {
            // [FIX] Use projectTenantId if provided, fallback to current session tenantId
            const targetTenantId = projectTenantId || tenantId || "1";
            const data = await getProjectUpdates(projectId, targetTenantId, limitCount, projectName);

            // Only update if we have data or if it's the initial load
            // If historical fetch fails (e.g. index error), we might get partial data. 
            // We should still likely update, but strictly logically.
            setUpdates(data);

            if (loadFull) {
                setFullHistoryLoaded(true);
            }
        } catch (e) {
            console.error("Failed to load updates", e);
        } finally {
            setLoading(false);
            setFetchingHistory(false);
        }
    };

    // Filter Updates based on Search Query
    const filteredUpdates = updates.filter(update => {
        if (!searchQuery) return true;
        const lowerQ = searchQuery.toLowerCase();
        return (
            (update.content.notes?.toLowerCase().includes(lowerQ)) ||
            (update.authorName?.toLowerCase().includes(lowerQ)) ||
            (update.content.nextSteps?.some(step => step.toLowerCase().includes(lowerQ)))
        );
    });

    // Expose Copy Function
    useImperativeHandle(ref, () => ({
        copyResults: () => {
            if (filteredUpdates.length === 0) {
                showToast("Portapapeles", "No hay resultados para copiar", "warning");
                return;
            }

            const header = `RESULTADOS DE BÚSQUEDA: "${searchQuery}"\nPROYECTO: ${projectName}\nFECHA: ${new Date().toLocaleDateString()}\n----------------------------------------\n\n`;

            const content = filteredUpdates.map(u => {
                const date = u.date?.toDate ? format(u.date.toDate(), 'dd/MM/yyyy HH:mm') : 'Fecha Desc.';
                const author = u.authorName || 'Sistema';
                let text = `[${date}] ${author}:\n${u.content.notes || ''}\n`;

                if (u.content.nextSteps && u.content.nextSteps.length > 0) {
                    text += `ACCIONES: \n${u.content.nextSteps.map(s => ` - ${s}`).join('\n')}\n`;
                }
                return text;
            }).join('\n----------------------------------------\n\n');

            navigator.clipboard.writeText(header + content)
                .then(() => showToast("Portapapeles", "Resultados copiados al portapapeles", "success"))
                .catch(() => showToast("Error", "No se pudo copiar al portapapeles", "error"));
        }
    }));

    // Group by Date for the "Day Header" effect
    const grouped = filteredUpdates.reduce((acc, update) => {
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
                                <UpdateCard key={update.id} update={update} isLight={isLight} searchQuery={searchQuery} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default ProjectActivityFeed;

// Helper for highlighting text
const HighlightText = ({ text, highlight }: { text: string, highlight?: string }) => {
    if (!highlight || !text) return <>{text}</>;

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} className="text-red-500 font-bold bg-red-500/10 rounded-sm px-0.5 -mx-0.5">{part}</span>
                ) : (
                    part
                )
            )}
        </>
    );
};

function UpdateCard({ update, isLight, searchQuery }: { update: ProjectUpdate, isLight: boolean, searchQuery?: string }) {
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
                    <HighlightText text={update.authorName || 'Sistema'} highlight={searchQuery} />
                </span>
                <span className={cn("text-[10px]", isLight ? "text-zinc-500" : "text-zinc-500")}>
                    • {update.date?.toDate ? format(update.date.toDate(), 'HH:mm') : ''}
                </span>
            </div>

            {/* Content: Notes */}
            {update.content.notes && (
                <div className={cn("text-sm whitespace-pre-wrap leading-relaxed mb-4 font-light", isLight ? "text-zinc-900" : "text-zinc-200")}>
                    <HighlightText text={update.content.notes} highlight={searchQuery} />
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
                                <HighlightText text={step} highlight={searchQuery} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
