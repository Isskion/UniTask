import { useState, useMemo } from "react";
import { useAvailability } from "@/hooks/useAvailability";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { AvailabilityDialog } from "./AvailabilityDialog";
import { Plus, Edit2, Trash2, Filter, Calendar, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UserAvailability, AVAILABILITY_TYPES } from "@/types/availability";
import { getRoleLevel } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export default function AvailabilityRegistry() {
    const { user, userRole, tenantId } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const isRed = theme === 'red';

    const userLevel = getRoleLevel(userRole);
    const targetTenant = userLevel >= 100 ? "ALL" : (tenantId || "");

    const { availabilities, addAvailability, updateAvailability, deleteAvailability } = useAvailability(targetTenant);
    const { users } = useUsers(targetTenant);

    // State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedAvailability, setSelectedAvailability] = useState<UserAvailability | null>(null);
    const [filterUserId, setFilterUserId] = useState<string>("");
    const [filterType, setFilterType] = useState<string>("all");
    const [startDateFilter, setStartDateFilter] = useState<string>("");
    const [endDateFilter, setEndingDateFilter] = useState<string>("");

    // Filtered data
    const filteredAvailabilities = useMemo(() => {
        let filtered = availabilities;

        // Auto-filter for non-admins (only show own entries)
        if (userLevel < 60 && user) {
            filtered = filtered.filter(a => a.userId === user.uid);
        } else if (filterUserId) {
            // Manual filter for admins
            filtered = filtered.filter(a => a.userId === filterUserId);
        }

        // Type filter
        if (filterType !== "all") {
            filtered = filtered.filter(a => a.type === filterType);
        }

        // Date filter
        if (startDateFilter || endDateFilter) {
            filtered = filtered.filter(a => {
                const aStart = a.startDate instanceof Date ? a.startDate : (a.startDate as any).toDate();
                const aEnd = a.endDate instanceof Date ? a.endDate : (a.endDate as any).toDate();

                let match = true;
                if (startDateFilter) {
                    const sFilter = new Date(startDateFilter);
                    sFilter.setHours(0, 0, 0, 0);
                    if (aEnd < sFilter) match = false;
                }
                if (endDateFilter && match) {
                    const eFilter = new Date(endDateFilter);
                    eFilter.setHours(23, 59, 59, 999);
                    if (aStart > eFilter) match = false;
                }
                return match;
            });
        }

        // Sort by start date (newest first)
        return filtered.sort((a, b) => {
            const dateA = a.startDate instanceof Date ? a.startDate : (a.startDate as any).toDate();
            const dateB = b.startDate instanceof Date ? b.startDate : (b.startDate as any).toDate();
            return dateB.getTime() - dateA.getTime();
        });
    }, [availabilities, filterUserId, filterType, startDateFilter, endDateFilter, userLevel, user]);

    // Handlers
    const handleEdit = (availability: UserAvailability) => {
        setSelectedAvailability(availability);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedAvailability(null);
        setDialogOpen(true);
    };

    const handleSave = async (data: any) => {
        if (selectedAvailability) {
            await updateAvailability(selectedAvailability.id, data);
        } else {
            await addAvailability(data.userId, data.type, data.startDate, data.endDate, data.notes, data.consumedDays);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta entrada?")) return;
        await deleteAvailability(id);
    };

    const getUserName = (userId: string) => {
        const u = users.find(user => user.uid === userId);
        return u?.displayName || u?.email || "Usuario desconocido";
    };

    const canEdit = (availability: UserAvailability) => {
        return userLevel >= 60 || (user && availability.userId === user.uid);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col gap-1">
                    <h2 className={cn("text-2xl font-black tracking-tighter flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                        <Calendar className={cn("w-6 h-6", isRed ? "text-[#D32F2F]" : (isLight ? "text-zinc-900" : "text-white"))} />
                        Registro de Indisponibilidades
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase opacity-70">
                        Gestión de Ausencias y Vacaciones
                    </p>
                </div>

                <button
                    onClick={handleCreate}
                    className={cn(
                        "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2",
                        isRed ? "bg-[#D32F2F] text-white shadow-red-900/40" : (isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200")
                    )}
                >
                    <Plus className="w-4 h-4" /> Nueva Entrada
                </button>
            </div>

            {/* Filters */}
            <div className={cn(
                "flex flex-wrap gap-3 p-4 rounded-xl border",
                isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/10"
            )}>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase">
                    <Filter className="w-4 h-4" /> Filtros:
                </div>

                {userLevel >= 60 && (
                    <select
                        value={filterUserId}
                        onChange={e => setFilterUserId(e.target.value)}
                        className={cn(
                            "px-3 py-1.5 rounded text-xs border outline-none transition-colors",
                            isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-white/5 border-white/10 text-white"
                        )}
                    >
                        <option value="">Todos los usuarios</option>
                        {users.map(u => (
                            <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                        ))}
                    </select>
                )}

                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className={cn(
                        "px-3 py-1.5 rounded text-xs border outline-none transition-colors",
                        isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-white/5 border-white/10 text-white"
                    )}
                >
                    <option value="all">Todos los tipos</option>
                    {Object.entries(AVAILABILITY_TYPES).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Desde</span>
                    <input
                        type="date"
                        value={startDateFilter}
                        onChange={e => setStartDateFilter(e.target.value)}
                        className={cn(
                            "px-2 py-1 rounded text-xs border outline-none transition-colors",
                            isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-white/5 border-white/10 text-white"
                        )}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Hasta</span>
                    <input
                        type="date"
                        value={endDateFilter}
                        onChange={e => setEndingDateFilter(e.target.value)}
                        className={cn(
                            "px-2 py-1 rounded text-xs border outline-none transition-colors",
                            isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-white/5 border-white/10 text-white"
                        )}
                    />
                </div>

                {(filterUserId || filterType !== "all" || startDateFilter || endDateFilter) && (
                    <button
                        onClick={() => {
                            setFilterUserId("");
                            setFilterType("all");
                            setStartDateFilter("");
                            setEndingDateFilter("");
                        }}
                        className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Table */}
            <div className={cn(
                "flex-1 rounded-2xl overflow-hidden border shadow-xl",
                isLight ? "bg-white border-zinc-200 shadow-zinc-100" : "bg-black/40 border-white/5 shadow-black/50"
            )}>
                <div className="overflow-auto h-full">
                    <table className="w-full">
                        <thead className={cn("sticky top-0 z-10", isLight ? "bg-zinc-50" : "bg-black/60 backdrop-blur-sm")}>
                            <tr className={cn("border-b", isLight ? "border-zinc-200" : "border-white/10")}>
                                <th className="text-left px-4 py-3 text-xs font-black uppercase text-zinc-500">Usuario</th>
                                <th className="text-left px-4 py-3 text-xs font-black uppercase text-zinc-500">Tipo</th>
                                <th className="text-left px-4 py-3 text-xs font-black uppercase text-zinc-500">Desde</th>
                                <th className="text-left px-4 py-3 text-xs font-black uppercase text-zinc-500">Hasta</th>
                                <th className="text-left px-4 py-3 text-xs font-black uppercase text-zinc-500">Días</th>
                                <th className="text-left px-4 py-3 text-xs font-black uppercase text-zinc-500">Notas</th>
                                <th className="text-right px-4 py-3 text-xs font-black uppercase text-zinc-500">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAvailabilities.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-zinc-500 text-sm">
                                        No hay registros de indisponibilidad
                                    </td>
                                </tr>
                            ) : (
                                filteredAvailabilities.map(availability => {
                                    const typeConfig = AVAILABILITY_TYPES[availability.type];
                                    const startDate = availability.startDate instanceof Date ? availability.startDate : (availability.startDate as any).toDate();
                                    const endDate = availability.endDate instanceof Date ? availability.endDate : (availability.endDate as any).toDate();

                                    return (
                                        <tr
                                            key={availability.id}
                                            className={cn(
                                                "border-b transition-colors",
                                                isLight ? "border-zinc-100 hover:bg-zinc-50" : "border-white/5 hover:bg-white/5"
                                            )}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <UserIcon className="w-4 h-4 text-zinc-400" />
                                                    <span className={cn("text-sm font-medium", isLight ? "text-zinc-900" : "text-white")}>
                                                        {getUserName(availability.userId)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeConfig.color }} />
                                                    <span className="text-xs font-bold">{typeConfig.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">{format(startDate, "dd MMM yyyy", { locale: es })}</td>
                                            <td className="px-4 py-3 text-sm">{format(endDate, "dd MMM yyyy", { locale: es })}</td>
                                            <td className="px-4 py-3 text-sm font-bold">{availability.consumedDays || 0}</td>
                                            <td className="px-4 py-3 text-xs text-zinc-500 max-w-xs truncate">{availability.notes || "-"}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {canEdit(availability) && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEdit(availability)}
                                                                className="p-1.5 rounded hover:bg-blue-500/10 text-blue-500 transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(availability.id)}
                                                                className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AvailabilityDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                availability={selectedAvailability}
                users={users || []}
                onSave={handleSave}
                onDelete={selectedAvailability ? () => handleDelete(selectedAvailability.id) : undefined}
            />
        </div>
    );
}
