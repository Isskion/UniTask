import { useState, useEffect } from "react";
import { useAvailability } from "@/hooks/useAvailability";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { ResourceTimeline } from "./ResourceTimeline";
import { AvailabilityDialog } from "./AvailabilityDialog";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Layers } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { UserAvailability, AVAILABILITY_TYPES, AvailabilityType } from "@/types/availability";
import { UserProfile, getRoleLevel } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { updateUserClaimsFunction } from "@/lib/functions";
import { RefreshCw } from "lucide-react";

export default function AvailabilityManager() {
    const { user, userRole, tenantId } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const isRed = theme === 'red';
    const { showToast } = useToast();
    const [syncing, setSyncing] = useState(false);

    const userLevel = getRoleLevel(userRole);
    const targetTenant = userLevel >= 100 ? "ALL" : (tenantId || "");

    const { availabilities, addAvailability, updateAvailability, deleteAvailability } = useAvailability(targetTenant);
    const { users } = useUsers(targetTenant);

    // State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedAvailability, setSelectedAvailability] = useState<UserAvailability | null>(null);

    // Quick Register State
    const [quickUserId, setQuickUserId] = useState("");
    const [quickType, setQuickType] = useState<AvailabilityType>("vacation");
    const [quickStartDate, setQuickStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [quickEndDate, setQuickEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [quickNotes, setQuickNotes] = useState("");
    const [quickLoading, setQuickLoading] = useState(false);

    useEffect(() => {
        if (user && userLevel < 60) {
            setQuickUserId(user.uid);
        }
    }, [user, userLevel]);

    // Handlers
    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    const handleEntryClick = (entry: UserAvailability) => {
        setSelectedAvailability(entry);
        setDialogOpen(true);
    };

    const handleEmptyCellClick = (targetUser: UserProfile, date: Date) => {
        setSelectedAvailability(null);
        setDialogOpen(true);
    };

    const handleSave = async (data: any) => {
        if (selectedAvailability) {
            await updateAvailability(selectedAvailability.id, data);
        } else {
            await addAvailability(data.userId, data.type, data.startDate, data.endDate, data.notes);
        }
    };

    const handleDelete = async (id: string) => {
        await deleteAvailability(id);
    };

    const handleRefreshPermissions = async () => {
        if (!user) return;
        setSyncing(true);
        try {
            await updateUserClaimsFunction({ targetUserId: user.uid });
            // Force token refresh
            await user.getIdToken(true);
            showToast("Permissions Synced", "Please refresh the page now.", "success");
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            showToast("Error", "Failed to sync permissions: " + error.message, "error");
        } finally {
            setSyncing(false);
        }
    };

    const handleQuickSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickUserId) {
            showToast("Error", "Por favor seleccione un recurso", "error");
            return;
        }

        if (new Date(quickStartDate) > new Date(quickEndDate)) {
            showToast("Error", "La fecha de inicio no puede ser posterior a la de fin", "error");
            return;
        }

        setQuickLoading(true);
        try {
            await addAvailability(
                quickUserId,
                quickType,
                new Date(quickStartDate),
                new Date(quickEndDate),
                quickNotes.trim() || `${AVAILABILITY_TYPES[quickType].label} registrado`
            );
            showToast("Éxito", `${AVAILABILITY_TYPES[quickType].label} registrado correctamente`, "success");
            
            // Reset form fields except resource and type
            setQuickStartDate(format(new Date(), "yyyy-MM-dd"));
            setQuickEndDate(format(new Date(), "yyyy-MM-dd"));
            setQuickNotes("");
        } catch (err: any) {
            console.error(err);
            showToast("Error", "Error al registrar ausencia: " + err.message, "error");
        } finally {
            setQuickLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col gap-1">
                    <h2 className={cn("text-2xl font-black tracking-tighter flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                        <Layers className={cn("w-6 h-6", isRed ? "text-[#D32F2F]" : (isLight ? "text-zinc-900" : "text-white"))} />
                        DispoPlan
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase opacity-70">Planner de Vacaciones y Ausencias</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefreshPermissions}
                        disabled={syncing}
                        className={cn(
                            "p-2 rounded-xl border transition-all hover:scale-105 active:scale-95",
                            isLight ? "border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50" : "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                        title="Sync Permissions"
                    >
                        <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                    </button>

                    <button
                        onClick={() => { setSelectedAvailability(null); setDialogOpen(true); }}
                        className={cn(
                            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2",
                            isRed ? "bg-[#D32F2F] text-white shadow-red-900/40" : (isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200")
                        )}
                    >
                        <Plus className="w-4 h-4" /> Nuevo Registro
                    </button>
                </div>
            </div>

            {/* Quick Holiday Load Form */}
            <form onSubmit={handleQuickSubmit} className={cn(
                "p-4 rounded-xl border flex flex-wrap items-end gap-4 shadow-sm transition-all duration-300",
                isLight ? "bg-white border-zinc-200" : "bg-[#18181b] border-zinc-800 ring-1 ring-white/5"
            )}>
                <div className="flex-1 min-w-[200px] space-y-1">
                    <label className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>
                        Recurso
                    </label>
                    {userLevel >= 60 ? (
                        <select
                            value={quickUserId}
                            onChange={e => setQuickUserId(e.target.value)}
                            className={cn(
                                "w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all",
                                isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400" : "bg-black/50 border-zinc-800 text-white focus:border-zinc-700"
                            )}
                            required
                        >
                            <option value="">Seleccionar recurso...</option>
                            {users.map(u => (
                                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={users.find(u => u.uid === user?.uid)?.displayName || user?.email || ""}
                            disabled
                            className={cn(
                                "w-full px-3 py-1.5 rounded-lg border text-sm opacity-60 cursor-not-allowed",
                                isLight ? "bg-zinc-100 border-zinc-200 text-zinc-500" : "bg-white/5 border-zinc-800 text-zinc-400"
                            )}
                        />
                    )}
                </div>

                <div className="flex-1 min-w-[180px] space-y-1">
                    <label className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>
                        Tipo de Registro
                    </label>
                    <select
                        value={quickType}
                        onChange={e => setQuickType(e.target.value as AvailabilityType)}
                        className={cn(
                            "w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all",
                            isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400" : "bg-black/50 border-zinc-800 text-white focus:border-zinc-700"
                        )}
                    >
                        {Object.entries(AVAILABILITY_TYPES).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                </div>

                <div className="w-[145px] space-y-1">
                    <label className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>
                        Fecha Inicio
                    </label>
                    <input
                        type="date"
                        value={quickStartDate}
                        onChange={e => setQuickStartDate(e.target.value)}
                        className={cn(
                            "w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all",
                            isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400" : "bg-black/50 border-zinc-800 text-white focus:border-zinc-700"
                        )}
                        required
                    />
                </div>

                <div className="w-[145px] space-y-1">
                    <label className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>
                        Fecha Fin
                    </label>
                    <input
                        type="date"
                        value={quickEndDate}
                        onChange={e => setQuickEndDate(e.target.value)}
                        className={cn(
                            "w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all",
                            isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400" : "bg-black/50 border-zinc-800 text-white focus:border-zinc-700"
                        )}
                        required
                    />
                </div>

                <div className="flex-1 min-w-[150px] space-y-1">
                    <label className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>
                        Notas / Motivo
                    </label>
                    <input
                        type="text"
                        value={quickNotes}
                        onChange={e => setQuickNotes(e.target.value)}
                        placeholder="Opcional..."
                        className={cn(
                            "w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all",
                            isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400" : "bg-black/50 border-zinc-800 text-white focus:border-zinc-700"
                        )}
                    />
                </div>

                <button
                    type="submit"
                    disabled={quickLoading || !quickUserId}
                    className={cn(
                        "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 h-[38px]",
                        isRed ? "bg-[#D32F2F] text-white shadow-red-900/20 hover:bg-[#B71C1C]" : (isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200")
                    )}
                >
                    {quickLoading ? "Registrando..." : "Registrar"}
                </button>
            </form>

            <div className={cn(
                "flex-1 flex flex-col rounded-2xl overflow-hidden border shadow-xl relative",
                isLight ? "bg-white border-zinc-200 shadow-zinc-100" : "bg-black/40 border-white/5 shadow-black/50"
            )}>
                {/* Header Toolbar */}
                <div className={cn("p-4 border-b flex items-center justify-between shrink-0 gap-4", isLight ? "border-zinc-100" : "border-white/5")}>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevMonth}
                            className={cn("p-2 rounded-lg border transition-all hover:scale-105", isLight ? "border-zinc-200 hover:bg-zinc-50 text-zinc-500" : "border-white/10 hover:bg-white/5 text-zinc-400")}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className={cn("font-black text-xl w-48 text-center capitalize tracking-tight", isLight ? "text-zinc-900" : "text-white")}>
                            {format(currentMonth, 'MMMM yyyy', { locale: es })}
                        </div>
                        <button
                            onClick={handleNextMonth}
                            className={cn("p-2 rounded-lg border transition-all hover:scale-105", isLight ? "border-zinc-200 hover:bg-zinc-50 text-zinc-500" : "border-white/10 hover:bg-white/5 text-zinc-400")}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase">
                        <CalendarIcon className="w-4 h-4" />
                        Vista Mensual
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-4">
                    <ResourceTimeline
                        users={users || []}
                        availabilities={availabilities}
                        month={currentMonth}
                        onEntryClick={handleEntryClick}
                        onEmptyCellClick={handleEmptyCellClick}
                    />
                    {users.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur-sm pointer-events-auto text-sm text-center">
                                <p className="font-bold">No se encontraron recursos.</p>
                                <p className="text-xs opacity-70">Verifique que su usuario tenga asignado un Tenant ID.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AvailabilityDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                availability={selectedAvailability}
                users={users || []}
                onSave={handleSave}
                onDelete={handleDelete}
            />
        </div>
    );
}
