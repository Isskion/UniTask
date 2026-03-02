"use client";

import { useState, useMemo } from "react";
import { Task, Project } from "@/types";
import { ProjectPlanNode } from "@/lib/project-import";
import { X, Search, Link as LinkIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface Props {
    project: Project;
    planNode: ProjectPlanNode;
    tasks: Task[]; // All tasks to search from
    onClose: () => void;
    onLinked: (taskId: string) => void;
}

export function LinkTaskModal({ project, planNode, tasks, onClose, onLinked }: Props) {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);

    // Filter tasks that are NOT already linked to another plan node
    // Or allow re-linking? We allow re-linking.
    const filteredTasks = useMemo(() => {
        if (!search.trim()) return tasks.slice(0, 50); // Show max 50 for perf
        const lower = search.toLowerCase();
        return tasks.filter(t =>
            t.title.toLowerCase().includes(lower) ||
            (t.friendlyId && t.friendlyId.toLowerCase().includes(lower))
        ).slice(0, 50);
    }, [tasks, search]);

    const handleLink = async (task: Task) => {
        setSaving(true);
        try {
            const taskRef = doc(db, "tasks", task.id);
            const isUnlinking = task.planId === planNode.id;

            await updateDoc(taskRef, {
                planId: isUnlinking ? null : planNode.id
            });
            onLinked(task.id);
            // Don't close immediately to allow linking multiple tasks
        } catch (e: any) {
            console.error(e);
            alert("Error al procesar vinculación: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className={cn(
                "w-full max-w-lg rounded-xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 h-[80vh] max-h-[600px]",
                isLight ? "bg-white border border-zinc-200" : "bg-zinc-900 border border-white/10"
            )}>
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-semibold text-lg">Vincular a Plan Maestro</h3>
                        <p className="text-sm text-zinc-500 line-clamp-1">Nodo: {planNode.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/10 shrink-0">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border",
                        isLight ? "bg-zinc-100/50 border-zinc-200" : "bg-black/20 border-white/5"
                    )}>
                        <Search className="w-4 h-4 text-zinc-500" />
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar tarea por ID o nombre..."
                            className="bg-transparent border-none outline-none text-sm w-full"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-auto p-2">
                    {filteredTasks.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">
                            No se encontraron tareas.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredTasks.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 group transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-black/10">{t.friendlyId}</span>
                                            <span className={cn("text-xs px-2 py-0.5 rounded-full",
                                                t.planId === planNode.id ? "bg-indigo-500/20 text-indigo-400" :
                                                    t.planId ? "bg-amber-500/20 text-amber-400" : "bg-zinc-500/20 text-zinc-400"
                                            )}>
                                                {t.planId === planNode.id ? "Vinculada a este nodo" :
                                                    t.planId ? `Vinculada a WBS ${t.planId}` : "Sin vinculación"}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium mt-1 truncate">{t.title}</p>
                                    </div>
                                    <button
                                        disabled={saving}
                                        onClick={() => handleLink(t)}
                                        className={cn(
                                            "ml-4 p-2 rounded-lg transition-colors",
                                            t.planId === planNode.id
                                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                                        )}
                                        title={t.planId === planNode.id ? "Desvincular" : "Vincular"}
                                    >
                                        <LinkIcon className={cn("w-4 h-4", t.planId === planNode.id && "rotate-45")} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
