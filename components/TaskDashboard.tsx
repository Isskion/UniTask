"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Project, Task, UserProfile, AttributeDefinition, MasterDataItem } from '@/types';
import { subscribeToAllTasks } from '@/lib/tasks';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTaskAdvancedFilters, initialFilters, TaskFiltersState } from '@/hooks/useTaskAdvancedFilters';
import { Download, ClipboardCopy, FileText, Filter, CheckCircle2, Ban, Circle, Search, LayoutTemplate, X, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react';
import { format, isBefore, startOfToday } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { TaskFilters } from './TaskFilters';
import { useLanguage } from '@/context/LanguageContext';



interface TaskDashboardProps {
    projects: {
        id: string;
        name: string;
        color?: string;
        status?: string
    }[];
    userProfile?: any;
    permissionLoading?: boolean;
}

export default function TaskDashboard({ projects, userProfile, permissionLoading }: TaskDashboardProps) {
    const { user, tenantId } = useAuth();
    const { permissions, isAdmin, getAllowedProjectIds, loading: permissionsLoading } = usePermissions();
    const { t } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    // NEW: Advanced Filters State
    const [filters, setFilters] = useState<TaskFiltersState>(initialFilters);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Data for Filters
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeDefinition[]>([]);
    const [masterData, setMasterData] = useState<Record<string, MasterDataItem[]>>({
        priority: [], area: [], scope: [], module: []
    });

    // 1. Load Tasks (Real-time)
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        // Optimized: Only subscribe once
        const unsubscribe = subscribeToAllTasks(tenantId || "1", (data) => {
            setTasks(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, tenantId]);

    // 2. Load MasterData & Users (One-time fetch for filters)
    useEffect(() => {
        if (!tenantId) return;

        // Users
        const fetchUsers = async () => {
            const q = query(collection(db, "users"), where("tenantId", "==", tenantId));
            const snap = await getDocs(q);
            const list: UserProfile[] = [];
            snap.forEach(d => list.push({ uid: d.id, ...d.data() } as UserProfile));
            setUsers(list);
        };
        fetchUsers();

        // Attribute Definitions
        const qAttr = query(collection(db, "attribute_definitions"), where("tenantId", "==", tenantId));
        const unsubAttr = onSnapshot(qAttr, (snap) => {
            const list: AttributeDefinition[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as AttributeDefinition));
            setAttributeDefinitions(list);
        });

        // Master Data (Real-time for consistency)
        const qmd = query(collection(db, "master_data"), where("tenantId", "==", tenantId));
        const unsubMD = onSnapshot(qmd, (snap) => {
            const data: Record<string, MasterDataItem[]> = { priority: [], area: [], scope: [], module: [] };
            snap.forEach(doc => {
                const dataRaw = doc.data();
                const type = dataRaw.type;
                if (!type) return;

                if (!data[type]) data[type] = [];
                data[type].push({ ...dataRaw, id: doc.id } as MasterDataItem);
            });
            setMasterData(data);
        });

        return () => {
            unsubMD();
            unsubAttr();
        };
    }, [tenantId]);


    // 3. APPLY FILTERS (The Hook)
    // Security: Calculate allowed projects once
    const allowedProjectIds = useMemo(() => {
        const permissionType = getAllowedProjectIds();
        if (isAdmin() || permissionType === 'ALL') {
            return projects.map(p => p.id);
        }
        return userProfile?.assignedProjectIds || [];
    }, [projects, isAdmin, getAllowedProjectIds, userProfile]);

    const filteredTasks = useTaskAdvancedFilters(tasks, filters, allowedProjectIds, isAdmin());

    // 4. Update Search Sync
    // Sync local search state with filters object to avoid dual state management
    // We only use setFilters for search now.

    // 5. Grouping Layout (Preserve existing grouped view)
    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = {};

        // Init allowed groups
        projects.forEach(p => {
            if (allowedProjectIds.includes(p.id)) groups[p.id] = [];
        });
        groups['unknown'] = [];

        filteredTasks.forEach(task => {
            const pid = task.projectId || 'unknown';
            if (pid !== 'unknown' && !groups[pid]) return; // Should be handled by hook, but safety
            if (groups[pid]) groups[pid].push(task);
        });

        // Remove empty groups IF filters are active? No, usually better to show structure.
        // But if I selected specific projects, I should only show those groups.
        if (filters.projectIds.length > 0) {
            Object.keys(groups).forEach(key => {
                if (key !== 'unknown' && !filters.projectIds.includes(key)) {
                    delete groups[key];
                }
            });
        }

        return groups;
    }, [filteredTasks, projects, allowedProjectIds, filters.projectIds]);


    // Export Handlers
    const copyToClipboard = () => {
        let text = `# Reporte de Tareas - ${format(new Date(), 'dd/MM/yyyy')}\n\n`;
        // Filters Summary
        text += `> Filtros: ${filters.status.join(', ')} | ${filters.search ? `Busqueda: "${filters.search}"` : ''}\n\n`;

        Object.keys(groupedTasks).forEach(pid => {
            const group = groupedTasks[pid];
            if (!group || group.length === 0) return;
            const pName = projects.find(p => p.id === pid)?.name || (pid === 'unknown' ? 'Sin Proyecto' : pid);

            text += `## ${pName}\n`;
            group.forEach(t => {
                const statusIcon = t.status === 'completed' ? '[x]' : t.isBlocking ? '[!]' : '[ ]';
                text += `- ${statusIcon} ${t.description || t.title} (${t.friendlyId || 'ID'}) ${t.priority ? `[${t.priority}]` : ''}\n`;
            });
            text += `\n`;
        });

        navigator.clipboard.writeText(text);
        alert("¡Reporte copiado al portapapeles!");
    };

    const downloadCSV = () => {
        let csv = 'ID,Project,Status,Description,Created At\n';
        const safeStr = (s: string) => `"${s ? s.replace(/"/g, '""') : ''}"`;
        filteredTasks.forEach(t => {
            const pName = projects.find(p => p.id === t.projectId)?.name || 'Unknown';
            const dateStr = t.createdAt?.toDate ? format(t.createdAt.toDate(), 'yyyy-MM-dd') : '';
            csv += `${t.friendlyId || ''},${safeStr(pName)},${t.status},${safeStr(t.description || t.title || '')},${dateStr}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `tasks_export_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate Stats
    const totalVisible = filteredTasks.length;

    const activeFilterCount = useMemo(() => {
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

    return (
        <div className="h-full flex flex-col bg-background relative overflow-hidden">
            {/* Filter Panel */}
            <TaskFilters
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                setFilters={setFilters}
                projects={projects}
                users={users}
                masterData={masterData}
                attributeDefinitions={attributeDefinitions}
            />

            {/* Header / Toolbar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-md sticky top-0 z-30 shadow-sm shrink-0">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2 shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                        Task Dashboard
                    </h2>

                    <div className="h-6 w-px bg-border mx-2" />

                    {/* Quick Search */}
                    <div className="relative group max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground"
                            placeholder="Buscar por ID, título..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Active Filters Summary Pills (Optional, if space permits) */}

                    {activeFilterCount > 0 && (
                        <button
                            onClick={() => setFilters({ ...initialFilters, search: filters.search })}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border border-red-500/30 text-red-500 hover:bg-red-500/10"
                            title={t('task_board.clear_filters')}
                        >
                            <X className="w-3.5 h-3.5" />
                            {t('task_board.clear')} ({activeFilterCount})
                        </button>
                    )}

                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border",
                            isFilterOpen || totalVisible < tasks.length // Highlight if filtering
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                : "bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Filtros
                        {(totalVisible < tasks.length) && (
                            <span className="ml-1 bg-white/20 px-1.5 rounded text-[10px]">{tasks.length - totalVisible} ocultas</span>
                        )}
                    </button>

                    <div className="w-px h-6 bg-border mx-1" />

                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded hover:bg-secondary/80 transition-colors border border-border"
                        title="Copiar Reporte Markdown"
                    >
                        <ClipboardCopy className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                        title="Exportar a CSV"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>


            {/* Content Scroller */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-background">
                {(loading || (permissionsLoading && !isAdmin())) ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                        {(permissionsLoading && !isAdmin()) ? "Verificando permisos..." : "Cargando repositorio..."}
                    </div>
                ) : (
                    totalVisible === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <LayoutTemplate className="w-16 h-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-bold text-foreground">No hay resultados</h3>
                            <p className="text-sm text-muted-foreground mb-6">Intenta ajustar los filtros de búsqueda.</p>
                            <button onClick={() => setFilters(initialFilters)} className="text-primary text-xs font-bold hover:underline">
                                Limpiar todos los filtros
                            </button>
                        </div>
                    ) : (
                        Object.keys(groupedTasks).map(pid => {
                            const pTasks = groupedTasks[pid];
                            if (!pTasks || pTasks.length === 0) return null;
                            const project = projects.find(p => p.id === pid);
                            const pName = project?.name || "Sin Proyecto";
                            const pColor = project?.color || "#555";

                            return (
                                <div key={pid} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex items-center gap-2 border-b border-border pb-2 px-1 sticky top-0 bg-background/95 backdrop-blur z-10 pt-2">
                                        <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white/5 shadow-sm" style={{ backgroundColor: pColor }} />
                                        <h3 className="font-bold text-foreground text-sm tracking-tight">{pName}</h3>
                                        <span className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">{pTasks.length}</span>
                                    </div>

                                    <div className="grid gap-2">
                                        {pTasks.map(task => (
                                            <div key={task.id} className="flex items-start gap-4 p-3 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all group relative overflow-hidden">
                                                {/* Left Status Stripe */}
                                                <div className={cn("absolute left-0 top-0 bottom-0 w-1",
                                                    task.status === 'completed' ? "bg-emerald-500" :
                                                        task.status === 'in_progress' ? "bg-indigo-500" :
                                                            task.status === 'review' ? "bg-amber-500" : "bg-zinc-500"
                                                )} />

                                                <div className="mt-1 ml-2">
                                                    {task.status === 'completed' ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    ) : task.isBlocking ? (
                                                        <Ban className="w-4 h-4 text-destructive animate-pulse" />
                                                    ) : (
                                                        <Circle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">{task.friendlyId || '###'}</span>

                                                        {task.priority && (
                                                            <span className={cn("text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border",
                                                                masterData.priority.find(m => m.name === task.priority)?.color ? '' : "bg-secondary text-muted-foreground border-border"
                                                            )} style={
                                                                masterData.priority.find(m => m.name === task.priority)?.color ? {
                                                                    borderColor: `${masterData.priority.find(m => m.name === task.priority)?.color}40`,
                                                                    backgroundColor: `${masterData.priority.find(m => m.name === task.priority)?.color}10`,
                                                                    color: masterData.priority.find(m => m.name === task.priority)?.color
                                                                } : {}
                                                            }>
                                                                {task.priority}
                                                            </span>
                                                        )}

                                                        {task.area && (
                                                            <span className="text-[9px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                {masterData.area.find(m => m.name === task.area)?.color && (
                                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: masterData.area.find(m => m.name === task.area)?.color }} />
                                                                )}
                                                                {task.area}
                                                            </span>
                                                        )}

                                                        {task.module && (
                                                            <span className="text-[9px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded border border-transparent">
                                                                {task.module}
                                                            </span>
                                                        )}

                                                        {task.scope && (
                                                            <span className="text-[9px] font-bold text-indigo-500/80 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">
                                                                {task.scope}
                                                            </span>
                                                        )}

                                                        {/* Deadline */}
                                                        {task.endDate && (
                                                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 border font-medium",
                                                                (() => {
                                                                    const date = task.endDate?.toDate ? task.endDate.toDate() : new Date(task.endDate);
                                                                    return isBefore(date, startOfToday()) && task.status !== 'completed';
                                                                })()
                                                                    ? "bg-red-100 text-red-700 border-red-200"
                                                                    : "bg-secondary text-muted-foreground border-border"
                                                            )}>
                                                                <span className="opacity-70 mr-0.5">Deadline:</span>
                                                                <CalendarIcon className="w-3 h-3" />
                                                                {(() => {
                                                                    try {
                                                                        const date = task.endDate?.toDate ? task.endDate.toDate() : new Date(task.endDate);
                                                                        return format(date, 'dd MMM');
                                                                    } catch (e) {
                                                                        return 'Fecha Inválida';
                                                                    }
                                                                })()}
                                                            </span>
                                                        )}

                                                        {/* Responsible Inline */}
                                                        {task.assignedTo && (
                                                            <div className="flex items-center gap-1 ml-auto sm:ml-2">
                                                                <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] text-white font-bold" title={users.find(u => u.uid === task.assignedTo)?.displayName}>
                                                                    {users.find(u => u.uid === task.assignedTo)?.displayName?.charAt(0) || "U"}
                                                                </div>
                                                                <span className="text-[9px] text-muted-foreground hidden sm:inline-block">
                                                                    {users.find(u => u.uid === task.assignedTo)?.displayName?.split(' ')[0] || "User"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <h4 className={cn("text-sm font-medium leading-snug", task.status === 'completed' ? "text-muted-foreground line-through" : "text-foreground")}>
                                                        {task.title || task.description || "Sin Título"}
                                                    </h4>


                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="text-[10px] text-muted-foreground font-mono whitespace-nowrap bg-secondary/30 px-1.5 rounded" title="Fecha de Creación">
                                                        <span className="opacity-70 mr-1">Created:</span>
                                                        {task.createdAt?.toDate ? format(task.createdAt.toDate(), 'dd MMM') : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )
                )}
            </div>
        </div >
    );
}

