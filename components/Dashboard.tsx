"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { JournalEntry, Task, UserProfile } from '@/types';
import { Activity, AlertTriangle, Zap, Ban, CheckCircle2, Circle, TrendingUp, BarChart3, Layers, Calendar, CalendarDays, Filter } from 'lucide-react';
import { subscribeToAllTasks, sortTasks } from '@/lib/tasks';
import { useAuth } from '@/context/AuthContext';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { isSameDay, isSameWeek, isSameMonth, isSameYear, parseISO, startOfWeek, endOfWeek, format, startOfYear, endOfYear, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
    entry: JournalEntry;
    globalProjects?: { id: string, name: string }[];
    userProfile?: UserProfile | null;
    userRole?: string | null;
}

type TimeScope = 'day' | 'week' | 'month' | 'year';

export default function Dashboard({ entry, globalProjects = [], userProfile, userRole }: DashboardProps) {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [timeScope, setTimeScope] = useState<TimeScope>('week');

    // Subscribe to ALL tasks
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        try {
            const unsubscribe = subscribeToAllTasks((data) => {
                console.log("Dashboard received tasks:", data.length);
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
    }, [user]);

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
        if (userRole === 'app_admin' || userRole === 'global_pm') return null; // All projects allowed
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

    // Unique Projects
    const uniqueProjects = useMemo(() => {
        if (!entry) return [];
        const projectMap = new Map<string, { projectId: string, name: string }>();

        // 1. From Tasks
        filteredTasks.forEach(t => {
            if (t.projectId) {
                const name = globalProjects.find(gp => gp.id === t.projectId)?.name || "Unknown Project";
                projectMap.set(t.projectId, { projectId: t.projectId, name });
            }
        });

        // 2. From Entry (Safe fallback)
        if (entry.projects && Array.isArray(entry.projects)) {
            entry.projects.forEach(p => {
                if (p.projectId && !projectMap.has(p.projectId)) {
                    projectMap.set(p.projectId, { projectId: p.projectId, name: p.name });
                }
            });
        }

        return Array.from(projectMap.values());
    }, [filteredTasks, entry, globalProjects]);

    // Chart Data (Memoized & Protected)
    const chartData = useMemo(() => {
        try {
            // Safety checks
            if (!entry || !entry.date) return [];
            let entryDate = parseISO(entry.date);
            if (!isValid(entryDate)) entryDate = new Date();

            let relevantTasks = tasks;
            if (selectedProjectId) {
                relevantTasks = relevantTasks.filter(t => t.projectId === selectedProjectId);
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
    }, [tasks, timeScope, entry, selectedProjectId]);

    const openTasksCount = filteredTasks.filter(t => t.status !== 'completed').length;
    const blockersCount = filteredTasks.filter(t => t.isBlocking).length;

    if (error) {
        return <div className="p-8 text-red-500 text-center border border-red-900 rounded-xl bg-red-950/20">Error: {error}</div>;
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-200 lg:pr-2 overflow-y-auto custom-scrollbar p-6">

            {/* SCOPE SELECTOR */}
            <div className="flex justify-center mb-6">
                <div className="flex bg-[#121212] p-1 rounded-xl border border-white/5 shadow-2xl">
                    {(['day', 'week', 'month', 'year'] as TimeScope[]).map((scope) => (
                        <button
                            key={scope}
                            onClick={() => setTimeScope(scope)}
                            className={`
                                px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                ${timeScope === scope ? 'bg-[#D32F2F] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
                            `}
                        >
                            {scope === 'day' ? 'Día' : scope === 'week' ? 'Semana' : scope === 'month' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>
            </div>

            {/* CHART */}
            <div className="w-full h-[320px] bg-[#121212] border border-white/5 rounded-3xl p-6 mb-8 relative group overflow-hidden shadow-2xl shrink-0">
                {/* Gradients and Header omitted for brevity in thought, but kept in code ... */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#D32F2F]/5 to-transparent opacity-50 pointer-events-none" />

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-[#D32F2F]" />
                            {selectedProjectId
                                ? uniqueProjects.find(p => p.projectId === selectedProjectId)?.name || 'Project Trend'
                                : 'Flujo de Tareas'
                            }
                        </h2>
                        <p className="text-zinc-500 text-sm capitalize">
                            Vistazo: {timeScope === 'day' ? 'Hoy' : timeScope}
                        </p>
                    </div>
                </div>

                <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <defs>
                                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#D32F2F" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#D32F2F" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} interval={timeScope === 'month' ? 2 : 0} />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="active" stroke="#D32F2F" fillOpacity={1} fill="url(#colorActive)" strokeWidth={3} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* METRICS */}
            <div className="flex justify-end gap-3 mb-6">
                <div className="px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800 text-xs font-mono text-zinc-400 shadow-xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    ACTIVAS: <span className="text-white font-bold">{loading ? "..." : openTasksCount}</span>
                </div>
                <div className="px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800 text-xs font-mono text-zinc-400 shadow-xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    BLOQUEANTES: <span className="text-red-400 font-bold">{blockersCount}</span>
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
                    const isSelected = selectedProjectId === project.projectId;

                    const myTasks = sortTasks(
                        filteredTasks.filter(t => t.projectId === project.projectId && t.status !== 'completed')
                    );

                    // Health Logic
                    let color = 'text-emerald-400';
                    let ring = 'border-emerald-500 shadow-[0_0_15px_rgba(52,211,153,0.4)]';
                    let Icon = Activity;
                    let label = 'Healthy';
                    let reason = 'Todo fluye correctamente.';

                    if (blocked > 0) {
                        color = 'text-red-500';
                        ring = 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
                        Icon = Ban;
                        label = 'Critical Blocker';
                        reason = `¡Atención! Hay ${blocked} tareas bloqueantes que impiden el avance.`;
                    } else if (percentage < 50 && total > 0) {
                        color = 'text-yellow-500';
                        ring = 'border-yellow-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
                        Icon = AlertTriangle;
                        label = 'At Risk';
                        reason = `Riesgo: El progreso (${percentage}%) es bajo. Se recomienda acelerar.`;
                    } else if (total === 0) {
                        color = 'text-zinc-500';
                        ring = 'border-zinc-700';
                        label = 'No Tasks';
                        reason = 'No hay tareas activas en este periodo.';
                    }

                    return (
                        <div
                            key={pid}
                            onClick={() => setSelectedProjectId(prev => prev === pid ? null : pid)}
                            className={`
                                rounded-2xl p-6 relative overflow-hidden group transition-all flex flex-col shadow-2xl cursor-pointer
                                border-2 ${isSelected ? 'border-[#D32F2F] bg-[#1a0505]' : 'border-white/5 bg-[#121212] hover:border-white/10'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white truncate max-w-[200px]" title={project.name}>{project.name}</h3>
                                    <p className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${label === 'Critical Blocker' ? 'text-red-500 animate-pulse block' : 'text-zinc-500'}`}>{label}</p>
                                </div>
                                <div
                                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-black ${ring}`}
                                    title={reason}
                                >
                                    <Icon className={`w-6 h-6 ${color}`} />
                                </div>
                            </div>

                            <div className="flex items-end justify-between mb-2 relative z-10 mt-2">
                                <div className="flex flex-col">
                                    <span className="text-4xl font-extrabold text-white tracking-tighter">{percentage}%</span>
                                    <span className="text-zinc-500 text-[10px] font-mono uppercase">Progreso</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-white font-bold font-mono">{completed}/{total}</span>
                                    <span className="text-zinc-600 text-[10px] block">Tareas Hechas</span>
                                </div>
                            </div>
                            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-6 border border-white/5">
                                <div
                                    className={`h-full transition-all duration-700 ease-out ${label === 'Critical Blocker' ? 'bg-red-500' : label === 'At Risk' ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            <div className="h-px w-full bg-white/5 mb-4" />

                            <div className="flex-1 min-h-[120px] space-y-2 overflow-y-auto custom-scrollbar pr-1 max-h-[300px]">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Tareas Activas
                                </h4>
                                {myTasks.length === 0 ? (
                                    <div className="text-zinc-700 text-xs italic text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                                        Todo completado
                                    </div>
                                ) : (
                                    myTasks.map(task => (
                                        <div key={task.id} className={`group/task flex items-start gap-3 p-2 rounded-lg transition-all text-xs border ${task.isBlocking ? 'bg-red-950/30 border-red-500/30' :
                                            'bg-zinc-900/50 border-white/5 hover:bg-zinc-800 hover:border-white/10'
                                            }`}>
                                            <div className="mt-0.5 shrink-0">
                                                {task.isBlocking ?
                                                    <Ban className="w-3.5 h-3.5 text-red-500" /> :
                                                    <Circle className="w-3.5 h-3.5 text-zinc-600 group-hover/task:text-zinc-400" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-mono text-[9px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">{task.friendlyId}</span>
                                                </div>
                                                <p className={`leading-relaxed break-words line-clamp-2 ${task.isBlocking ? 'text-red-200 font-medium' :
                                                    'text-zinc-300'
                                                    }`}>
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
                <div className="col-span-full text-center p-12 border border-dashed border-white/10 rounded-3xl text-zinc-600 flex flex-col items-center gap-4">
                    <TrendingUp className="w-12 h-12 opacity-20" />
                    <p>No hay proyectos activos para este periodo.</p>
                </div>
            )}
        </div>
    );
}
