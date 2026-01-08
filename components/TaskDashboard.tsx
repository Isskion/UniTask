"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Project, Task } from '@/types';
import { subscribeToAllTasks } from '@/lib/tasks';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Download, ClipboardCopy, FileText, Filter, CheckCircle2, Ban, Circle, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
    const { user } = useAuth();
    const { permissions, isAdmin, getAllowedProjectIds, loading: permissionsLoading } = usePermissions();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const unsubscribe = subscribeToAllTasks((data) => {
            setTasks(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Group tasks by project
    const groupedTasks = useMemo(() => {
        // Filter first
        let filtered = tasks;
        if (filter === 'pending') filtered = tasks.filter(t => t.status !== 'completed');
        if (filter === 'completed') filtered = tasks.filter(t => t.status === 'completed');

        // Text Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                (t.description?.toLowerCase().includes(query)) ||
                (t.friendlyId?.toLowerCase().includes(query)) ||
                (t.title?.toLowerCase().includes(query))
            );
        }

        // SECURITY FILTER: Only keep tasks that belong to allowed projects
        // Use centralized permission system
        const allowedIds = getAllowedProjectIds();
        const allowedProjectIds = allowedIds.length === 0 && isAdmin()
            ? projects.map(p => p.id) // Admin with empty array means "all"
            : allowedIds.filter(id => projects.some(p => p.id === id)); // Intersect with props


        filtered = filtered.filter(t => {
            if (!t.projectId) return isAdmin(); // Only admins see orphans
            return allowedProjectIds.includes(t.projectId);
        });

        // Group
        const groups: Record<string, Task[]> = {};

        // Initialize groups for all active projects (so they show up even if empty)
        // MUST FILTER PROJECTS TOO
        projects.forEach(p => {
            if (allowedProjectIds.includes(p.id)) {
                groups[p.id] = [];
            }
        });
        // Also catch tasks with unknown projects (admins only effectively due to filter above)
        groups['unknown'] = [];

        filtered.forEach(task => {
            const pid = task.projectId || 'unknown';
            // Double check: don't push if not in permitted group (unless unknown/admin)
            if (pid === 'unknown' && !isAdmin) return;

            if (pid !== 'unknown' && !allowedProjectIds.includes(pid)) return; // Extra safety

            if (!groups[pid]) groups[pid] = [];
            groups[pid].push(task);
        });

        return groups;
    }, [tasks, projects, filter, searchQuery, permissions]);

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
        <div className="h-full flex flex-col bg-background">
            {/* Header / Toolbar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-md sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Global Task Export
                    </h2>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md mx-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex bg-secondary rounded-lg p-0.5 border border-border">
                        <button
                            onClick={() => setFilter('all')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                filter === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                filter === 'pending' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                filter === 'completed' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            Completed
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded hover:bg-secondary/80 transition-colors border border-border"
                    >
                        <ClipboardCopy className="w-3.5 h-3.5" />
                        Copy Markdown
                    </button>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </button>
                </div>
            </div>


            {/* Content Scroller */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {(loading || (permissionsLoading && !isAdmin)) ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                        {(permissionsLoading && !isAdmin) ? "Verifying permissions..." : "Loading tasks..."}
                    </div>
                ) : (
                    Object.keys(groupedTasks).length === 0 ? (
                        <div className="text-center text-muted-foreground py-20 bg-card/30 rounded-xl border border-dashed border-border mx-auto max-w-2xl">
                            No tasks found matching your criteria.
                        </div>
                    ) : (
                        projects.map(project => {
                            const pTasks = groupedTasks[project.id];
                            if (!pTasks || pTasks.length === 0) return null;

                            return (
                                <div key={project.id} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex items-center gap-2 border-b border-border pb-2 px-1">
                                        <span className="w-2 h-2 rounded-full ring-1 ring-white/10" style={{ backgroundColor: project.color || '#555' }} />
                                        <h3 className="font-bold text-foreground text-sm">{project.name}</h3>
                                        <span className="text-muted-foreground text-xs">({pTasks.length})</span>
                                    </div>

                                    <div className="grid gap-2">
                                        {pTasks.map(task => (
                                            <div key={task.id} className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all group">
                                                <div className="mt-0.5">
                                                    {task.status === 'completed' ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                    ) : task.isBlocking ? (
                                                        <Ban className="w-4 h-4 text-destructive" />
                                                    ) : (
                                                        <Circle className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 rounded">{task.friendlyId || '###'}</span>
                                                        {task.isBlocking && <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 rounded">BLOCKED</span>}
                                                    </div>
                                                    <p className={`text-sm ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                        {task.description}
                                                    </p>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground whitespace-nowrap">
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

                {/* Render Unknown / Unassigned Tasks */}
                {groupedTasks['unknown'] && groupedTasks['unknown'].length > 0 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 pt-8 border-t border-dashed border-border/50">
                        <div className="flex items-center gap-2 border-b border-border pb-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                            <h3 className="font-bold text-muted-foreground text-sm">Sin Proyecto Asignado</h3>
                            <span className="text-muted-foreground text-xs">({groupedTasks['unknown'].length})</span>
                        </div>
                        <div className="grid gap-2">
                            {groupedTasks['unknown'].map(task => (
                                <div key={task.id} className="flex items-start gap-3 p-3 bg-card/50 border border-border/50 rounded-xl hover:bg-card hover:border-border transition-all group opacity-75 hover:opacity-100 shadow-sm">
                                    <div className="mt-0.5">
                                        {task.status === 'completed' ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : task.isBlocking ? (
                                            <Ban className="w-4 h-4 text-destructive" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 rounded">{task.friendlyId || '###'}</span>
                                        </div>
                                        <p className={`text-sm ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-zinc-300'}`}>
                                            {task.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
