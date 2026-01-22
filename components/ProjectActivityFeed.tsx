"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { TimelineEvent } from "@/types";
import { getProjectTimeline } from "@/lib/updates";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Calendar, CheckCircle2, AlertTriangle, FileText, ArrowRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

import { useAuth } from "@/context/AuthContext";
import HighlightText from "./ui/HighlightText";

interface ProjectActivityFeedProps {
    projectId: string;
    projectOrganizationId?: string; // Specific organization of the project
    projectName?: string;
    searchQuery?: string;
}

export interface ProjectActivityFeedHandle {
    copyResults: () => void;
}

const ProjectActivityFeed = forwardRef<ProjectActivityFeedHandle, ProjectActivityFeedProps>(({ projectId, projectOrganizationId, projectName = "Project", searchQuery = "" }, ref) => {
    const { theme } = useTheme();
    const { tenantId: organizationId } = useAuth(); // Get Organization Context
    const isLight = theme === 'light';
    const { showToast } = useToast();
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [fullHistoryLoaded, setFullHistoryLoaded] = useState(false);
    const [fetchingHistory, setFetchingHistory] = useState(false);

    useEffect(() => {
        loadTimeline(false);
    }, [projectId, organizationId]);

    // Trigger Full History Load when searching
    useEffect(() => {
        if (searchQuery && !fullHistoryLoaded && !fetchingHistory) {
            loadTimeline(true);
        }
    }, [searchQuery, fullHistoryLoaded, fetchingHistory]);

    const loadTimeline = async (loadFull: boolean) => {
        if (loadFull) {
            setFetchingHistory(true);
        } else {
            setLoading(true);
        }

        const limitCount = loadFull ? -1 : 50;

        try {
            const targetOrgId = projectOrganizationId || organizationId || "1";
            const data = await getProjectTimeline(projectId, targetOrgId, limitCount, projectName);

            setEvents(data);

            if (loadFull) {
                setFullHistoryLoaded(true);
            }
        } catch (e) {
            console.error("Failed to load timeline", e);
        } finally {
            setLoading(false);
            setFetchingHistory(false);
        }
    };

    // Filter Events based on Search Query
    const filteredEvents = events.filter(event => {
        if (!searchQuery) return true;
        const lowerQ = searchQuery.toLowerCase();
        return (
            (event.content.notes?.toLowerCase().includes(lowerQ)) ||
            (event.authorName?.toLowerCase().includes(lowerQ)) ||
            (event.content.nextSteps?.some(step => step.toLowerCase().includes(lowerQ)))
        );
    });

    // Expose Copy Function
    useImperativeHandle(ref, () => ({
        copyResults: () => {
            if (filteredEvents.length === 0) {
                showToast("Clipboard", "No results to copy", "warning");
                return;
            }

            const header = `SEARCH RESULTS: "${searchQuery}"\nPROJECT: ${projectName}\nDATE: ${new Date().toLocaleDateString()}\n----------------------------------------\n\n`;

            const content = filteredEvents.map(u => {
                const date = u.date?.toDate ? format(u.date.toDate(), 'dd/MM/yyyy HH:mm') : 'Unknown Date';
                const author = u.authorName || 'System';
                let text = `[${date}] ${author}:\n${u.content.notes || ''}\n`;

                if (u.content.nextSteps && u.content.nextSteps.length > 0) {
                    text += `ACTIONS: \n${u.content.nextSteps.map(s => ` - ${s}`).join('\n')}\n`;
                }
                return text;
            }).join('\n----------------------------------------\n\n');

            navigator.clipboard.writeText(header + content)
                .then(() => showToast("Clipboard", "Results copied to clipboard", "success"))
                .catch(() => showToast("Error", "Could not copy to clipboard", "error"));
        }
    }));

    // Group by Date for the "Day Header" effect
    const grouped = filteredEvents.reduce((acc, event) => {
        const dateKey = event.date?.toDate ? format(event.date.toDate(), 'yyyy-MM-dd') : 'unknown';
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, TimelineEvent[]>);

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (loading) {
        return <div className="p-10 flex justify-center text-zinc-500"><Loader2 className="animate-spin w-6 h-6" /></div>;
    }

    if (events.length === 0) {
        return (
            <div className="p-10 text-center border border-dashed border-white/10 rounded-xl m-4">
                <p className="text-zinc-500">No activity recorded for this project.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 max-w-3xl mx-auto pb-20">
            {sortedDates.map(dateKey => {
                const group = grouped[dateKey];
                const dateObj = new Date(dateKey);

                let dateLabel = format(dateObj, "EEEE d 'of' MMMM", { locale: es }); // Keep locale for UI? The plan said English as universal language for code. Usually UI follows locale settings.
                if (isToday(dateObj)) dateLabel = "Today";
                if (isYesterday(dateObj)) dateLabel = "Yesterday";

                return (
                    <div key={dateKey} className="relative pl-6 border-l-2 border-white/10 space-y-6">
                        <div className={cn("absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 box-content", isLight ? "bg-white border-zinc-400" : "bg-background border-zinc-600")} />

                        <h3 className={cn("text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2", isLight ? "text-zinc-600" : "text-zinc-400")}>
                            <Calendar className="w-4 h-4" />
                            {dateLabel}
                            {isToday(dateObj) && <span className="bg-red-500 text-white text-[10px] px-2 rounded-full normal-case">In Progress</span>}
                        </h3>

                        <div className="grid gap-4">
                            {group.map(event => (
                                <TimelineCard key={event.id} event={event} isLight={isLight} searchQuery={searchQuery} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default ProjectActivityFeed;

// Local HighlightText removed in favor of shared component in @/components/ui/HighlightText

function TimelineCard({ event, isLight, searchQuery }: { event: TimelineEvent, isLight: boolean, searchQuery?: string }) {
    return (
        <div className={cn("border rounded-xl p-5 hover:bg-opacity-80 transition-colors shadow-sm relative overflow-hidden group",
            isLight ? "bg-white border-zinc-200 hover:bg-zinc-50" : "bg-card/30 border-white/5 hover:bg-card/50"
        )}>
            {/* Type Badge */}
            <div className="absolute top-0 right-0 p-3 opacity-50 group-hover:opacity-100 transition-opacity">
                {event.type === 'weekly' && <span className="text-xs font-mono text-muted-foreground">SUMMARY</span>}
                {event.type === 'daily' && <span className="text-xs font-mono text-primary">DAILY UPDATE</span>}
            </div>

            {/* Header: Author */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {event.authorName?.[0] || 'S'}
                </div>
                <span className={cn("text-xs font-medium", isLight ? "text-zinc-700" : "text-zinc-400")}>
                    <HighlightText text={event.authorName || 'System'} highlight={searchQuery} />
                </span>
                <span className={cn("text-[10px]", isLight ? "text-zinc-500" : "text-zinc-500")}>
                    • {event.date?.toDate ? format(event.date.toDate(), 'HH:mm') : ''}
                </span>
            </div>

            {/* Content: Notes */}
            {event.content.notes && (
                <div className={cn("text-sm whitespace-pre-wrap leading-relaxed mb-4 font-light", isLight ? "text-zinc-900" : "text-zinc-200")}>
                    <HighlightText text={event.content.notes} highlight={searchQuery} />
                </div>
            )}

            {/* Content: Tasks / Next Steps */}
            {event.content.nextSteps && event.content.nextSteps.length > 0 && (
                <div className={cn("rounded-lg p-3 space-y-2 border", isLight ? "bg-zinc-50 border-zinc-200" : "bg-muted/30 border-white/5")}>
                    <h4 className={cn("text-[10px] uppercase font-bold flex items-center gap-2", isLight ? "text-zinc-600" : "text-muted-foreground")}>
                        <ArrowRight className="w-3 h-3" /> Key Actions
                    </h4>
                    <ul className="space-y-1.5">
                        {event.content.nextSteps.map((step, i) => (
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
