"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { JournalEntry, Task, UserProfile, getRoleLevel, RoleLevel, Project } from '@/types';
import { Bug, Activity, TrendingUp, Circle, Ban, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, X, User as UserIcon, Calendar as CalendarIcon, ArrowUpRight, Filter, AlertTriangle, FileText, BarChart3, PieChart } from "lucide-react";
import { subscribeToAllTasks, sortTasks } from '@/lib/tasks';
import { useAuth } from '@/context/AuthContext';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { isSameDay, isSameWeek, isSameMonth, isSameYear, parseISO, startOfWeek, endOfWeek, format, startOfYear, endOfYear, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, isValid, eachWeekOfInterval, getWeek, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DashboardProps {
    entry: JournalEntry;
    globalProjects?: Project[];
    userProfile?: UserProfile | null;
    userRole?: string | null;
}

type TimeScope = 'day' | 'week' | 'month' | 'year';

export default function Dashboard({ entry, globalProjects = [], userProfile: propProfile, userRole: propRole }: DashboardProps) {
    // [FIX] Use AuthContext as Source of Truth for Role/Profile to ensure freshness (e.g. after role change)
    const { user, tenantId, userRole, userProfile: authProfile } = useAuth();

    // Fallback to props if Context not ready (though Context is usually faster/fresher)
    const finalProfile = authProfile || propProfile;
    const finalRole = userRole || propRole;

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
        const currentLevel = getRoleLevel(finalRole);
        if (currentLevel >= RoleLevel.PM) return null; // All projects allowed for PM/Admin

        return finalProfile?.assignedProjectIds || [];
    }, [finalRole, finalProfile]);

    // Filter Global Projects for Dropdown
    const availableGlobalProjects = useMemo(() => {
        if (!allowedProjectIds) return globalProjects;
        return globalProjects.filter(p => allowedProjectIds.includes(p.id));
    }, [globalProjects, allowedProjectIds]);

    // Filter Tasks (Memoized & Protected) - Used for Chart Calculations within window
    const filteredTasksInWindow = useMemo(() => {
        // Only for "Created in Period" logic? 
        // Actually, the "Metrics" usually show "Total Open" regardless of creation date.
        // But the "Active" line in chart might mean "New".
        // Let's keep this for "New" tasks logic.

        if (!entry || !entry.date) return [];

        try {
            let entryDate = parseISO(entry.date);
            if (!isValid(entryDate)) {
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
                        case 'day': return isSameDay(taskDate, entryDate);
                        case 'week': return isSameWeek(taskDate, entryDate, { weekStartsOn: 1 });
                        case 'month': return isSameMonth(taskDate, entryDate);
                        case 'year': return isSameYear(taskDate, entryDate);
                        default: return isSameWeek(taskDate, entryDate, { weekStartsOn: 1 });
                    }
                } catch (e) {
                    return false;
                }
            });
        } catch (e) {
            return [];
        }
    }, [tasks, timeScope, entry, allowedProjectIds]);


    // [KPI METRIC] Total Open Tasks (Backlog) - NOT filtered by time scope
    // This answers "How many active tasks do I have right now?"
    const totalBacklogCount = useMemo(() => {
        return tasks.filter(t => {
            if (t.status === 'completed') return false;
            // Permission check
            if (allowedProjectIds && (!t.projectId || !allowedProjectIds.includes(t.projectId))) return false;
            // Selection Check (Dynamic) - User asked for "Activas" to reflect selection
            if (selectedProjectIds.size > 0 && t.projectId && !selectedProjectIds.has(t.projectId)) return false;
            return true;
        }).length;
    }, [tasks, allowedProjectIds, selectedProjectIds]);

    const blockersCount = useMemo(() => {
        return tasks.filter(t => {
            if (!t.isBlocking || t.status === 'completed') return false;
            if (allowedProjectIds && (!t.projectId || !allowedProjectIds.includes(t.projectId))) return false;
            if (selectedProjectIds.size > 0 && t.projectId && !selectedProjectIds.has(t.projectId)) return false;
            return true;
        }).length;
    }, [tasks, allowedProjectIds, selectedProjectIds]);


    // Compute Stats for Project Cards (Total/Completed/Blocked % of ALL TIME?)
    // Usually project cards show the Project's overall health.
    const projectStats = useMemo(() => {
        const stats: Record<string, { total: number; completed: number; blocked: number }> = {};

        // Filter tasks by PERMISSION only, not by TimeScope, to show full project health
        const accessibleTasks = tasks.filter(t => {
            if (allowedProjectIds && (!t.projectId || !allowedProjectIds.includes(t.projectId))) return false;
            return true;
        });

        accessibleTasks.forEach(t => {
            const pid = t.projectId || 'global';
            if (!stats[pid]) stats[pid] = { total: 0, completed: 0, blocked: 0 };

            // Only count Active for "Total"? or Total Historic?
            // "Percentage" usually implies "Completion of current scope". 
            // Let's count Open + Completed (Active lifecycle).
            // Actually, usually "Total" = Open + Completed. 
            // Simple:
            stats[pid].total++;
            if (t.status === 'completed') stats[pid].completed++;
            if (t.isBlocking && t.status !== 'completed') stats[pid].blocked++;
        });
        return stats;
    }, [tasks, allowedProjectIds]);

    // Unique Projects
    const uniqueProjects = useMemo(() => {
        return availableGlobalProjects.map(gp => ({
            projectId: gp.id,
            name: gp.name,
            color: gp.color,
            code: gp.code
        }));
    }, [availableGlobalProjects]);

    // Initialize selection
    const [hasInitialized, setHasInitialized] = useState(false);
    useEffect(() => {
        if (!hasInitialized && uniqueProjects.length > 0) {
            setSelectedProjectIds(new Set(uniqueProjects.map(p => p.projectId)));
            setHasInitialized(true);
        }
    }, [uniqueProjects, hasInitialized]);

    // Chart Data Generation
    const chartData = useMemo(() => {
        try {
            if (!entry || !entry.date) return [];
            let entryDate = parseISO(entry.date);
            if (!isValid(entryDate)) entryDate = new Date();

            let relevantTasks = tasks;
            if (allowedProjectIds) {
                relevantTasks = relevantTasks.filter(t => t.projectId && allowedProjectIds.includes(t.projectId));
            }

            type Bucket = {
                label: string;
                dateKey: string;
                bucketEnd: Date;
                active: number;
                completed: number
            };
            let buckets: Bucket[] = [];

            // [FIX] Bucket Generation - Cleaner Labels
            if (timeScope === 'year') {
                const start = startOfYear(entryDate);
                const end = endOfYear(entryDate);
                const months = eachMonthOfInterval({ start, end });
                buckets = months.map(m => ({
                    label: format(m, 'MMM', { locale: es }).toUpperCase(), // ENE, FEB...
                    dateKey: format(m, 'yyyy-MM'),
                    bucketEnd: endOfMonth(m),
                    active: 0, completed: 0
                }));
            } else if (timeScope === 'month') {
                // [NEW] Monthly View -> Aggregated by WEEK
                const start = startOfMonth(entryDate);
                const end = endOfMonth(entryDate);
                const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

                buckets = weeks.map(w => {
                    const weekNum = getWeek(w, { weekStartsOn: 1 });
                    const monthName = format(w, 'MMM', { locale: es }).toUpperCase();
                    return {
                        label: `SEM ${weekNum} (${monthName})`,
                        dateKey: format(w, 'yyyy-Iw'), // Year-Week
                        bucketEnd: endOfWeek(w, { weekStartsOn: 1 }),
                        active: 0, completed: 0
                    };
                });
            } else { // Week
                const start = startOfWeek(entryDate, { weekStartsOn: 1 });
                const end = endOfWeek(entryDate, { weekStartsOn: 1 });
                const days = eachDayOfInterval({ start, end });
                buckets = days.map(d => ({
                    label: format(d, 'EEE', { locale: es }).toUpperCase(), // LUN, MAR...
                    dateKey: format(d, 'yyyy-MM-dd'),
                    bucketEnd: endOfDay(d),
                    active: 0, completed: 0
                }));
            }

            // Populate Buckets
            relevantTasks.forEach(task => {
                if (task.projectId && !selectedProjectIds.has(task.projectId) && selectedProjectIds.size > 0) return;

                const createdAt = getTaskDate(task);
                if (!createdAt) return;

                // "Nuevas" (Created in period)
                const bucket = buckets.find(b => {
                    if (timeScope === 'year') return b.dateKey === format(createdAt, 'yyyy-MM');
                    if (timeScope === 'month') return b.dateKey === format(createdAt, 'yyyy-Iw');
                    return b.dateKey === format(createdAt, 'yyyy-MM-dd');
                });
                if (bucket) bucket.active++;

                // "Completadas"
                if (task.status === 'completed') {
                    const closedDateRaw = task.closedAt || task.updatedAt;
                    let closedDate: Date | null = null;
                    if (closedDateRaw) {
                        if ((closedDateRaw as any).toDate) closedDate = (closedDateRaw as any).toDate();
                        else closedDate = new Date(closedDateRaw as any);
                    }
                    if (closedDate && isValid(closedDate)) {
                        const closeBucket = buckets.find(b => {
                            if (timeScope === 'year') return b.dateKey === format(closedDate!, 'yyyy-MM');
                            if (timeScope === 'month') return b.dateKey === format(closedDate!, 'yyyy-Iw');
                            return b.dateKey === format(closedDate!, 'yyyy-MM-dd');
                        });
                        if (closeBucket) closeBucket.completed++;
                    }
                }
            });

            // Calculate "Total Active" (Backlog snapshot) at each point
            const finalData = buckets.map(b => {
                const bucketEnd = new Date(b.bucketEnd);
                // Ensure bucketEnd captures the whole day
                if (timeScope !== 'year') bucketEnd.setHours(23, 59, 59, 999);

                const projectsToTrack = uniqueProjects.filter(p => selectedProjectIds.has(p.projectId));
                const activeByProject: Record<string, number> = {};
                let totalActiveAtTime = 0;

                projectsToTrack.forEach(proj => {
                    const pid = proj.projectId;
                    // Count tasks for this project that:
                    // 1. Created BEFORE bucket end
                    // 2. Closed AFTER bucket end (or Open)
                    const count = relevantTasks.filter(t => {
                        if (t.projectId !== pid) return false;
                        const cDate = getTaskDate(t);
                        if (!cDate || cDate > bucketEnd) return false;

                        // Check if it was closed before this bucket end
                        if (t.closedAt) {
                            const closedDate = (t.closedAt as any).toDate ? (t.closedAt as any).toDate() : new Date(t.closedAt);
                            if (isValid(closedDate) && closedDate <= bucketEnd) return false;
                        } else if (t.status === 'completed') {
                            if (t.updatedAt) {
                                const uDate = (t.updatedAt as any).toDate ? (t.updatedAt as any).toDate() : new Date(t.updatedAt);
                                if (isValid(uDate) && uDate <= bucketEnd) return false;
                            }
                        }
                        return true;
                    }).length;

                    activeByProject[pid] = count;
                    totalActiveAtTime += count;
                });

                return {
                    name: b.label,
                    active: b.active, // Created
                    completed: b.completed, // Closed
                    totalActive: totalActiveAtTime, // Backlog Snapshot
                    ...activeByProject // Breakdown
                };
            });

            return finalData;

        } catch (e) {
            console.error("Chart generation error", e);
            return [];
        }
    }, [tasks, timeScope, entry, selectedProjectIds, uniqueProjects, allowedProjectIds]);

    if (error) {
        return <div className="p-8 text-destructive text-center border border-destructive/20 rounded-xl bg-destructive/10">Error: {error}</div>;
    }

    // Custom Tooltip Component (Refactored)
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {

            // [STABLE SORT]
            // Priority: Value > 0 first, then Alphabetical
            const items = [...payload].filter(i => i.name !== 'Nuevas').sort((a: any, b: any) => {
                const valA = a.value || 0;
                const valB = b.value || 0;

                // Keep 0s at the bottom
                if (valA > 0 && valB === 0) return -1;
                if (valA === 0 && valB > 0) return 1;

                // Stable alphabetical
                return (a.name || '').localeCompare(b.name || '');
            });

            return (
                <div className="bg-popover border border-border p-2 rounded-lg shadow-lg text-[10px]">
                    <div className="font-bold border-b border-border/50 pb-1 mb-1 text-center">{label}</div>
                    {items.map((entry: any) => (
                        <div key={entry.name} className={cn("flex items-center gap-2 mb-0.5 last:mb-0", entry.value === 0 ? "opacity-50" : "")}>
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="font-medium text-foreground">{entry.name}:</span>
                            <span className="font-mono font-bold text-foreground">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Helper: Header Date Context
    const getDateContext = () => {
        if (!entry?.date) return 'Periodo Actual';
        const d = parseISO(entry.date);
        if (!isValid(d)) return 'Periodo Actual';

        if (timeScope === 'week') return `Semana del ${format(startOfWeek(d, { weekStartsOn: 1 }), 'd MMM', { locale: es })} al ${format(endOfWeek(d, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`;
        if (timeScope === 'month') return `Mes de ${format(d, 'MMMM yyyy', { locale: es }).toUpperCase()}`;
        if (timeScope === 'year') return `Año ${format(d, 'yyyy')}`;
        return 'Periodo Personalizado';
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground lg:pr-2 overflow-y-auto custom-scrollbar p-6">

            {/* HEADER CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                {/* SCOPE SELECTOR */}
                <div className="flex bg-card p-1 rounded-xl border border-border shadow-md">
                    {(['week', 'month', 'year'] as TimeScope[]).map((scope) => (
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
                            {scope === 'week' ? 'Semana' : scope === 'month' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>

                {/* PROJECT SELECTION COMMANDS */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedProjectIds(new Set(uniqueProjects.map(p => p.projectId)))}
                        className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setSelectedProjectIds(new Set())}
                        className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Ninguno
                    </button>
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
                                ? "Datos de Tareas"
                                : 'Selecciona Proyectos'
                            }
                        </h2>
                        <p className="text-muted-foreground text-sm capitalize">
                            {getDateContext()}
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
                            <YAxis yAxisId="left" hide />
                            <YAxis yAxisId="right" orientation="right" hide />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} />
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="active"
                                stroke="#6366f1"
                                fillOpacity={1}
                                fill="url(#colorActive)"
                                strokeWidth={3}
                                name="Nuevas"
                                tooltipType="none"
                            />

                            {/* Individual Project Lines */}
                            {uniqueProjects.filter(p => selectedProjectIds.has(p.projectId)).map((p, idx) => {
                                // Fallback colors if project has no color
                                const defaultColors = ['#f472b6', '#22d3ee', '#a78bfa', '#facc15', '#4ade80', '#fb923c'];
                                const pColor = p.color || defaultColors[idx % defaultColors.length];

                                return (
                                    <Line
                                        key={p.projectId}
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey={p.projectId}
                                        stroke={pColor}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, strokeWidth: 0 }}
                                        strokeOpacity={1}
                                        name={`${p.code || p.name}`}
                                        connectNulls={false}
                                    />
                                );
                            })}

                            {/* Total Active Line (Black) */}
                            {selectedProjectIds.size > 0 && (
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="totalActive"
                                    stroke="#000000"
                                    strokeWidth={2}
                                    dot={{ r: 2, strokeWidth: 1 }}
                                    name="Total Activas"
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* METRICS */}
            <div className="flex justify-end gap-3 mb-6">
                <div className="px-4 py-2 bg-card rounded-full border border-border text-xs font-mono text-muted-foreground shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                    ACTIVAS (TOTAL): <span className="text-foreground font-bold">{loading ? "..." : totalBacklogCount}</span>
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
                    // Correct percentage calculation: Completed / Total (Active+Completed)
                    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const isSelected = selectedProjectIds.has(project.projectId);

                    // For the list below, we want ALL OPEN TASKS for this project, 
                    // not just those in the current week/month window.
                    // "Blockers" visualization should be actionable.
                    const myTasks = sortTasks(
                        tasks.filter(t => t.projectId === project.projectId && t.status !== 'completed' && t.isBlocking)
                        // Filter "filteredTasksInWindow" if we only want to show recent blockers?
                        // Usually blockers are urgent regardless of creation date.
                        // We will use "ALL" blockers for the project card.
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
                        reason = 'No hay tareas registradas.';
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

                            {/* Blocking Tasks Only */}
                            {myTasks.length > 0 ? (
                                <div className="flex-1 min-h-[120px] space-y-2 overflow-y-auto custom-scrollbar pr-1 max-h-[300px]">
                                    <h4 className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-2 flex items-center gap-2 animate-pulse">
                                        <Ban className="w-3 h-3" /> Bloqueos Activos
                                    </h4>
                                    {myTasks.map(task => (
                                        <div key={task.id} className="group/task flex items-start gap-3 p-2 rounded-lg transition-all text-xs border bg-destructive/10 border-destructive/20 hover:bg-destructive/20">
                                            <div className="mt-0.5 shrink-0">
                                                <Ban className="w-3.5 h-3.5 text-destructive" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-mono text-[9px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">{task.friendlyId}</span>
                                                </div>
                                                <p className="leading-relaxed break-words line-clamp-2 text-destructive-foreground font-medium">
                                                    {task.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            {uniqueProjects.length === 0 && (
                <div className="col-span-full text-center p-12 border border-dashed border-border rounded-3xl text-muted-foreground flex flex-col items-center gap-4 bg-card/50">
                    <TrendingUp className="w-12 h-12 opacity-20" />
                    <p>No hay proyectos activos.</p>
                </div>
            )}

        </div >
    );
}
