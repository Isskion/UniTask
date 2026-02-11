
import { useState, useEffect } from "react";
import { UserAvailability, AVAILABILITY_TYPES, AvailabilityType } from "@/types/availability";
import { UserProfile, getRoleLevel } from "@/types";
import { format } from "date-fns";
import { X, Save, Trash2, Calendar, User, FileText } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface AvailabilityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availability?: UserAvailability | null;
    users: UserProfile[];
    onSave: (data: any) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

export function AvailabilityDialog({
    open,
    onOpenChange,
    availability,
    users,
    onSave,
    onDelete
}: AvailabilityDialogProps) {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const isRed = theme === 'red';
    const { user, userRole } = useAuth();
    const userLevel = getRoleLevel(userRole);

    const [userId, setUserId] = useState("");
    const [type, setType] = useState<AvailabilityType>("vacation");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            if (availability) {
                setUserId(availability.userId);
                setType(availability.type);
                const start = availability.startDate instanceof Date ? availability.startDate : (availability.startDate as any).toDate();
                const end = availability.endDate instanceof Date ? availability.endDate : (availability.endDate as any).toDate();

                setStartDate(format(start, "yyyy-MM-dd"));
                setEndDate(format(end, "yyyy-MM-dd"));
                setNotes(availability.notes || "");
            } else {
                // If creating new and NOT admin, force own ID
                setUserId(userLevel < 60 && user ? user.uid : "");
                setType("vacation");
                setStartDate(format(new Date(), "yyyy-MM-dd"));
                setEndDate(format(new Date(), "yyyy-MM-dd"));
                setNotes("");
            }
        }
    }, [open, availability]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({
                userId,
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                notes
            });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!availability || !onDelete) return;
        if (!confirm("¿Estás seguro de eliminar esta entrada?")) return;

        setSaving(true);
        try {
            await onDelete(availability.id);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    // Styles
    const bgBase = isLight ? "bg-white" : (isRed ? "bg-[#1a0505]" : "bg-black");
    const borderBase = isLight ? "border-zinc-200" : (isRed ? "border-red-900/30" : "border-zinc-800");
    const textBase = isLight ? "text-zinc-900" : "text-white";
    const inputBg = isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/10";

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className={cn(
                "w-full max-w-lg rounded-xl flex flex-col overflow-hidden shadow-2xl border transition-colors",
                bgBase, borderBase
            )}>
                <div className={cn("p-4 border-b flex justify-between items-center", isLight ? "border-zinc-100" : "border-white/5")}>
                    <h2 className={cn("text-lg font-bold flex items-center gap-2", textBase)}>
                        {availability ? "Editar Disponibilidad" : "Nueva Ausencia"}
                    </h2>
                    <button onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                            <User className="w-3 h-3" /> Recurso
                        </label>
                        <select
                            value={userId}
                            onChange={e => setUserId(e.target.value)}
                            // Disable if editing existing (always) OR if creating new but not an admin/manager
                            disabled={!!availability || userLevel < 60}
                            className={cn("w-full px-3 py-2 rounded text-sm outline-none focus:border-blue-500 transition-colors", inputBg, textBase, (!!availability || userLevel < 60) && "opacity-50 cursor-not-allowed")}
                            required
                        >
                            <option value="">Seleccionar recurso...</option>
                            {users.map(u => (
                                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Tipo de Ausencia
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(AVAILABILITY_TYPES).map(([key, config]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setType(key as AvailabilityType)}
                                    className={cn(
                                        "px-3 py-2 rounded text-xs font-bold flex items-center gap-2 border transition-all",
                                        type === key
                                            ? (isLight ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-black border-white")
                                            : (isLight ? "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300" : "bg-white/5 text-zinc-400 border-transparent hover:bg-white/10")
                                    )}
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                                    {config.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Desde
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className={cn("w-full px-3 py-2 rounded text-sm outline-none focus:border-blue-500 transition-colors", inputBg, textBase)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Hasta
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className={cn("w-full px-3 py-2 rounded text-sm outline-none focus:border-blue-500 transition-colors", inputBg, textBase)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Notas</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Detalles adicionales..."
                            className={cn("w-full px-3 py-2 rounded text-sm outline-none focus:border-blue-500 transition-colors min-h-[80px]", inputBg, textBase)}
                        />
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-white/5 justify-end">
                        {availability && onDelete && (userLevel >= 60 || (user && availability.userId === user.uid)) && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={saving}
                                className="mr-auto text-red-500 hover:text-red-400 text-xs font-bold uppercase flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 rounded transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                            className={cn("px-4 py-2 rounded text-sm font-bold transition-colors", isLight ? "text-zinc-500 hover:bg-zinc-100" : "text-zinc-400 hover:text-white hover:bg-white/5")}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !userId}
                            className={cn(
                                "px-6 py-2 rounded text-sm font-bold uppercase tracking-wide flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                                isRed ? "bg-[#D32F2F] text-white hover:bg-[#B71C1C]" : (isLight ? "bg-black text-white hover:bg-zinc-800" : "bg-white text-black hover:bg-zinc-200")
                            )}
                        >
                            {saving ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
