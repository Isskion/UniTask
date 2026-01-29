"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useSprints } from "@/hooks/useSprints";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { Task } from "@/types";
import { Timer, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';

export function SprintPlanningBoard() {
    const { user, tenantId } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { sprints } = useSprints();
    const { t } = useLanguage();

    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
    const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
    const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Get active/planning sprints
    const availableSprints = sprints.filter(s => s.status === 'active' || s.status === 'planning');
    const selectedSprint = availableSprints.find(s => s.id === selectedSprintId);

    // Load tasks
    useEffect(() => {
        if (!tenantId) return;

        const tasksRef = collection(db, "tasks");
        const q = query(tasksRef, where("tenantId", "==", tenantId), where("isActive", "==", true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));

            // Separate backlog (no sprint) from sprint tasks
            const backlog = allTasks.filter(t => !t.sprintId && t.status !== 'completed');
            const sprint = selectedSprintId
                ? allTasks.filter(t => t.sprintId === selectedSprintId)
                : [];

            setBacklogTasks(backlog);
            setSprintTasks(sprint);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId, selectedSprintId]);

    // Calculate capacity metrics
    const calculateCapacity = () => {
        if (!selectedSprint) return { committed: 0, capacity: 0, percentage: 0 };

        const committed = sprintTasks.reduce((sum, task) => sum + (task.estimatedEffort || 0), 0);
        const capacity = selectedSprint.capacity || 20; // Default 20 days
        const percentage = capacity > 0 ? (committed / capacity) * 100 : 0;

        return { committed, capacity, percentage };
    };

    const { committed, capacity, percentage } = calculateCapacity();

    // Get capacity color
    const getCapacityColor = () => {
        if (percentage < 80) return "text-green-500";
        if (percentage < 100) return "text-yellow-500";
        return "text-red-500";
    };

    const getCapacityBg = () => {
        if (percentage < 80) return "bg-green-500";
        if (percentage < 100) return "bg-yellow-500";
        return "bg-red-500";
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const taskId = active.id as string;
        const targetContainer = over.id as string;

        // Find the task
        const task = [...backlogTasks, ...sprintTasks].find(t => t.id === taskId);
        if (!task) return;

        // Determine new sprint ID based on drop container
        let newSprintId: string | null = null;
        if (targetContainer === 'sprint-column') {
            if (!selectedSprintId) return; // Should not happen if container is visible
            newSprintId = selectedSprintId;
        } else if (targetContainer === 'backlog-column') {
            newSprintId = null;
        } else {
            return; // Dropped elsewhere
        }

        // Only update if changed
        if (task.sprintId !== newSprintId) {
            // Optimistic Update (Optional, but Firestore listener is fast enough usually)

            // Firestore Update
            try {
                const taskRef = doc(db, 'tasks', taskId);
                const updates: any = {
                    sprintId: newSprintId
                };

                // If assigning to a sprint, suggest updating the clientDeadline to match Sprint End
                // This fits the "Promise Simulator" concept: We promise to deliver by Sprint End.
                if (newSprintId) {
                    const targetSprint = availableSprints.find(s => s.id === newSprintId);
                    if (targetSprint && targetSprint.endDate) {
                        // We set it as the default deadline if none exists, or update it?
                        // Providing a strong default makes sense for "Simulator".
                        // Let's set it.
                        updates.clientDeadline = targetSprint.endDate;

                        // Also update endDate (technical deadline) to match?
                        // Let's keep them synced for now to ensure visibility in ABM.
                        updates.endDate = targetSprint.endDate.toDate ? targetSprint.endDate.toDate().toISOString() : targetSprint.endDate;
                    }
                } else {
                    // If moving to backlog, maybe clear the deadline?
                    // Safer to keep it, as client might still expect it by then.
                }

                await updateDoc(taskRef, updates);
            } catch (error) {
                console.error("Error updating sprint:", error);
                // Revert logic here if needed, or rely on snapshot to fix it
            }
        }
    };

    const activeTask = activeId ? [...backlogTasks, ...sprintTasks].find(t => t.id === activeId) : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className={cn("text-sm", isLight ? "text-zinc-600" : "text-zinc-400")}>
                        {t('sprints.loading')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className={cn("border-b pb-4", isLight ? "border-black" : "border-white/10")}>
                    <h1 className={cn("text-2xl font-bold flex items-center gap-2", isLight ? "text-black" : "text-white")}>
                        <Timer className="w-6 h-6 text-emerald-500" />
                        {t('sprints.simulator_title')}
                    </h1>
                    <p className={cn("text-sm mt-1", isLight ? "text-zinc-600" : "text-zinc-400")}>
                        {t('sprints.simulator_subtitle')}
                    </p>
                </div>

                {/* Sprint Selector & Capacity */}
                <div className={cn("border rounded-xl p-6 shadow-sm", isLight ? "bg-white border-black" : "bg-card border-white/10")}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sprint Selector */}
                        <div>
                            <label className={cn("text-xs font-bold uppercase block mb-2", isLight ? "text-zinc-700" : "text-white")}>
                                {t('sprints.sprint_active')}
                            </label>
                            <select
                                value={selectedSprintId || ""}
                                onChange={e => setSelectedSprintId(e.target.value || null)}
                                className={cn("w-full border rounded-lg px-4 py-3 text-sm font-bold focus:ring-2 outline-none",
                                    isLight ? "bg-white border-black text-black focus:ring-black/10" : "bg-black/20 border-white/10 text-white focus:ring-indigo-500/50"
                                )}
                            >
                                <option value="">{t('sprints.select_sprint')}</option>
                                {availableSprints.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.status.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Capacity Indicator */}
                        {selectedSprint && (
                            <div>
                                <label className={cn("text-xs font-bold uppercase block mb-2", isLight ? "text-zinc-700" : "text-white")}>
                                    {t('sprints.sprint_promise')}
                                </label>
                                <div className="space-y-2">
                                    {/* Progress Bar */}
                                    <div className={cn("h-8 rounded-lg overflow-hidden", isLight ? "bg-zinc-100" : "bg-black/20")}>
                                        <div
                                            className={cn("h-full transition-all duration-300", getCapacityBg())}
                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                        />
                                    </div>
                                    {/* Metrics */}
                                    <div className="flex items-center justify-between text-xs">
                                        <span className={cn("font-mono", getCapacityColor())}>
                                            {committed.toFixed(1)} / {capacity} {t('sprints.days')}
                                        </span>
                                        <span className={cn("font-bold", getCapacityColor())}>
                                            {percentage < 80 && t('sprints.promise_healthy')}
                                            {percentage >= 80 && percentage < 100 && t('sprints.promise_tight')}
                                            {percentage >= 100 && t('sprints.promise_risky')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Board */}
                {selectedSprintId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        {/* Backlog Column */}
                        <DroppableColumn
                            id="backlog-column"
                            title={t('sprints.backlog')}
                            count={backlogTasks.length}
                            icon={Users}
                            isLight={isLight}
                            className={isLight ? "bg-white border-black" : "bg-card border-white/10"}
                        >
                            {backlogTasks.length === 0 ? (
                                <p className={cn("text-xs text-center py-8", isLight ? "text-zinc-400" : "text-zinc-500")}>
                                    {t('sprints.no_backlog_tasks')}
                                </p>
                            ) : (
                                backlogTasks.map(task => (
                                    <DraggableTaskCard key={task.id} task={task} isLight={isLight} t={t} />
                                ))
                            )}
                        </DroppableColumn>

                        {/* Sprint Column */}
                        <DroppableColumn
                            id="sprint-column"
                            title={t('sprints.current_promise')}
                            count={sprintTasks.length}
                            icon={TrendingUp}
                            isLight={isLight}
                            className={isLight ? "bg-white border-black shadow-emerald-100" : "bg-emerald-950/20 border-emerald-500/20"}
                            titleClassName={isLight ? "text-emerald-700" : "text-emerald-400"}
                            headerIconClassName={isLight ? "text-emerald-700" : "text-emerald-400"}
                        >
                            {sprintTasks.length === 0 ? (
                                <p className={cn("text-xs text-center py-8", isLight ? "text-emerald-600" : "text-emerald-500")}>
                                    {t('sprints.drag_here')}
                                </p>
                            ) : (
                                sprintTasks.map(task => (
                                    <DraggableTaskCard key={task.id} task={task} isLight={isLight} inSprint t={t} />
                                ))
                            )}
                        </DroppableColumn>
                    </div>
                ) : (
                    <div className={cn("border rounded-xl p-12 text-center", isLight ? "bg-white border-zinc-200" : "bg-card border-white/10")}>
                        <Timer className={cn("w-12 h-12 mx-auto mb-4", isLight ? "text-zinc-400" : "text-zinc-600")} />
                        <p className={cn("text-sm font-bold", isLight ? "text-zinc-700" : "text-white")}>
                            {t('sprints.select_to_start')}
                        </p>
                        <p className={cn("text-xs mt-1", isLight ? "text-zinc-500" : "text-zinc-400")}>
                            {t('sprints.select_desc')}
                        </p>
                    </div>
                )}

                <DragOverlay>
                    {activeTask ? (
                        <div className="opacity-80 rotate-2 cursor-grabbing">
                            <TaskCard task={activeTask} isLight={isLight} t={t} />
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}

// Droppable Column Component
function DroppableColumn({ id, title, count, children, icon: Icon, isLight, className, titleClassName, headerIconClassName }: any) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={cn("border rounded-xl p-4 shadow-sm transition-colors",
                className,
                isOver && (isLight ? "bg-zinc-50 border-emerald-500 ring-2 ring-emerald-500/10" : "bg-white/5 border-emerald-500 ring-2 ring-emerald-500/10")
            )}
        >
            <h3 className={cn("text-sm font-bold uppercase mb-4 flex items-center gap-2",
                titleClassName || (isLight ? "text-zinc-700" : "text-white")
            )}>
                <Icon className={cn("w-4 h-4", headerIconClassName)} />
                {title} ({count})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto min-h-[200px]">
                {children}
            </div>
        </div>
    );
}

// Draggable Task Card Wrapper
function DraggableTaskCard(props: any) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: props.task.id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn("touch-none", isDragging && "opacity-50")}>
            <TaskCard {...props} />
        </div>
    );
}

