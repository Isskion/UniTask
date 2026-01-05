"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { WeeklyEntry, Task } from '@/types';
import { Activity, AlertTriangle, Zap, Ban, CheckCircle2, Circle, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { subscribeToWeekTasks, sortTasks } from '@/lib/tasks';
import { useAuth } from '@/context/AuthContext';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
    entry: WeeklyEntry;
}

export default function Dashboard({ entry }: DashboardProps) {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Subscribe to ALL tasks for this week
    useEffect(() => {
        if (!entry.id) return;
        setLoading(true);
        const unsubscribe = subscribeToWeekTasks(entry.id, (data) => {
            setTasks(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [entry.id]);

    // Compute Stats Map
    const projectStats = useMemo(() => {
        const stats: Record<string, { total: number; completed: number; blocked: number }> = {};

        tasks.forEach(t => {
            const pid = t.projectId || 'global';
            if (!stats[pid]) stats[pid] = { total: 0, completed: 0, blocked: 0 };

            stats[pid].total++;
            if (t.status === 'completed') stats[pid].completed++;
            if (t.status === 'blocked') stats[pid].blocked++;
        });
        return stats;
    }, [tasks]);

    const openTasksCount = tasks.filter(t => t.status !== 'completed').length;
    const blockersCount = tasks.filter(t => t.status === 'blocked').length;

    const getHealthMetadata = (completed: number, total: number, blocked: number) => {
        if (total === 0) return { color: 'text-zinc-500', ring: 'border-zinc-700', icon: Activity, label: 'No Tasks' };

        const percentage = (completed / total) * 100;

        if (blocked > 0) return { color: 'text-red-500', ring: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]', icon: Ban, label: 'Critical Blocker' };
        if (percentage < 50) return { color: 'text-yellow-500', ring: 'border-yellow-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]', icon: AlertTriangle, label: 'At Risk' };
        return { color: 'text-emerald-400', ring: 'border-emerald-500 shadow-[0_0_15px_rgba(52,211,153,0.4)]', icon: Activity, label: 'Healthy' };
    };

    // Deduplicate Projects Only (Relaxed Filtering)
    const uniqueProjects = useMemo(() => {
        const seen = new Set();
        return entry.projects.filter(p => {
            const key = p.projectId || p.name;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [entry.projects]);

    // Derived Data for Chart
    const activeChartTasks = useMemo(() => {
        if (!selectedProjectId) return tasks;
        return tasks.filter(t => t.projectId === selectedProjectId);
    }, [tasks, selectedProjectId]);

    const chartData = useMemo(() => {
        const total = activeChartTasks.length;
        const completedCount = activeChartTasks.filter(t => t.status === 'completed').length;

        // Simulate "Hill" trajectory:
        // 1. Created (Scope) ramps up fast.
        // 2. Completed (Progress) ramps up slow then fast.
        // 3. Active (Wave) = Created - Completed. Should go Up then Down.

        return Array.from({ length: 14 }).map((_, i) => {
            const progress = i / 13;
            // Scope ramps up in first half
            const createdFactor = Math.min(1, progress * 3);
            const createdCurrent = Math.floor(total * createdFactor);

            // Completion ramps up in second half mostly
            // progress^2 curve
            const rawCompleted = Math.floor(completedCount * Math.pow(progress, 1.5));
            const completedCurrent = Math.min(completedCount, rawCompleted);

            return {
                name: `D${i}`,
                created: createdCurrent,
                active: Math.max(0, createdCurrent - completedCurrent)
            };
        });
    }, [activeChartTasks]);

    const handleCardClick = (pid: string) => {
        setSelectedProjectId(prev => prev === pid ? null : pid);
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-200 lg:pr-2 overflow-y-auto custom-scrollbar p-6">

            {/* BIG WOW CHART SECTION */}
            <div className="w-full h-[320px] bg-[#121212] border border-white/5 rounded-3xl p-6 mb-8 relative group overflow-hidden shadow-2xl shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#D32F2F]/5 to-transparent opacity-50 pointer-events-none" />

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-[#D32F2F]" />
                            {selectedProjectId
                                ? uniqueProjects.find(p => p.projectId === selectedProjectId)?.name || 'Project Trend'
                                : 'Global Task Flow'
                            }
                        </h2>
                        <p className="text-zinc-500 text-sm">Task Scope (Bars) vs Active Workload (Wave)</p>
                    </div>
                    {selectedProjectId && (
                        <button
                            onClick={() => setSelectedProjectId(null)}
                            className="text-xs text-zinc-400 hover:text-white bg-white/5 px-3 py-1 rounded-full border border-white/5 hover:bg-white/10 transition-colors"
                        >
                            Clear Selection
                        </button>
                    )}
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
                            <XAxis dataKey="name" hide />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            {/* Bars: Task Creation (Scope) */}
                            <Bar dataKey="created" barSize={12} fill="#333" radius={[4, 4, 0, 0]} />

                            {/* Area: Active Tasks (Wave) */}
                            <Area type="monotone" dataKey="active" stroke="#D32F2F" fillOpacity={1} fill="url(#colorActive)" strokeWidth={3} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Header / Stats Overlay */}
            <div className="flex justify-end gap-3 mb-6">
                <div className="px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800 text-xs font-mono text-zinc-400 shadow-xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    OPEN: <span className="text-white font-bold">{loading ? "..." : openTasksCount}</span>
                </div>
                <div className="px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800 text-xs font-mono text-zinc-400 shadow-xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    BLOCKERS: <span className="text-red-400 font-bold">{loading ? "..." : blockersCount}</span>
                </div>
            </div>

            {/* Dynamic Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {uniqueProjects.map((project, idx) => {
                    const pid = project.projectId || `proj-${idx}`; // Fallback key
                    const stats = projectStats[project.projectId || ''] || { total: 0, completed: 0, blocked: 0 };
                    const { color, ring, icon: Icon, label } = getHealthMetadata(stats.completed, stats.total, stats.blocked);
                    const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                    const isSelected = selectedProjectId === project.projectId;

                    // Filter tasks for this project (OPEN ONLY for list) + SORTED
                    const myTasks = sortTasks(
                        tasks.filter(t => t.projectId === project.projectId && t.status !== 'completed')
                    );

                    return (
                        <div
                            key={pid}
                            onClick={() => handleCardClick(project.projectId || '')}
                            className={`
                                rounded-2xl p-6 relative overflow-hidden group transition-all flex flex-col shadow-2xl cursor-pointer
                                border-2 ${isSelected ? 'border-[#D32F2F] bg-[#1a0505]' : 'border-white/5 bg-[#121212] hover:border-white/10'}
                            `}
                        >
                            {/* Header Stats */}
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white truncate max-w-[200px]" title={project.name}>{project.name}</h3>
                                    <p className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${label === 'Critical Blocker' ? 'text-red-500 animate-pulse block' : 'text-zinc-500'}`}>{label}</p>
                                </div>
                                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-black ${ring}`}>
                                    <Icon className={`w-6 h-6 ${color}`} />
                                </div>
                            </div>

                            {/* Percent & Bar */}
                            <div className="flex items-end justify-between mb-2 relative z-10 mt-2">
                                <div className="flex flex-col">
                                    <span className="text-4xl font-extrabold text-white tracking-tighter">{percentage}%</span>
                                    <span className="text-zinc-500 text-[10px] font-mono uppercase">Completion Rate</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-white font-bold font-mono">{stats.completed}/{stats.total}</span>
                                    <span className="text-zinc-600 text-[10px] block">Tasks Done</span>
                                </div>
                            </div>
                            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden mb-6 border border-white/5">
                                <div
                                    className={`h-full transition-all duration-700 ease-out ${label === 'Critical Blocker' ? 'bg-red-500' : label === 'At Risk' ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            <div className="h-px w-full bg-white/5 mb-4" />

                            {/* Task List (OPEN TASKS ONLY) */}
                            <div className="flex-1 min-h-[120px] space-y-2 overflow-y-auto custom-scrollbar pr-1 max-h-[300px]">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Active Tasks
                                </h4>
                                {myTasks.length === 0 ? (
                                    <div className="text-zinc-700 text-xs italic text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                                        All tasks completed
                                    </div>
                                ) : (
                                    myTasks.map(task => (
                                        <div key={task.id} className={`group/task flex items-start gap-3 p-2 rounded-lg transition-all text-xs border ${task.status === 'blocked' ? 'bg-red-950/30 border-red-500/30' :
                                                'bg-zinc-900/50 border-white/5 hover:bg-zinc-800 hover:border-white/10'
                                            }`}>
                                            <div className="mt-0.5 shrink-0">
                                                {task.status === 'blocked' ?
                                                    <Ban className="w-3.5 h-3.5 text-red-500" /> :
                                                    <Circle className="w-3.5 h-3.5 text-zinc-600 group-hover/task:text-zinc-400" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-mono text-[9px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">{task.friendlyId}</span>
                                                </div>
                                                <p className={`leading-relaxed break-words line-clamp-2 ${task.status === 'blocked' ? 'text-red-200 font-medium' :
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

                {uniqueProjects.length === 0 && (
                    <div className="col-span-full text-center p-12 border border-dashed border-white/10 rounded-3xl text-zinc-600 flex flex-col items-center gap-4">
                        <TrendingUp className="w-12 h-12 opacity-20" />
                        <p>No active projects available for this week.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
