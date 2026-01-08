"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Loader2, Search, Layout, FolderGit2, FolderPlus, Trash2, Home, ArrowRight, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useRouter } from "next/navigation";
import { Project, Task } from "@/types";
import { getActiveProjects } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { getAllOpenTasks } from "@/lib/tasks";
import { doc, getDoc } from "firebase/firestore"; // Standard import
import { db } from "@/lib/firebase"; // Standard import

export function CommandMenu() {
    const { userRole, user } = useAuth();
    // Use Context for open state
    const { toggleCommandMenu, isCommandMenuOpen } = useUI();

    // Local Data State
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeTasks, setActiveTasks] = useState<Task[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    // Toggle with Alt+S - LISTENER IS IN UI CONTEXT/PROVIDER?
    // User logic in AppLayout handles button click. Context handles state.
    // We still need the keyboard listener locally? 
    // Ideally, the global listener should be in AppLayout or similar to work EVERYWHERE even if this unmounts.
    // But this component seems to be always mounted in Layout? Yes.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            // Toggle
            if (e.altKey && (e.key === 's' || e.code === 'KeyS')) {
                e.preventDefault();
                toggleCommandMenu();
            }
            // Force Close on ESC (Global)
            if (isCommandMenuOpen && e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                toggleCommandMenu();
            }
        };
        document.addEventListener("keydown", onKeyDown, true); // Capture phase to beat Inputs
        return () => document.removeEventListener("keydown", onKeyDown, true);
    }, [toggleCommandMenu, isCommandMenuOpen]);

    // Debug logging
    useEffect(() => {
        console.log("CommandMenu Auth State:", { user: user?.email, role: userRole });
    }, [user, userRole]);

    // Data Fetching
    useEffect(() => {
        if (isCommandMenuOpen && user) { // Relaxed check: just 'user' object
            setLoading(true);
            console.log("CommandMenu: Starting fetch...");

            const fetchData = async () => {
                try {
                    // Profile
                    if (userRole !== 'app_admin' && userRole !== 'global_pm') {
                        const snap = await getDoc(doc(db, "user", user.uid));
                        if (snap.exists()) setUserProfile(snap.data());
                    }

                    // Projects
                    const allProjects = await getActiveProjects();
                    console.log("CommandMenu: Raw Projects:", allProjects); // Log raw data
                    setProjects(allProjects);

                    // Tasks
                    const allTasks = await getAllOpenTasks();
                    console.log("CommandMenu: Raw Tasks:", allTasks); // Log raw data
                    setActiveTasks(allTasks);

                } catch (e) {
                    console.error("CommandMenu: FATAL FETCH ERROR", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        } else if (isCommandMenuOpen && !user) {
            console.warn("CommandMenu: No user found, skipping fetch.");
        }
    }, [isCommandMenuOpen, user, userRole]);

    // Permissions Filter
    const canSeeProject = (p: Project) => {
        // Admin/Global: Access All
        if (userRole === 'app_admin' || userRole === 'global_pm') return true;

        // Regular User: Check assignments
        if (!userProfile) return false; // Safety: If generic user and no profile loaded, hide.
        const allowedIds = userProfile.assignedProjectIds || [];
        return allowedIds.includes(p.id);
    };

    const visibleProjects = projects.filter(canSeeProject);

    // Task Filter: Show tasks for visible projects OR if project is missing (Orphans)
    // "Must search also in tasks" -> User wants to find THEIR tasks.
    const visibleTasks = activeTasks.filter(t => {
        if (t.status === 'completed') return false; // Double check client side

        const p = projects.find(proj => proj.id === t.projectId);

        // If project found, check visibility
        if (p) {
            return canSeeProject(p);
        }

        // If project NOT found (Orphan), show it?
        // Ideally yes, otherwise these tasks are lost.
        // But maybe check if task.createdBy === user.uid?
        // For debugging/fixing "T: 20 (0 vis)", let's Show All for now.
        return true;
    });

    // STANCE: Strict Filter to avoid "Leaky" fuzzy matches
    const customFilter = (value: string, search: string) => {
        const lowerValue = value.toLowerCase();
        const lowerSearch = search.toLowerCase();
        // Check if any word in search appears in value
        const searchTerms = lowerSearch.split(' ').filter(Boolean);
        if (searchTerms.length === 0) return 1;

        const allTermsMatch = searchTerms.every(term => lowerValue.includes(term));
        return allTermsMatch ? 1 : 0;
    };

    const runCommand = (command: () => void) => {
        toggleCommandMenu(); // Close
        command();
    };

    if (!isCommandMenuOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[15vh] animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl bg-[#1e1e20] rounded-xl shadow-2xl border border-white/10 overflow-hidden transform animate-in zoom-in-95 duration-200 flex flex-col h-[65vh]" // Fixed height for consistency
            // Handle click outside? No, overlay covers it.
            >
                <Command
                    label="Command Menu"
                    className="bg-transparent flex-1 flex flex-col h-full"
                    loop
                    shouldFilter={true}
                    filter={customFilter} // Use strict filter
                >
                    <div className="flex items-center border-b border-white/10 px-4 py-3 shrink-0">
                        <Search className="mr-3 h-5 w-5 shrink-0 opacity-50 text-white" />
                        <Command.Input
                            className="flex h-6 w-full rounded-md bg-transparent text-base outline-none placeholder:text-zinc-500 text-white"
                            placeholder="¿Qué necesitas? (Proyectos, Tareas, Acciones...)"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    toggleCommandMenu();
                                }
                            }}
                        />
                        <div className="hidden md:flex items-center gap-1">
                            <span className="text-xs text-zinc-500 px-1.5 py-0.5 rounded border border-white/10 bg-white/5">Esc</span>
                        </div>
                    </div>

                    <Command.List className="flex-1 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar scroll-smooth">
                        <Command.Empty className="py-12 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            ) : (
                                <>
                                    <Search className="w-8 h-8 opacity-20" />
                                    <p>No encontré nada con es nombre.</p>
                                    <p className="text-xs text-zinc-600">
                                        Proyectos cargados: {visibleProjects.length} | Tareas: {visibleTasks.length}
                                    </p>
                                </>
                            )}
                        </Command.Empty>

                        {!loading && (
                            <>
                                <Command.Group heading="Acciones Rápidas" className="px-2 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                    {(userRole === 'app_admin' || userRole === 'global_pm') && (
                                        <Command.Item
                                            value="Crear Nuevo Proyecto Create New Project"
                                            onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent('open-new-project-modal')))}
                                            className="group relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none aria-selected:bg-[#D32F2F] aria-selected:text-white transition-all transform aria-selected:scale-[1.01]"
                                        >
                                            <FolderPlus className="mr-3 h-4 w-4 text-zinc-400 group-aria-selected:text-white" />
                                            <span>Crear Nuevo Proyecto</span>
                                            <span className="ml-auto text-xs opacity-50">Admin</span>
                                        </Command.Item>
                                    )}
                                    <Command.Item
                                        value="Ir a Editor Go to Editor Home"
                                        onSelect={() => runCommand(() => router.push('/'))}
                                        className="group relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none aria-selected:bg-white/10 transition-all"
                                    >
                                        <Layout className="mr-3 h-4 w-4 text-zinc-400" />
                                        <span>Ir a Editor</span>
                                    </Command.Item>
                                </Command.Group>

                                <Command.Separator className="my-1 h-px bg-white/5" />

                                {/* DYNAMIC PROJECT GROUPS */}
                                {visibleProjects.map((project) => {
                                    // Get tasks for this project
                                    const projectTasks = visibleTasks.filter(t => t.projectId === project.id);

                                    // Optimization: If no tasks and searching specifically for tasks, this group might be empty if we don't return the project item.
                                    // But we always want to show the project item if it matches.

                                    return (
                                        <Command.Group
                                            key={project.id}
                                            // Larger Header Font
                                            heading={`${project.code || 'PRJ'} • ${project.name}`}
                                            className="px-2 py-2 text-sm font-bold text-zinc-400 uppercase tracking-wider !text-zinc-400"
                                        >
                                            {/* 1. The Project Itself */}
                                            <Command.Item
                                                // Include project keywords for strict match
                                                value={`${project.name} ${project.code || ''} ${project.clientName || ''} project proyecto`}
                                                onSelect={() => runCommand(() => {
                                                    window.dispatchEvent(new CustomEvent('switch-project', {
                                                        detail: { name: project.name, id: project.id }
                                                    }));
                                                })}
                                                className="group relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm font-semibold text-zinc-200 outline-none aria-selected:bg-white/10 transition-all mb-1"
                                            >
                                                <FolderGit2 className="mr-3 h-4 w-4" style={{ color: project.color || "#ccc" }} />
                                                <div className="flex flex-col">
                                                    <span>Ir a Proyecto {project.name}</span>
                                                </div>
                                            </Command.Item>

                                            {/* 2. The Tasks - Smaller Font (text-[11px] or xs) */}
                                            {projectTasks.map(task => (
                                                <Command.Item
                                                    key={task.id}
                                                    // Value MUST include Project keywords so searching "Transpais" shows matches here too
                                                    value={`${task.title} ${task.friendlyId || ''} ${project.name} ${project.code || ''} task tarea`}
                                                    onSelect={() => runCommand(() => {
                                                        window.dispatchEvent(new CustomEvent('switch-project', {
                                                            detail: { name: project.name, id: project.id, taskId: task.id }
                                                        }));
                                                    })}
                                                    className="group relative flex cursor-pointer select-none items-center rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-zinc-400 outline-none aria-selected:bg-white/5 aria-selected:text-zinc-200 transition-all border-l border-white/5 ml-2"
                                                >
                                                    <div className={cn("mr-3 h-1.5 w-1.5 rounded-full shrink-0", task.isBlocking ? "bg-red-500 animate-pulse" : "bg-blue-400/50")} />
                                                    <span className="truncate flex-1">{task.title}</span>
                                                    {task.friendlyId && <span className="ml-2 text-[10px] text-zinc-600 font-mono">{task.friendlyId}</span>}
                                                </Command.Item>
                                            ))}
                                        </Command.Group>
                                    );
                                })}

                                {/* ORPHANS (Tasks with no project or hidden project) */}
                                {visibleTasks.filter(t => !projects.find(p => p.id === t.projectId)).length > 0 && (
                                    <Command.Group heading="Sin Proyecto Asignado" className="px-2 py-2 text-sm font-bold text-zinc-500 uppercase tracking-wider">
                                        {visibleTasks.filter(t => !projects.find(p => p.id === t.projectId)).map(task => (
                                            <Command.Item
                                                key={task.id}
                                                value={`${task.title} task tarea sin proyecto`}
                                                onSelect={() => runCommand(() => {
                                                    // Try to open anyway
                                                    alert("Esta tarea no tiene proyecto asociado. No se puede navegar.");
                                                })}
                                                className="group relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-[11px] text-zinc-400 outline-none aria-selected:bg-white/10 transition-all"
                                            >
                                                <div className={cn("mr-3 h-2 w-2 rounded-full", task.isBlocking ? "bg-red-500" : "bg-zinc-500")} />
                                                <span className="truncate">{task.title}</span>
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}
                            </>
                        )}
                        <div className="px-2 py-2 text-[10px] text-zinc-700 border-t border-white/5 flex justify-between shrink-0">
                            <span>UniTask CMD v2.3 Strict</span>
                            <span>
                                {visibleProjects.length} P / {visibleTasks.length} T
                            </span>
                        </div>
                    </Command.List>
                </Command>
            </div>
        </div>
    );
}
