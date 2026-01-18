"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { Loader2, X, Search, History, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Helper for highlighting text
const HighlightText = ({ text, highlight }: { text: string, highlight?: string }) => {
    if (!highlight || !text) return <>{text}</>;

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} className="text-indigo-500 font-bold bg-indigo-500/10 rounded-sm px-0.5 -mx-0.5">{part}</span>
                ) : (
                    part
                )
            )}
        </>
    );
};

export function ActivityAuditModal({ taskId, tenantId, onClose, isLight }: { taskId: string, tenantId: string | null, onClose: () => void, isLight: boolean }) {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!tenantId) return;
        const q = query(
            collection(db, "task_activities"),
            where("taskId", "==", taskId),
            where("tenantId", "==", tenantId), // REQUIRED BY RULES
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActivities(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [taskId, tenantId]);

    // Filter activities based on search
    const filteredActivities = activities.filter(act => {
        if (!searchQuery) return true;
        const lowerQ = searchQuery.toLowerCase();
        return (
            (act.details?.toLowerCase().includes(lowerQ)) ||
            (act.userName?.toLowerCase().includes(lowerQ)) ||
            (act.type?.toLowerCase().includes(lowerQ)) ||
            (act.type === 'deadline_change' && 'cambio de fecha límite'.includes(lowerQ)) ||
            (act.type === 'status_change' && 'cambio de estado'.includes(lowerQ)) ||
            (act.type === 'assignment_change' && 'reasignación'.includes(lowerQ)) ||
            (act.type === 'dependency_released' && 'dependencia liberada'.includes(lowerQ)) ||
            (act.type === 'classification_change' && 'cambio de clasificación'.includes(lowerQ)) ||
            (act.type === 'dependency_added' && 'dependencia añadida'.includes(lowerQ)) ||
            (act.type === 'dependency_removed' && 'dependencia eliminada'.includes(lowerQ))
        );
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className={cn("rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 scale-100 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col", isLight ? "bg-white" : "bg-[#18181b] border border-white/10")} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={cn("text-lg font-bold", isLight ? "text-zinc-900" : "text-white")}>Bitácora de Actividad</h3>
                            <p className="text-xs text-zinc-500">Historial de cambios importantes</p>
                        </div>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-red-500 transition-colors" /></button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isLight ? "text-zinc-400" : "text-zinc-500")} />
                    <input
                        type="text"
                        placeholder="Buscar en la bitácora..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                            "w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all",
                            isLight
                                ? "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white"
                                : "bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:bg-black/40"
                        )}
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 italic text-sm">
                            {searchQuery ? "No se encontraron resultados." : "No hay actividad registrada aún."}
                        </div>
                    ) : (
                        filteredActivities.map((act) => (
                            <div key={act.id} className={cn("flex gap-3 p-3 rounded-xl border relative", isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/5")}>
                                {/* Timeline Line */}
                                <div className="absolute left-[19px] top-10 bottom-[-10px] w-0.5 bg-zinc-700/20 last:hidden" />

                                <div className="flex-shrink-0 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <span className={cn("text-xs font-bold", isLight ? "text-zinc-700" : "text-zinc-300")}>
                                            <HighlightText text={
                                                act.type === 'deadline_change' ? 'Cambio de Fecha Límite' :
                                                    act.type === 'status_change' ? 'Cambio de Estado' :
                                                        act.type === 'assignment_change' ? 'Reasignación' :
                                                            act.type === 'classification_change' ? 'Cambio de Clasificación' :
                                                                act.type === 'dependency_released' ? 'Dependencia Liberada' :
                                                                    act.type === 'dependency_added' ? 'Dependencia Añadida' :
                                                                        act.type === 'dependency_removed' ? 'Dependencia Eliminada' :
                                                                            'Actualización'
                                            } highlight={searchQuery} />
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                            <Clock className="w-3 h-3" />
                                            {act.createdAt ? format(act.createdAt.toDate ? act.createdAt.toDate() : new Date(act.createdAt), "dd/MM/yy HH:mm", { locale: es }) : "-"}
                                        </div>
                                    </div>
                                    <p className={cn("text-xs mt-1 leading-relaxed", isLight ? "text-zinc-600" : "text-zinc-400")}>
                                        <HighlightText text={act.details} highlight={searchQuery} />
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white uppercase">
                                            {act.userName?.[0] || "U"}
                                        </div>
                                        <span className="text-[10px] text-zinc-500">
                                            <HighlightText text={act.userName || act.userEmail} highlight={searchQuery} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
