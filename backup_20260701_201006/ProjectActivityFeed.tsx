"use client";

import { useEffect, useState } from "react";
import { ProjectUpdate } from "@/types";
import { getProjectUpdates } from "@/lib/updates";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Calendar, CheckCircle2, AlertTriangle, FileText, ArrowRight } from "lucide-react";

interface ProjectActivityFeedProps {
    projectId: string;
}

export default function ProjectActivityFeed({ projectId }: ProjectActivityFeedProps) {
    const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUpdates();
    }, [projectId]);

    const loadUpdates = async () => {
        setLoading(true);
        const data = await getProjectUpdates(projectId);
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
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#121212] border-2 border-zinc-600 box-content" />

                        {/* Date Header */}
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {dateLabel}
                            {isToday(dateObj) && <span className="bg-red-500 text-white text-[10px] px-2 rounded-full normal-case">En Curso</span>}
                        </h3>

                        {/* Updates for this day */}
                        <div className="grid gap-4">
                            {group.map(update => (
                                <UpdateCard key={update.id} update={update} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function UpdateCard({ update }: { update: ProjectUpdate }) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-xl p-5 hover:bg-white/[0.07] transition-colors shadow-sm relative overflow-hidden group">
            {/* Type Badge */}
            <div className="absolute top-0 right-0 p-3 opacity-50 group-hover:opacity-100 transition-opacity">
                {update.type === 'weekly' && <span className="text-xs font-mono text-zinc-500">RESUMEN SEMANAL</span>}
                {update.type === 'daily' && <span className="text-xs font-mono text-indigo-400">DAILY UPDATE</span>}
            </div>

            {/* Header: Author */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold">
                    {update.authorName?.[0] || 'S'}
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                    {update.authorName || 'Sistema'}
                </span>
                <span className="text-[10px] text-zinc-600">
                    • {update.date?.toDate ? format(update.date.toDate(), 'HH:mm') : ''}
                </span>
            </div>

            {/* Content: Notes */}
            {update.content.notes && (
                <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed mb-4 font-light">
                    {update.content.notes}
                </div>
            )}

            {/* Content: Tasks / Next Steps */}
            {update.content.nextSteps && update.content.nextSteps.length > 0 && (
                <div className="bg-black/20 rounded-lg p-3 space-y-2 border border-white/5">
                    <h4 className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" /> Acciones Clave
                    </h4>
                    <ul className="space-y-1.5">
                        {update.content.nextSteps.map((step, i) => (
                            <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
