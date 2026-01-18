"use client";

import { useMemo } from "react";
import { Filter, X, Trash2 } from "lucide-react";
import { MultiPowerSelect } from "./ui/MultiPowerSelect";
import { TaskFiltersState } from "@/hooks/useTaskAdvancedFilters";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface MasterDataItem {
    id: string;
    name: string;
    color: string;
}

interface TaskFiltersProps {
    isOpen: boolean;
    onClose: () => void;
    filters: TaskFiltersState;
    setFilters: (f: TaskFiltersState) => void;
    projects: { id: string; name: string; color?: string }[];
    users: { uid: string; displayName: string }[];
    masterData: {
        priority: MasterDataItem[];
        area: MasterDataItem[];
        scope: MasterDataItem[];
        module: MasterDataItem[];
    };
}

export function TaskFilters({ isOpen, onClose, filters, setFilters, projects, users, masterData }: TaskFiltersProps) {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    // Helpers to convert to options
    const projectOptions = useMemo(() => projects.map(p => ({ value: p.id, label: p.name, color: p.color })), [projects]);
    const userOptions = useMemo(() => users.map(u => ({ value: u.uid, label: u.displayName })), [users]);
    const statusOptions = [
        { value: 'pending', label: 'Pendiente', color: '#71717a' }, // zinc-500
        { value: 'in_progress', label: 'En Curso', color: '#10b981' }, // emarald-500
        { value: 'review', label: 'Revisión', color: '#f59e0b' }, // amber-500
        { value: 'completed', label: 'Completada', color: '#3b82f6' } // blue-500
    ];

    const countActive = useMemo(() => {
        let count = 0;
        if (filters.projectIds.length > 0) count++;
        if (filters.status.length > 0) count++;
        if (filters.priority.length > 0) count++;
        if (filters.area.length > 0) count++;
        if (filters.scope.length > 0) count++;
        if (filters.module.length > 0) count++;
        if (filters.assignedTo.length > 0) count++;
        return count;
    }, [filters]);

    const resetFilters = () => {
        setFilters({
            ...filters,
            projectIds: [],
            status: ['pending', 'in_progress', 'review'],
            priority: [],
            area: [],
            scope: [],
            module: [],
            assignedTo: []
        });
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div className={cn(
                "fixed inset-y-0 right-0 z-50 w-full xs:w-[400px] shadow-2xl transform transition-transform duration-300 ease-in-out border-l",
                isOpen ? "translate-x-0" : "translate-x-full",
                isLight ? "bg-white border-zinc-200" : "bg-[#09090b] border-white/10"
            )}>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className={cn("px-6 py-4 border-b flex items-center justify-between shrink-0", isLight ? "border-zinc-100" : "border-white/5")}>
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", isLight ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/10 text-indigo-400")}>
                                <Filter className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className={cn("text-lg font-bold", isLight ? "text-zinc-900" : "text-white")}>Filtros</h2>
                                <p className={cn("text-xs", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                    {countActive} filtros activos
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className={cn("p-2 rounded-full transition-colors", isLight ? "hover:bg-zinc-100 text-zinc-400" : "hover:bg-white/10 text-zinc-500")}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                        {/* Status */}
                        <div className="space-y-2">
                            <label className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Estado</label>
                            <MultiPowerSelect
                                values={filters.status}
                                onChange={(val) => setFilters({ ...filters, status: val as any })}
                                options={statusOptions}
                                placeholder="Todos los estados"
                            />
                        </div>

                        {/* Projects */}
                        <div className="space-y-2">
                            <label className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Proyectos</label>
                            <MultiPowerSelect
                                values={filters.projectIds}
                                onChange={(val) => setFilters({ ...filters, projectIds: val })}
                                options={projectOptions}
                                placeholder="Filtrar por proyectos..."
                            />
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent my-4" />

                        {/* Classification Group */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Prioridad</label>
                                <MultiPowerSelect
                                    values={filters.priority}
                                    onChange={(val) => setFilters({ ...filters, priority: val })}
                                    options={masterData.priority.map(m => ({ value: m.name, label: m.name, color: m.color }))} // Using Name as value based on types
                                    placeholder="Cualquier prioridad"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Área</label>
                                <MultiPowerSelect
                                    values={filters.area}
                                    onChange={(val) => setFilters({ ...filters, area: val })}
                                    options={masterData.area.map(m => ({ value: m.name, label: m.name, color: m.color }))}
                                    placeholder="Todas las áreas"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Módulo</label>
                                <MultiPowerSelect
                                    values={filters.module}
                                    onChange={(val) => setFilters({ ...filters, module: val })}
                                    options={masterData.module.map(m => ({ value: m.name, label: m.name, color: m.color }))}
                                    placeholder="Todos los módulos"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Alcance</label>
                                <MultiPowerSelect
                                    values={filters.scope}
                                    onChange={(val) => setFilters({ ...filters, scope: val })}
                                    options={masterData.scope.map(m => ({ value: m.name, label: m.name, color: m.color }))}
                                    placeholder="Cualquier alcance"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent my-4" />

                        {/* People */}
                        <div className="space-y-2">
                            <label className={cn("text-xs font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Asignado A</label>
                            <MultiPowerSelect
                                values={filters.assignedTo}
                                onChange={(val) => setFilters({ ...filters, assignedTo: val })}
                                options={userOptions}
                                placeholder="Cualquier responsable"
                            />
                        </div>


                    </div>

                    {/* Footer */}
                    <div className={cn("p-6 border-t shrink-0 flex gap-3", isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/5")}>
                        <button
                            onClick={resetFilters}
                            className={cn("flex-1 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-colors",
                                isLight ? "border-zinc-300 text-zinc-600 hover:bg-white" : "border-white/10 text-zinc-400 hover:bg-white/5")}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Limpiar
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            Ver Resultados
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
