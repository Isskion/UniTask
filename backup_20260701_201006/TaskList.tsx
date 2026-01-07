"use client";

import React, { useEffect, useState } from 'react';
import { Task } from '@/types';
import { subscribeToProjectTasks, updateTaskStatus, toggleTaskBlock, sortTasks } from '@/lib/tasks';
import { CheckCircle2, Ban, Circle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskListProps {
    projectId: string;
    projectName: string;
}

export default function TaskList({ projectId, projectName }: TaskListProps) {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const unsubscribe = subscribeToProjectTasks(projectId, (data) => {
            setTasks(sortTasks(data));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [projectId]);

    const handleResolve = async (taskId: string) => {
        if (!user) return;
        await updateTaskStatus(taskId, 'completed', user.uid);
    }

    // Toggle between blocked and pending
    const handleToggleBlock = async (task: Task) => {
        if (!user) return;
        // Use implicit boolean toggle, API handles the validation
        await toggleTaskBlock(task.id, !task.isBlocking, user.uid);
    }

    const formatDate = (date: any) => {
        if (!date) return '';
        try {
            // Handle Firestore Timestamp or Date string
            const d = date.toDate ? date.toDate() : new Date(date);
            return format(d, "d MMM", { locale: es });
        } catch (e) {
            return '';
        }
    };

    if (!projectId) return null;

    return (
        <div className="mt-6 border-t border-white/10 pt-6">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Tareas de {projectName}</span>
                <span className="text-xs bg-white/5 px-2 py-1 rounded text-zinc-500">
                    {tasks.length} items
                </span>
            </h3>

            <div className="space-y-2">
                {loading ? (
                    <div className="text-center text-zinc-600 text-xs py-2">Cargando tareas...</div>
                ) : tasks.length === 0 ? (
                    <div className="text-center p-4 bg-white/5 border border-dashed border-white/10 rounded-lg text-zinc-500 text-sm">
                        No hay tareas registradas para este proyecto.
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className={`flex items-start gap-4 p-3 rounded-lg border transition-all ${task.status === 'completed' ? 'bg-emerald-900/10 border-emerald-900/20 opacity-60' :
                            task.isBlocking ? 'bg-red-900/10 border-red-500/30' :
                                'bg-[#0a0a0a] border-white/5 hover:border-white/20'
                            }`}>
                            {/* ID Badge */}
                            <div className="flex flex-col items-center min-w-[50px] mt-1 gap-1">
                                <div className="text-xs font-mono text-zinc-500">
                                    {task.friendlyId || '#'}
                                </div>
                                {task.createdAt && (
                                    <div className="text-[10px] text-zinc-600 font-medium">
                                        {formatDate(task.createdAt)}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <p className={`text-sm ${task.status === 'completed' ? 'text-zinc-500 line-through' :
                                    task.isBlocking ? 'text-red-300 font-medium' : 'text-zinc-300'
                                    }`}>
                                    {task.description}
                                </p>
                                {task.isBlocking && (
                                    <div className="flex items-center gap-1 mt-1 text-red-500 text-xs font-bold">
                                        <AlertCircle className="w-3 h-3" />
                                        BLOQUEANTE (Riesgo Proyecto)
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                                {/* Block Button */}
                                {task.status !== 'completed' && (
                                    <button
                                        onClick={() => handleToggleBlock(task)}
                                        title={task.isBlocking ? "Quitar Bloqueo" : "Marcar como Bloqueante (Riesgo)"}
                                        className={`p-2 rounded transition-colors border ${task.isBlocking ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/50'}`}
                                    >
                                        <Ban className="w-4 h-4" />
                                    </button>
                                )}

                                {/* Complete Button */}
                                <button
                                    onClick={() => handleResolve(task.id)}
                                    title="Completar"
                                    className={`p-2 rounded transition-colors border ${task.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-emerald-500 hover:border-emerald-500/50'}`}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
