"use client";

import { useState, useEffect } from "react";
import { Project, Task } from "@/types";
import { createTimelineEvent } from "@/lib/updates";
import { subscribeToAllTasks } from "@/lib/tasks";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Send, CheckSquare, Sparkles, X } from "lucide-react";

interface TodaysWorkbenchProps {
    project: Project;
    onUpdatePosted: () => void;
    onCancel: () => void;
}

export default function TodaysWorkbench({ project, onUpdatePosted, onCancel }: TodaysWorkbenchProps) {
    const { user, tenantId } = useAuth();
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Context: Active Tasks
    const [activeTasks, setActiveTasks] = useState<Task[]>([]);
    const [tasksLoading, setTasksLoading] = useState(true);

    useEffect(() => {
        // Subscribe to tasks for this project
        const unsub = subscribeToAllTasks(tenantId || "1", (allTasks) => {
            const relevant = allTasks.filter(t =>
                t.projectId === project.id &&
                t.status === 'pending'
            );
            setActiveTasks(relevant);
            setTasksLoading(false);
        });
        return () => unsub();
    }, [project.id, tenantId]);

    const handlePost = async () => {
        if (!notes.trim()) return;
        if (!user) return;

        setIsSubmitting(true);
        try {
            await createTimelineEvent(project.id, tenantId || "1", {
                projectId: project.id,
                date: new Date(),
                type: 'daily',
                authorId: user.uid,
                authorName: user.displayName || 'Consultor',
                content: {
                    notes: notes,
                    nextSteps: [],
                    blockers: "",
                    flags: []
                },
                tags: ['Quick Update']
            });

            setNotes("");
            onUpdatePosted();
        } catch (e) {
            console.error(e);
            alert("Error posting update");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-card border-b border-border p-6 shadow-xl relative z-10 animate-in slide-in-from-top-4 duration-300">
            <div className="max-w-3xl mx-auto flex gap-6">

                {/* LEFT: Input Area */}
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-foreground font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Quick Update
                            <span className="text-muted-foreground font-normal">for {project.name}</span>
                        </h3>
                        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <textarea
                        autoFocus
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder={`What progress was made today on ${project.name}?`}
                        className="w-full h-32 bg-background border border-border rounded-xl p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                    />

                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            {/* Future: Add flags/attachment buttons here */}
                        </div>
                        <button
                            onClick={handlePost}
                            disabled={isSubmitting || !notes.trim()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2 rounded-full flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Post
                        </button>
                    </div>
                </div>

                {/* RIGHT: Context (Active Tasks) */}
                <div className="w-72 border-l border-white/10 pl-6 hidden md:block">
                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground mb-3 flex items-center gap-2">
                        <CheckSquare className="w-3 h-3" />
                        Active Tasks ({activeTasks.length})
                    </h4>

                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {tasksLoading && <div className="text-muted-foreground text-xs">Loading context...</div>}

                        {!tasksLoading && activeTasks.length === 0 && (
                            <div className="text-muted-foreground text-xs italic">No pending tasks.</div>
                        )}

                        {activeTasks.map(task => (
                            <div key={task.id} className="text-xs text-zinc-400 bg-muted/30 p-2 rounded hover:bg-muted/50 transition-colors cursor-default">
                                <span className="text-primary font-bold mr-1">{task.friendlyId}</span>
                                {task.title}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
