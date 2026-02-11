
import { useState } from "react";
import { useAvailability } from "@/hooks/useAvailability";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { ResourceTimeline } from "./ResourceTimeline";
import { AvailabilityDialog } from "./AvailabilityDialog";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter, Layers } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { UserAvailability } from "@/types/availability";
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

    // Handlers
    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    const handleEntryClick = (entry: UserAvailability) => {
        setSelectedAvailability(entry);
        setDialogOpen(true);
    };

    const handleEmptyCellClick = (targetUser: UserProfile, date: Date) => {
        setSelectedAvailability(null);
        // Ideally we pass date/user to dialog, for now user manually selects in dialog (simpler MVP)
        // If we want to pre-fill, we'd need to extend AvailabilityDialog props.
        // Let's stick to simple MVP for now or update Dialog if easy.
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
