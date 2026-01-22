"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { Loader2, X, Search, History, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import HighlightText from "./ui/HighlightText";
import { useAuth } from "@/context/AuthContext";

export function ActivityAuditModal({ taskId, onClose, isLight, theme }: { taskId: string, onClose: () => void, isLight: boolean, theme?: string }) {
    const { tenantId } = useAuth();
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const isRed = theme === 'red';

    useEffect(() => {
        if (!taskId || !tenantId) return;

        const q = query(
            collection(db, "task_activities"),
            where("taskId", "==", taskId),
            where("tenantId", "==", tenantId), // REQUIRED BY RULES
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setActivities(list);
            setLoading(false);
        }, (err) => {
            console.error("Error loading activities:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [taskId, tenantId]);

    const filtered = activities.filter(a =>
        a.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={cn(
                "rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl transition-colors overflow-hidden",
                isLight ? "bg-white border-zinc-200" : (isRed ? "bg-[#1a0505] border-[#D32F2F]/30" : "bg-[#09090b] border-white/10")
            )}>
                {/* Header */}
                <div className={cn("p-4 border-b flex justify-between items-center shrink-0",
                    isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900" : (isRed ? "bg-[#D32F2F]/10 border-[#D32F2F]/20 text-white" : "bg-white/5 border-white/10 text-white")
                )}>
                    <div className="flex items-center gap-2">
                        <History className={cn("w-5 h-5", isLight ? "text-red-600" : "text-white")} />
                        <h3 className="font-bold">Historial de Actividad</h3>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-white/5 flex gap-2 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar en el historial..."
                            className={cn(
                                "w-full pl-9 pr-4 py-2 text-sm rounded-lg border outline-none transition-all",
                                isLight
                                    ? "bg-zinc-100 border-zinc-300 text-zinc-900 focus:border-red-500"
                                    : "bg-black/40 border-white/10 text-white focus:border-[#D32F2F]"
                            )}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-[#D32F2F]" />
                            <p className="text-sm font-medium">Cargando historial...</p>
                        </div>
                    ) : filtered.length > 0 ? (
                        filtered.map((activity, idx) => (
                            <div key={activity.id} className={cn(
                                "p-4 rounded-xl border relative group transition-all",
                                isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/20 flex items-center justify-center text-[#D32F2F] font-bold text-xs uppercase">
                                            {activity.userName?.substring(0, 2) || "AI"}
                                        </div>
                                        <div>
                                            <div className={cn("text-sm font-bold", isLight ? "text-zinc-950" : "text-white")}>{activity.userName || "Procesador AI"}</div>
                                            <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {activity.createdAt?.seconds ? format(new Date(activity.createdAt.seconds * 1000), "dd MMM yyyy HH:mm", { locale: es }) : "Recién ahora"}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider",
                                        activity.type === 'update' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                            activity.type === 'status_change' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    )}>
                                        {activity.type === 'status_change' ? 'Cambio de Estado' : (activity.type === 'comment' ? 'Comentario' : 'Actualización')}
                                    </span>
                                </div>
                                <div className={cn("text-sm whitespace-pre-wrap leading-relaxed mt-2 p-2 rounded-lg", isLight ? "bg-white/50" : "bg-black/20")}>
                                    <HighlightText text={activity.note || ""} theme={theme} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 opacity-50 flex flex-col items-center gap-3">
                            <History className="w-12 h-12 text-zinc-600" />
                            <p className="text-sm">No se encontraron actividades registradas.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
