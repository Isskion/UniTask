"use client";

import { useState, useEffect } from "react";
import { MoscowRequirement, MoscowPriority, MoscowStatus } from "@/types";
import { getProjectRequirements, saveRequirement, deleteRequirement, getNextSequentialNumber, formatMoscowId } from "@/lib/moscow";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Plus, Search, Filter, Edit2, Trash2, Save, XCircle, Loader2, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/context/ToastContext";

interface ProjectMoscowProps {
    projectId: string;
    tenantId: string;
}

const PRIORITY_CONFIG: Record<MoscowPriority, { label: string; color: string; bg: string }> = {
    must: { label: "Must", color: "text-red-400", bg: "bg-red-500/15" },
    should: { label: "Should", color: "text-amber-400", bg: "bg-amber-500/15" },
    could: { label: "Could", color: "text-blue-400", bg: "bg-blue-500/15" },
    wont: { label: "Won't", color: "text-zinc-400", bg: "bg-zinc-500/15" },
};

const STATUS_CONFIG: Record<MoscowStatus, { label: string; color: string; bg: string }> = {
    open: { label: "Abierto", color: "text-sky-400", bg: "bg-sky-500/15" },
    in_progress: { label: "En Progreso", color: "text-amber-400", bg: "bg-amber-500/15" },
    implemented: { label: "Implementado", color: "text-emerald-400", bg: "bg-emerald-500/15" },
    discarded: { label: "Descartado", color: "text-zinc-400", bg: "bg-zinc-500/15" },
};

const MODULE_PRESETS = [
    { code: "01", name: "General" },
    { code: "02", name: "Infraestructura" },
    { code: "03", name: "Seguridad" },
    { code: "04", name: "UX/UI" },
    { code: "05", name: "Backend" },
    { code: "06", name: "Integración" },
    { code: "07", name: "Datos" },
    { code: "08", name: "Rendimiento" },
];

