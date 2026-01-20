"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, where, getDocs, limit } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { SupportTicket } from "@/types";
import {
    LifeBuoy,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    MoreHorizontal,
    Trash2,
    ExternalLink,
    User,
    Building,
    Mail,
    Layout,
    ChevronDown,
    Loader2,
    RefreshCw,
    WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function SupportManagement() {
    const { user, userRole, identity } = useAuth();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const isLight = theme === 'light';
    const isRed = theme === 'red';

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [updating, setUpdating] = useState<string | null>(null);

    const [isOffline, setIsOffline] = useState(false);

    // Precise Role Level Check (Matches Rules)
    const isSuperAdmin = (identity?.realRole ? Number(identity.realRole) : 0) >= 100;

    const fetchTickets = async () => {
        if (!user) return;
        setLoading(true);
        try {
            let q;
            if (isSuperAdmin) {
                q = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"), limit(50));
            } else {
                q = query(collection(db, "support_tickets"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(50));
            }
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket));
            setTickets(list);
            setIsOffline(snap.metadata.fromCache);
        } catch (e: any) {
            console.error("Manual fetch error:", e.code, e.message);
            showToast("Error", `No se pudieron obtener los tickets: ${e.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || !identity) return;

        let q;
        console.log(`[SupportMgmt] Effect starting. User: ${user.uid}, isSuperAdmin (client): ${isSuperAdmin}, IdentityRole: ${identity?.realRole}`);

        if (isSuperAdmin) {
            // Superadmin: All tickets
            console.log(`[SupportMgmt] Querying ALL tickets (Superadmin view)`);
            q = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"), limit(100));
        } else {
            console.warn("[SupportMgmt] Access restricted to Superadmins.");
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket));
            setTickets(list);
            setLoading(false);
            setIsOffline(snap.metadata.fromCache);
        }, (error) => {
            console.error("Firestore snapshot error:", error.code, error.message);
            if (error.code === 'unavailable') {
                setIsOffline(true);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, isSuperAdmin]);

    const handleStatusChange = async (ticketId: string, newStatus: string) => {
        if (!isSuperAdmin) return;
        setUpdating(ticketId);
        try {
            await updateDoc(doc(db, "support_tickets", ticketId), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            showToast("Actualizado", `Estado cambiado a ${newStatus}`, "success");
        } catch (error) {
            console.error("Error updating status:", error);
            showToast("Error", "No se pudo actualizar el estado", "error");
        } finally {
            setUpdating(null);
        }
    };

    const handleDelete = async (ticketId: string) => {
        if (!isSuperAdmin) return;
        if (!confirm("¿Seguro que quieres eliminar este ticket?")) return;
        try {
            await deleteDoc(doc(db, "support_tickets", ticketId));
            showToast("Eliminado", "Ticket eliminado correctamente", "success");
        } catch (error) {
            showToast("Error", "No se pudo eliminar el ticket", "error");
        }
    };

    const filteredTickets = tickets.filter(t => {
        const matchesSearch =
            t.userName.toLowerCase().includes(search.toLowerCase()) ||
            t.message.toLowerCase().includes(search.toLowerCase()) ||
            t.userEmail.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            in_progress: "bg-orange-500/10 text-orange-500 border-orange-500/20",
            resolved: "bg-green-500/10 text-green-500 border-green-500/20",
            closed: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
        };
        const labels: Record<string, string> = {
            open: t('support.status_open'),
            in_progress: t('support.status_in_progress'),
            resolved: t('support.status_resolved'),
            closed: t('support.status_closed')
        };
        return (
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", styles[status] || styles.open)}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-md">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <LifeBuoy className="w-5 h-5 text-primary" />
                        {t('support.management_title')}
                    </h2>
                    <div className="h-6 w-px bg-border mx-2" />
                    <div className="relative group max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground"
                            placeholder={t('support.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isOffline && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-bold">
                            <WifiOff className="w-3 h-3" /> Sin conexión
                        </div>
                    )}
                    <button
                        onClick={fetchTickets}
                        disabled={loading}
                        className={cn(
                            "p-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-muted-foreground transition-all",
                            loading && "animate-spin"
                        )}
                        title="Refrescar lista"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    {isSuperAdmin && (
                        <button
                            onClick={async () => {
                                if (!confirm("¿Seguro que quieres borrar TODOS los tickets y sus notificaciones?")) return;
                                const { cleanupSupportDataAction } = await import("@/app/actions/cleanup-support");
                                const res = await cleanupSupportDataAction();
                                if (res.success) showToast("Limpieza Completa", res.message || "", "success");
                                else showToast("Error", res.error || "", "error");
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                        >
                            Limpiar Todo
                        </button>
                    )}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none hover:bg-secondary transition-all"
                    >
                        <option value="all">{t('support.all_status')}</option>
                        <option value="open">{t('support.status_open')}</option>
                        <option value="in_progress">{t('support.status_in_progress')}</option>
                        <option value="closed">{t('support.status_closed')}</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm">{t('common.loading')}</span>
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground py-20 bg-card/30 rounded-2xl border border-dashed border-border">
                        <LifeBuoy className="w-12 h-12 opacity-20" />
                        <p className="text-sm font-medium">No se encontraron tickets.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                className={cn(
                                    "p-5 rounded-2xl border transition-all flex flex-col gap-4 shadow-sm hover:shadow-md",
                                    isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-white/5"
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center border",
                                            isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/10"
                                        )}>
                                            <User className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                                                {ticket.userName}
                                                <StatusBadge status={ticket.status} />
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {ticket.userEmail}</span>
                                                <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {ticket.tenantId}</span>
                                                <span className="flex items-center gap-1"><Layout className="w-3 h-3" /> {ticket.context}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right mr-4 hidden sm:block">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('support.created_at') || 'Creado el'}</p>
                                            <p className="text-xs font-mono text-muted-foreground">
                                                {ticket.createdAt?.toDate ? format(ticket.createdAt.toDate(), 'dd MMM, HH:mm') : '--'}
                                            </p>
                                        </div>
                                        {isSuperAdmin && (
                                            <div className="flex items-center gap-1">
                                                <select
                                                    disabled={updating === ticket.id}
                                                    value={ticket.status}
                                                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                                                    className={cn(
                                                        "bg-secondary/50 border border-border rounded-lg px-2 py-1 text-[11px] font-bold text-foreground focus:outline-none hover:bg-secondary transition-all",
                                                        updating === ticket.id && "opacity-50"
                                                    )}
                                                >
                                                    <option value="open">{t('support.status_open')}</option>
                                                    <option value="in_progress">{t('support.status_in_progress')}</option>
                                                    <option value="closed">{t('support.status_closed')}</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDelete(ticket.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={cn(
                                    "p-4 rounded-xl border text-sm leading-relaxed",
                                    isLight ? "bg-zinc-50 border-zinc-200 text-zinc-700" : "bg-white/5 border-white/5 text-zinc-300"
                                )}>
                                    {ticket.message}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
