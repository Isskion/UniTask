"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { JournalEntry, Task, UserProfile, getRoleLevel, RoleLevel } from '@/types';
import { Bug, Activity, TrendingUp, Circle, Ban, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, X, User as UserIcon, Calendar as CalendarIcon, ArrowUpRight, Filter, AlertTriangle, FileText, BarChart3, PieChart } from "lucide-react";
import { subscribeToAllTasks, sortTasks } from '@/lib/tasks';
import { useAuth } from '@/context/AuthContext';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { isSameDay, isSameWeek, isSameMonth, isSameYear, parseISO, startOfWeek, endOfWeek, format, startOfYear, endOfYear, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DashboardProps {
    entry: JournalEntry;
    globalProjects?: { id: string, name: string }[];
    userProfile?: UserProfile | null;
    userRole?: string | null;
}

type TimeScope = 'day' | 'week' | 'month' | 'year';

export default function Dashboard({ entry, globalProjects = [], userProfile, userRole }: DashboardProps) {
    const { user, tenantId } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
    const [timeScope, setTimeScope] = useState<TimeScope>('week');

    // Subscribe to ALL tasks
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        try {
            const unsubscribe = subscribeToAllTasks(tenantId || "1", (data) => {
                setTasks(data);
                setLoading(false);
                setError(null);
            });
            return () => unsubscribe();
        } catch (err) {
            console.error("Dashboard subscription error:", err);
            setError("Error loading tasks");
            setLoading(false);
        }
    }, [user, tenantId]);

    // Safe Date Parsing
    const getTaskDate = (task: Task): Date | null => {
        try {
            if (!task.createdAt) return null;
            // Handle Firestore Timestamp or Date or String
            let d: Date;
            if ((task.createdAt as any).toDate) {
                d = (task.createdAt as any).toDate();
            } else if (typeof task.createdAt === 'string') {
                d = new Date(task.createdAt);
            } else {
                d = new Date(task.createdAt);
            }

            return isValid(d) ? d : null;
        } catch (e) {
            return null;
        }
    };

    // Calculate Allowed Projects
    const allowedProjectIds = useMemo(() => {
        const currentLevel = getRoleLevel(userRole);
        if (currentLevel >= RoleLevel.PM) return null; // All projects allowed

        return userProfile?.assignedProjectIds || [];
    }, [userRole, userProfile]);

    // Filter Global Projects for Dropdown
    const availableGlobalProjects = useMemo(() => {
        if (!allowedProjectIds) return globalProjects;
        return globalProjects.filter(p => allowedProjectIds.includes(p.id));
    }, [globalProjects, allowedProjectIds]);

    // Filter Tasks (Memoized & Protected)
    const filteredTasks = useMemo(() => {
        if (!entry || !entry.date) return [];

        try {
            let entryDate = parseISO(entry.date);
            if (!isValid(entryDate)) {
                // Fallback to today if entry date is broken
                console.warn("Invalid entry date, defaulting to today");
                entryDate = new Date();
            }

            return tasks.filter(task => {
                // Permission Filter
                if (allowedProjectIds && (!task.projectId || !allowedProjectIds.includes(task.projectId))) {
                    return false;
                }

                const taskDate = getTaskDate(task);
                if (!taskDate) return false;

                try {
                    switch (timeScope) {
                        case 'day':
                            return isSameDay(taskDate, entryDate);
                        case 'week':
                            return isSameWeek(taskDate, entryDate, { weekStartsOn: 1 });
                        case 'month':
                            return isSameMonth(taskDate, entryDate);
                        case 'year':
                            return isSameYear(taskDate, entryDate);
                        default:
                            return isSameWeek(taskDate, entryDate, { weekStartsOn: 1 });
                    }
                } catch (e) {
                    console.error("Date comparison error", e);
                    return false;
                }
            });
        } catch (e) {
            console.error("Filtering crash:", e);
            return [];
        }
    }, [tasks, timeScope, entry]);

    // Compute Stats
    const projectStats = useMemo(() => {
        const stats: Record<string, { total: number; completed: number; blocked: number }> = {};
        filteredTasks.forEach(t => {
            const pid = t.projectId || 'global';
            if (!stats[pid]) stats[pid] = { total: 0, completed: 0, blocked: 0 };
            stats[pid].total++;
            if (t.status === 'completed') stats[pid].completed++;
            if (t.isBlocking) stats[pid].blocked++;
        });
        return stats;
    }, [filteredTasks]);

    // Unique Projects: Always show ALL permitted projects, regardless of current tasks/entry
    const uniqueProjects = useMemo(() => {
        // Use availableGlobalProjects which is already filtered by permissions
        return availableGlobalProjects.map(gp => ({
            projectId: gp.id,
            name: gp.name
        }));
    }, [availableGlobalProjects]);

    // Chart Data (Memoized & Protected)
    const chartData = useMemo(() => {
        try {
            // Safety checks
            if (!entry || !entry.date) return [];
            let entryDate = parseISO(entry.date);
            if (!isValid(entryDate)) entryDate = new Date();

            let relevantTasks = tasks;

            // Permission Filter
            if (allowedProjectIds) {
                relevantTasks = relevantTasks.filter(t => t.projectId && allowedProjectIds.includes(t.projectId));
            }

            // Multi-Project Filter
            if (selectedProjectIds.size > 0) {
                relevantTasks = relevantTasks.filter(t => t.projectId && selectedProjectIds.has(t.projectId));
            }

            let buckets: { label: string; dateKey: string; active: number; completed: number }[] = [];

            if (timeScope === 'year') {
                const start = startOfYear(entryDate);
                const end = endOfYear(entryDate);
                const months = eachMonthOfInterval({ start, end });
                buckets = months.map(m => ({
                    label: format(m, 'MMM', { locale: es }),
                    dateKey: format(m, 'yyyy-MM'),
                    active: 0, completed: 0
                }));
                // Fill
                relevantTasks.forEach(t => {
                    const d = getTaskDate(t);
                    if (d && isSameYear(d, entryDate)) {
                        const k = format(d, 'yyyy-MM');
                        const b = buckets.find(b => b.dateKey === k);
                        if (b) { b.active++; if (t.status === 'completed') b.completed++; }
                    }
                });
            } else if (timeScope === 'month') {
                const start = startOfMonth(entryDate);
                const end = endOfMonth(entryDate);
                const days = eachDayOfInterval({ start, end });
                buckets = days.map(d => ({
                    label: format(d, 'd'),
                    dateKey: format(d, 'yyyy-MM-dd'),
                    active: 0, completed: 0
                }));
                relevantTasks.forEach(t => {
                    const d = getTaskDate(t);
                    if (d && isSameMonth(d, entryDate)) {
                        const k = format(d, 'yyyy-MM-dd');
                        const b = buckets.find(b => b.dateKey === k);
                        if (b) { b.active++; if (t.status === 'completed') b.completed++; }
                    }
                });
            } else {
                // Week / Day -> Weekly view
                const start = startOfWeek(entryDate, { weekStartsOn: 1 });
                const end = endOfWeek(entryDate, { weekStartsOn: 1 });
                const days = eachDayOfInterval({ start, end });
                buckets = days.map(d => ({
                    label: format(d, 'EEE', { locale: es }),
                    dateKey: format(d, 'yyyy-MM-dd'),
                    active: 0, completed: 0
                }));
                relevantTasks.forEach(t => {
                    const d = getTaskDate(t);
                    if (d) {
                        const k = format(d, 'yyyy-MM-dd');
                        const b = buckets.find(b => b.dateKey === k);
                        if (b) { b.active++; if (t.status === 'completed') b.completed++; }
                    }
                });
            }

            return buckets.map(b => ({
                name: b.label.toUpperCase(),
                active: b.active,
                completed: b.completed
            }));

        } catch (e) {
            console.error("Chart generation error", e);
            return [];
        }
    }, [tasks, timeScope, entry, selectedProjectIds]);

    const openTasksCount = filteredTasks.filter(t => t.status !== 'completed').length;
    const blockersCount = filteredTasks.filter(t => t.isBlocking).length;

    if (error) {
        return <div className="p-8 text-destructive text-center border border-destructive/20 rounded-xl bg-destructive/10">Error: {error}</div>;
    }

    return (
        <div className="flex flex-col h-full bg-background text-foreground lg:pr-2 overflow-y-auto custom-scrollbar p-6">

            {/* SCOPE SELECTOR */}
            <div className="flex justify-center mb-6">
                <div className="flex bg-card p-1 rounded-xl border border-border shadow-md">
                    {(['day', 'week', 'month', 'year'] as TimeScope[]).map((scope) => (
                        <button
                            key={scope}
                            onClick={() => setTimeScope(scope)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                timeScope === scope
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {scope === 'day' ? 'Día' : scope === 'week' ? 'Semana' : scope === 'month' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>
            </div>

            {/* CHART */}
            <div className="w-full h-[320px] bg-card border border-border rounded-3xl p-6 mb-8 relative group overflow-hidden shadow-sm hover:shadow-md transition-all shrink-0">
                {/* Gradients */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#6366f1]/10 to-transparent opacity-50 pointer-events-none" />

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-[#6366f1]" />
                            {selectedProjectIds.size > 0
                                ? (selectedProjectIds.size === 1
                                    ? uniqueProjects.find(p => selectedProjectIds.has(p.projectId))?.name || 'Proyecto'
                                    : `${selectedProjectIds.size} Proyectos`)
                                : 'Flujo de Tareas'
                            }
                        </h2>
                        <p className="text-muted-foreground text-sm capitalize">
                            Vistazo: {timeScope === 'day' ? 'Hoy' : timeScope}
                        </p>
                    </div>
                </div>

                <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <defs>
                                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                interval={timeScope === 'month' ? 2 : 0}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--popover))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    color: 'hsl(var(--popover-foreground))'
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="active"
                                stroke="#6366f1"
                                fillOpacity={1}
                                fill="url(#colorActive)"
                                strokeWidth={3}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* METRICS */}
            <div className="flex justify-end gap-3 mb-6">
                <div className="px-4 py-2 bg-card rounded-full border border-border text-xs font-mono text-muted-foreground shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                    ACTIVAS: <span className="text-foreground font-bold">{loading ? "..." : openTasksCount}</span>
                </div>
                <div className="px-4 py-2 bg-card rounded-full border border-border text-xs font-mono text-muted-foreground shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    BLOQUEANTES: <span className="text-destructive font-bold">{blockersCount}</span>
                </div>
            </div>

            {/* PROJECTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {uniqueProjects.map((project, idx) => {
                    const pid = project.projectId || `proj-${idx}`; // Fallback key
                    const stats = projectStats[project.projectId || ''] || { total: 0, completed: 0, blocked: 0 };

                    const total = stats.total;
                    const completed = stats.completed;
                    const blocked = stats.blocked;
                    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const isSelected = selectedProjectIds.has(project.projectId);

                    const myTasks = sortTasks(
                        filteredTasks.filter(t => t.projectId === project.projectId && t.status !== 'completed')
                    );

                    // Health Logic
                    let color = 'text-emerald-500';
                    let ring = 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
                    let Icon = Activity;
                    let label = 'Healthy';
                    let reason = 'Todo fluye correctamente.';
                    let barColor = 'bg-emerald-500';

                    if (blocked > 0) {
                        color = 'text-destructive';
                        ring = 'border-destructive shadow-[0_0_15px_rgba(239,68,68,0.3)]';
                        Icon = Ban;
                        label = 'Critical Blocker';
                        reason = `¡Atención! Hay ${blocked} tareas bloqueantes que impiden el avance.`;
                        barColor = 'bg-destructive';
                    } else if (percentage < 50 && total > 0) {
                        color = 'text-yellow-500';
                        ring = 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
                        Icon = AlertTriangle;
                        label = 'At Risk';
                        reason = `Riesgo: El progreso (${percentage}%) es bajo. Se recomienda acelerar.`;
                        barColor = 'bg-yellow-500';
                    } else if (total === 0) {
                        color = 'text-muted-foreground';
                        ring = 'border-border'; // Neutral ring
                        label = 'No Tasks';
                        reason = 'No hay tareas activas en este periodo.';
                        barColor = 'bg-muted';
                    }

                    return (
                        <div
                            key={pid}
                            onClick={() => {
                                setSelectedProjectIds(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(pid)) {
                                        newSet.delete(pid);
                                    } else {
                                        newSet.add(pid);
                                    }
                                    return newSet;
                                });
                            }}
                            className={cn(
                                "rounded-2xl p-6 relative overflow-hidden group transition-all flex flex-col shadow-sm cursor-pointer border-2 hover:shadow-md",
                                isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border bg-card hover:border-primary/30"
                            )}
                        >
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-card-foreground truncate max-w-[200px]" title={project.name}>{project.name}</h3>
                                    <p className={cn(
                                        "text-[10px] uppercase tracking-wider font-bold mt-1",
                                        label === 'Critical Blocker' ? 'text-destructive animate-pulse block' : 'text-muted-foreground'
                                    )}>{label}</p>
                                </div>
                                <div
                                    className={cn(
                                        "w-12 h-12 rounded-full border-2 flex items-center justify-center bg-background",
                                        ring
                                    )}
                                    title={reason}
                                >
                                    <Icon className={cn("w-6 h-6", color)} />
                                </div>
                            </div>

                            <div className="flex items-end justify-between mb-2 relative z-10 mt-2">
                                <div className="flex flex-col">
                                    <span className="text-4xl font-extrabold text-foreground tracking-tighter">{percentage}%</span>
                                    <span className="text-muted-foreground text-[10px] font-mono uppercase">Progreso</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-foreground font-bold font-mono">{completed}/{total}</span>
                                    <span className="text-muted-foreground text-[10px] block">Tareas Hechas</span>
                                </div>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-6 border border-border">
                                <div
                                    className={cn("h-full transition-all duration-700 ease-out", barColor)}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            <div className="h-px w-full bg-border mb-4" />

                            <div className="flex-1 min-h-[120px] space-y-2 overflow-y-auto custom-scrollbar pr-1 max-h-[300px]">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Tareas Activas
                                </h4>
                                {myTasks.length === 0 ? (
                                    <div className="text-muted-foreground text-xs italic text-center py-8 border border-dashed border-border rounded-lg">
                                        Todo completado
                                    </div>
                                ) : (
                                    myTasks.map(task => (
                                        <div key={task.id} className={cn(
                                            "group/task flex items-start gap-3 p-2 rounded-lg transition-all text-xs border",
                                            task.isBlocking
                                                ? "bg-destructive/10 border-destructive/20 hover:bg-destructive/20"
                                                : "bg-muted/50 border-border hover:bg-muted hover:border-sidebar-border"
                                        )}>
                                            <div className="mt-0.5 shrink-0">
                                                {task.isBlocking ?
                                                    <Ban className="w-3.5 h-3.5 text-destructive" /> :
                                                    <Circle className="w-3.5 h-3.5 text-muted-foreground group-hover/task:text-primary" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-mono text-[9px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">{task.friendlyId}</span>
                                                </div>
                                                <p className={cn(
                                                    "leading-relaxed break-words line-clamp-2",
                                                    task.isBlocking ? "text-destructive-foreground font-medium" : "text-foreground"
                                                )}>
                                                    {task.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>


                        </div>
                    );
                })}
            </div>

            {uniqueProjects.length === 0 && (
                <div className="col-span-full text-center p-12 border border-dashed border-border rounded-3xl text-muted-foreground flex flex-col items-center gap-4 bg-card/50">
                    <TrendingUp className="w-12 h-12 opacity-20" />
                    <p>No hay proyectos activos para este periodo.</p>
                </div>
            )}
            {/* DEBUG FOOTER for Superadmins/Admins during troubleshooting */}
            {(userRole === 'superadmin' || userRole === 'app_admin') && (
                <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-500 overflow-x-auto">
                    <h4 className="font-bold text-zinc-300 mb-2 uppercase flex items-center gap-2">
                        <Bug className="w-3 h-3" /> Estado del Sistema (Debug)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <span className="block text-zinc-600">Usuario</span>
                            <span className="text-zinc-300">{user?.email}</span>
                        </div>
                        <div>
                            <span className="block text-zinc-600">Tenant ID (Context)</span>
                            <span className={cn("font-bold", tenantId === '1' ? "text-emerald-500" : "text-amber-500")}>
                                {tenantId || "NULL"}
                            </span>
                        </div>
                        <div>
                            <span className="block text-zinc-600">Rol Activo</span>
                            <span className="text-zinc-300">{userRole} (Level: {getRoleLevel(userRole)})</span>
                        </div>
                        <div>
                            <span className="block text-zinc-600">Tareas (Cargadas vs Filtradas)</span>
                            <span className="text-zinc-300">{tasks.length} / {filteredTasks.length}</span>
                        </div>
                        <div>
                            <span className="block text-zinc-600">Rango Fecha</span>
                            <span className="text-zinc-300">{entry?.date || "N/A"}</span>
                        </div>
                        <div>
                            <span className="block text-zinc-600">Proyectos Permitidos</span>
                            <span className="text-zinc-300">{(allowedProjectIds || []).length > 0 ? (allowedProjectIds || []).length : "ALL (Admin)"}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