export default function ProjectMoscow({ projectId, tenantId }: ProjectMoscowProps) {
    const { user, userProfile } = useAuth();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const isLight = theme === "light";

    const [requirements, setRequirements] = useState<MoscowRequirement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterPriority, setFilterPriority] = useState<MoscowPriority | "all">("all");

    // Form
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        moduleCode: "01",
        title: "",
        priority: "must" as MoscowPriority,
        status: "open" as MoscowStatus,
        requesterName: "",
        observations: "",
    });

    useEffect(() => {
        loadRequirements();
    }, [projectId, tenantId]);

    const loadRequirements = async () => {
        setLoading(true);
        try {
            const data = await getProjectRequirements(tenantId, projectId);
            setRequirements(data);
        } catch (error) {
            console.error("Error loading requirements:", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ moduleCode: "01", title: "", priority: "must", status: "open", requesterName: "", observations: "" });
        setEditingId(null);
        setShowForm(false);
    };

    const handleCreate = () => {
        resetForm();
        setShowForm(true);
    };

    const handleEdit = (req: MoscowRequirement) => {
        setFormData({
            moduleCode: req.moduleCode,
            title: req.title,
            priority: req.priority,
            status: req.status,
            requesterName: req.requesterName,
            observations: req.observations,
        });
        setEditingId(req.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            showToast("Error", "El requisito necesita una descripción", "error");
            return;
        }
        if (!user) return;

        setSaving(true);
        try {
            if (editingId) {
                // Update existing
                await saveRequirement({
                    id: editingId,
                    title: formData.title.trim(),
                    priority: formData.priority,
                    status: formData.status,
                    requesterName: formData.requesterName.trim(),
                    observations: formData.observations.trim(),
                });
                setRequirements(prev => prev.map(r =>
                    r.id === editingId ? { ...r, ...formData, title: formData.title.trim(), requesterName: formData.requesterName.trim(), observations: formData.observations.trim() } : r
                ));
                showToast("Actualizado", "Requisito actualizado correctamente", "success");
            } else {
                // Create new
                const nextSeq = await getNextSequentialNumber(tenantId, projectId, formData.moduleCode);
                const moscowId = formatMoscowId(formData.moduleCode, nextSeq);

                const newReq: Partial<MoscowRequirement> = {
                    moscowId,
                    moduleCode: formData.moduleCode,
                    sequentialNumber: nextSeq,
                    title: formData.title.trim(),
                    priority: formData.priority,
                    status: formData.status,
                    requesterName: formData.requesterName.trim(),
                    observations: formData.observations.trim(),
                    projectId,
                    tenantId,
                    createdBy: user.uid,
                    createdByName: userProfile?.displayName || user.email || "Usuario",
                };

                const savedId = await saveRequirement(newReq);
                const fullReq: MoscowRequirement = {
                    ...newReq,
                    id: savedId,
                    createdAt: { toMillis: () => Date.now() },
                    updatedAt: { toMillis: () => Date.now() },
                } as MoscowRequirement;

                setRequirements(prev => [fullReq, ...prev]);
                showToast("Creado", `Requisito ${moscowId} creado`, "success");
            }
            resetForm();
        } catch (error) {
            console.error("Error saving requirement:", error);
            showToast("Error", "No se pudo guardar el requisito", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (req: MoscowRequirement) => {
        if (!confirm(`¿Eliminar requisito ${req.moscowId}?`)) return;
        try {
            await deleteRequirement(req.id);
            setRequirements(prev => prev.filter(r => r.id !== req.id));
            showToast("Eliminado", `Requisito ${req.moscowId} eliminado`, "success");
        } catch (error) {
            console.error("Error deleting:", error);
            showToast("Error", "No se pudo eliminar", "error");
        }
    };

    // Filtered list
    const filtered = requirements.filter(r => {
        if (filterPriority !== "all" && r.priority !== filterPriority) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                r.moscowId.toLowerCase().includes(q) ||
                r.title.toLowerCase().includes(q) ||
                r.requesterName.toLowerCase().includes(q) ||
                r.observations.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // Stats
    const stats = {
        must: requirements.filter(r => r.priority === 'must').length,
        should: requirements.filter(r => r.priority === 'should').length,
        could: requirements.filter(r => r.priority === 'could').length,
        wont: requirements.filter(r => r.priority === 'wont').length,
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "—";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.toMillis());
            return format(date, "dd MMM yyyy", { locale: es });
        } catch {
            return "—";
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.entries(PRIORITY_CONFIG) as [MoscowPriority, typeof PRIORITY_CONFIG.must][]).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setFilterPriority(filterPriority === key ? "all" : key)}
                        className={cn(
                            "p-3 rounded-xl border transition-all text-left",
                            filterPriority === key
                                ? (isLight ? "border-zinc-400 bg-zinc-100 shadow-sm" : "border-white/20 bg-white/5 shadow-sm")
                                : (isLight ? "border-zinc-200 bg-white hover:border-zinc-300" : "border-white/5 bg-white/[0.02] hover:bg-white/5")
                        )}
                    >
                        <div className={cn("text-2xl font-black tabular-nums", config.color)}>{stats[key]}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", config.bg, config.color)}>{config.label}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className={cn("flex flex-wrap items-center gap-3 p-3 rounded-xl border", isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/[0.02] border-white/5")}>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Nuevo Requisito
                </button>

                <div className="flex-1" />

                {/* Search */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={cn("pl-9 pr-4 py-2 text-sm rounded-lg border outline-none focus:ring-1 focus:ring-primary w-48",
                            isLight ? "bg-white border-zinc-300 text-zinc-900" : "bg-black/30 border-white/10 text-zinc-200"
                        )}
                    />
                </div>

                {/* Filter */}
                <div className="relative">
                    <select
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value as any)}
                        className={cn("pl-3 pr-8 py-2 text-sm rounded-lg border outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer",
                            isLight ? "bg-white border-zinc-300 text-zinc-900" : "bg-black/30 border-white/10 text-zinc-200"
                        )}
                    >
                        <option value="all">Todas</option>
                        <option value="must">Must</option>
                        <option value="should">Should</option>
                        <option value="could">Could</option>
                        <option value="wont">Won&apos;t</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className={cn("border rounded-xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200",
                    isLight ? "bg-white border-zinc-200 shadow-sm" : "bg-white/[0.03] border-white/10"
                )}>
                    <h3 className={cn("text-sm font-bold uppercase tracking-wider", isLight ? "text-zinc-900" : "text-foreground")}>
                        {editingId ? "Editar Requisito" : "Nuevo Requisito"}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Module Code */}
                        {!editingId && (
                            <div className="space-y-1">
                                <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-600" : "text-zinc-400")}>Módulo</label>
                                <select
                                    value={formData.moduleCode}
                                    onChange={e => setFormData({ ...formData, moduleCode: e.target.value })}
                                    className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary appearance-none",
                                        isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900" : "bg-black/30 border-white/10 text-zinc-200"
                                    )}
                                >
                                    {MODULE_PRESETS.map(m => (
                                        <option key={m.code} value={m.code}>{m.code} — {m.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Priority */}
                        <div className="space-y-1">
                            <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-600" : "text-zinc-400")}>Prioridad MoSCoW</label>
                            <div className="flex gap-1">
                                {(Object.entries(PRIORITY_CONFIG) as [MoscowPriority, typeof PRIORITY_CONFIG.must][]).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => setFormData({ ...formData, priority: key })}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1",
                                            formData.priority === key
                                                ? cn(config.bg, config.color, "ring-1 ring-current")
                                                : (isLight ? "bg-zinc-100 text-zinc-400 hover:text-zinc-600" : "bg-white/5 text-zinc-500 hover:text-zinc-300")
                                        )}
                                    >
                                        {config.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-1">
                            <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-600" : "text-zinc-400")}>Estado</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as MoscowStatus })}
                                className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary appearance-none",
                                    isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900" : "bg-black/30 border-white/10 text-zinc-200"
                                )}
                            >
                                {(Object.entries(STATUS_CONFIG) as [MoscowStatus, typeof STATUS_CONFIG.open][]).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Requester */}
                        <div className="space-y-1">
                            <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-600" : "text-zinc-400")}>Solicitante</label>
                            <input
                                type="text"
                                value={formData.requesterName}
                                onChange={e => setFormData({ ...formData, requesterName: e.target.value })}
                                placeholder="Nombre del solicitante"
                                className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary",
                                    isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900" : "bg-black/30 border-white/10 text-zinc-200"
                                )}
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                        <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-600" : "text-zinc-400")}>Requisito *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Descripción del requisito..."
                            className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary font-medium",
                                isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900" : "bg-black/30 border-white/10 text-zinc-200"
                            )}
                            autoFocus
                        />
                    </div>

                    {/* Observations */}
                    <div className="space-y-1">
                        <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-600" : "text-zinc-400")}>Observaciones</label>
                        <textarea
                            value={formData.observations}
                            onChange={e => setFormData({ ...formData, observations: e.target.value })}
                            placeholder="Notas adicionales, contexto, trazabilidad..."
                            rows={2}
                            className={cn("w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none",
                                isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900" : "bg-black/30 border-white/10 text-zinc-200"
                            )}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button onClick={resetForm} className={cn("px-4 py-2 text-sm font-medium rounded-lg", isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-foreground")}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {editingId ? "Guardar" : "Crear"}
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <div className={cn("text-center py-16 rounded-xl border", isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/[0.01] border-white/5")}>
                    <p className="text-muted-foreground text-sm">
                        {requirements.length === 0 ? "No hay requisitos aún. Crea el primero." : "No se encontraron requisitos con ese filtro."}
                    </p>
                </div>
            ) : (
                <div className={cn("rounded-xl border overflow-hidden", isLight ? "border-zinc-200" : "border-white/5")}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className={cn("text-[10px] uppercase tracking-wider font-bold",
                                    isLight ? "bg-zinc-100 text-zinc-600" : "bg-white/[0.03] text-zinc-400"
                                )}>
                                    <th className="text-left px-4 py-3">ID</th>
                                    <th className="text-left px-4 py-3 min-w-[200px]">Requisito</th>
                                    <th className="text-left px-4 py-3">Prioridad</th>
                                    <th className="text-left px-4 py-3">Estado</th>
                                    <th className="text-left px-4 py-3">Fecha</th>
                                    <th className="text-left px-4 py-3">Solicitante</th>
                                    <th className="text-left px-4 py-3">Creado por</th>
                                    <th className="text-left px-4 py-3 min-w-[150px]">Observaciones</th>
                                    <th className="text-right px-4 py-3 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map((req, idx) => {
                                    const pConfig = PRIORITY_CONFIG[req.priority];
                                    const sConfig = STATUS_CONFIG[req.status];
                                    return (
                                        <tr
                                            key={req.id}
                                            className={cn("group transition-colors",
                                                isLight
                                                    ? (idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50")
                                                    : (idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"),
                                                isLight ? "hover:bg-zinc-100/50" : "hover:bg-white/[0.03]"
                                            )}
                                        >
                                            <td className="px-4 py-3">
                                                <span className={cn("font-mono font-bold text-xs", isLight ? "text-zinc-900" : "text-zinc-200")}>{req.moscowId}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("font-medium", isLight ? "text-zinc-800" : "text-zinc-100")}>{req.title}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase", pConfig.bg, pConfig.color)}>
                                                    {pConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", sConfig.bg, sConfig.color)}>
                                                    {sConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(req.createdAt)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("text-xs", isLight ? "text-zinc-600" : "text-zinc-300")}>{req.requesterName || "—"}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                                                        isLight ? "bg-zinc-200 text-zinc-600" : "bg-primary/20 text-primary"
                                                    )}>
                                                        {req.createdByName?.charAt(0)?.toUpperCase() || "?"}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">{req.createdByName || "—"}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-muted-foreground line-clamp-2">{req.observations || "—"}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(req)}
                                                        className={cn("p-1.5 rounded-lg transition-colors",
                                                            isLight ? "hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700" : "hover:bg-white/10 text-zinc-500 hover:text-zinc-200"
                                                        )}
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(req)}
                                                        className={cn("p-1.5 rounded-lg transition-colors",
                                                            "hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                                                        )}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Footer Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>{filtered.length} de {requirements.length} requisitos</span>
                <span>Total: {stats.must}M · {stats.should}S · {stats.could}C · {stats.wont}W</span>
            </div>
        </div>
    );
}