// Task Card Pure Component
function TaskCard({ task, isLight, inSprint = false, t }: { task: Task; isLight: boolean; inSprint?: boolean; t: (key: string) => string }) {
    const hasRisk = task.clientDeadline && task.sprintId;

    return (
        <div className={cn("border rounded-lg p-3 cursor-grab hover:shadow-md transition-all select-none bg-white",
            isLight ? "bg-white border-black hover:border-black/70 shadow-sm" : "bg-zinc-900 border-white/10 hover:border-indigo-500/50"
        )}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-bold truncate", isLight ? "text-zinc-900" : "text-white")}>
                        {task.friendlyId || task.id.slice(0, 8)}
                    </p>
                    <p className={cn("text-xs mt-1 line-clamp-2", isLight ? "text-zinc-600" : "text-zinc-400")}>
                        {task.title}
                    </p>
                </div>
                {task.estimatedEffortSize && (
                    <div className={cn("text-[10px] font-bold px-2 py-1 rounded",
                        task.estimatedEffortSize === 'XS' ? "bg-blue-100 text-blue-700" :
                            task.estimatedEffortSize === 'S' ? "bg-green-100 text-green-700" :
                                task.estimatedEffortSize === 'M' ? "bg-yellow-100 text-yellow-700" :
                                    task.estimatedEffortSize === 'L' ? "bg-orange-100 text-orange-700" :
                                        "bg-red-100 text-red-700"
                    )}>
                        {task.estimatedEffortSize}
                    </div>
                )}
            </div>
            {task.estimatedEffort && (
                <div className={cn("text-[10px] mt-2 font-mono", isLight ? "text-zinc-500" : "text-zinc-400")}>
                    ≈ {task.estimatedEffort} {t('sprints.days')}
                </div>
            )}
            {hasRisk && (
                <div className="flex items-center gap-1 mt-2 text-[10px] text-red-500">
                    <AlertTriangle className="w-3 h-3" />
                    {t('sprints.risk_client_deadline')}
                </div>
            )}
        </div>
    );
}
