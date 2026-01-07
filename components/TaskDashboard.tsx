"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Project, Task } from '@/types';
import { subscribeToAllTasks } from '@/lib/tasks';
import { Download, ClipboardCopy, FileText, Filter, CheckCircle2, Ban, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskDashboardProps {
    projects: {
        id: string;
        name: string;
        color?: string;
        status?: string
    }[];
}

export default function TaskDashboard({ projects }: TaskDashboardProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToAllTasks((data) => {
            setTasks(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Group tasks by project
    const groupedTasks = useMemo(() => {
        // Filter first
        let filtered = tasks;
        if (filter === 'pending') filtered = tasks.filter(t => t.status !== 'completed');
        if (filter === 'completed') filtered = tasks.filter(t => t.status === 'completed');

        // Group
        const groups: Record<string, Task[]> = {};

        // Initialize groups for all active projects (so they show up even if empty)
        projects.forEach(p => {
            if (p.status === 'active') {
                groups[p.id] = [];
            }
        });
        // Also catch tasks with unknown projects
        groups['unknown'] = [];

        filtered.forEach(task => {
            const pid = task.projectId || 'unknown';
            if (!groups[pid]) groups[pid] = [];
            groups[pid].push(task);
        });

        return groups;
    }, [tasks, projects, filter]);

    // Export Handlers
    const copyToClipboard = () => {
        let text = `# Reporte de Tareas - ${format(new Date(), 'dd/MM/yyyy')}\n\n`;

        projects.forEach(p => {
            const projectTasks = groupedTasks[p.id];
            if (projectTasks && projectTasks.length > 0) {
                text += `## ${p.name}\n`;
                projectTasks.forEach(t => {
                    const statusIcon = t.status === 'completed' ? '[x]' : t.isBlocking ? '[!]' : '[ ]';
                    text += `- ${statusIcon} ${t.description} (${t.friendlyId || 'ID'})\n`;
                });
                text += `\n`;
            }
        });

        // Unknowns
        if (groupedTasks['unknown']?.length > 0) {
            text += `## Sin Proyecto Asignado\n`;
            groupedTasks['unknown'].forEach(t => {
                text += `- [ ] ${t.description}\n`;
            });
        }

        navigator.clipboard.writeText(text);
        alert("¡Reporte copiado al portapapeles!");
    };

    const downloadCSV = () => {
        let csv = 'ID,Project,Status,Description,Created At\n';

        const safeStr = (s: string) => `"${s.replace(/"/g, '""')}"`;

        Object.entries(groupedTasks).forEach(([pid, tasks]) => {
            const pName = projects.find(p => p.id === pid)?.name || 'Unknown';
            tasks.forEach(t => {
                const dateStr = t.createdAt?.toDate ? format(t.createdAt.toDate(), 'yyyy-MM-dd') : '';
                csv += `${t.friendlyId || ''},${safeStr(pName)},${t.status},${safeStr(t.description || '')},${dateStr}\n`;
            });
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

    return (
        <div className="h-full flex flex-col bg-[#09090b]">
            {/* Header / Toolbar */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0c0c0e]">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        Global Task Export
                    </h2>
                    <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-white/5">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filter === 'pending' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filter === 'completed' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Completed
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-bold rounded hover:bg-zinc-700 transition-colors border border-white/5"
                    >
                        <ClipboardCopy className="w-3.5 h-3.5" />
                        Copy Markdown
                    </button>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Content Scroller */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {loading ? (
                    <div className="text-center text-zinc-500 py-20">Loading tasks...</div>
                ) : (
                    Object.keys(groupedTasks).length === 0 ? (
                        <div className="text-center text-zinc-500 py-20">No tasks found.</div>
                    ) : (
                        projects.map(project => {
                            const pTasks = groupedTasks[project.id];
                            if (!pTasks || pTasks.length === 0) return null;

                            return (
                                <div key={project.id} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || '#555' }} />
                                        <h3 className="font-bold text-white text-sm">{project.name}</h3>
                                        <span className="text-zinc-600 text-xs">({pTasks.length})</span>
                                    </div>

                                    <div className="grid gap-2">
                                        {pTasks.map(task => (
                                            <div key={task.id} className="flex items-start gap-3 p-3 bg-[#121212] border border-white/5 rounded-lg hover:border-white/10 transition-colors group">
                                                <div className="mt-0.5">
                                                    {task.status === 'completed' ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    ) : task.isBlocking ? (
                                                        <Ban className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <Circle className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-1.5 rounded">{task.friendlyId || '###'}</span>
                                                        {task.isBlocking && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 rounded">BLOCKED</span>}
                                                    </div>
                                                    <p className={`text-sm ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                                                        {task.description}
                                                    </p>
                                                </div>
                                                <div className="text-[10px] text-zinc-600 whitespace-nowrap">
                                                    {task.createdAt?.toDate ? format(task.createdAt.toDate(), 'MMM d') : ''}
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
        </div>
    );
}
