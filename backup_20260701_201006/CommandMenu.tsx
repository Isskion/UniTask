"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Loader2, Search, Layout, FolderGit2, FolderPlus, Trash2, Home, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Project } from "@/types";
import { getActiveProjects } from "@/lib/projects";
import { cn } from "@/lib/utils";

export function CommandMenu() {
    const { userRole, user } = useAuth();
    const [open, setOpen] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null); // Quick fetch for permissions
    const router = useRouter();

    // Toggle with Ctrl+K or Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Fetch projects when opening
    useEffect(() => {
        if (open) {
            // Need user profile for permissions if not global
            if (user?.uid) {
                import("firebase/firestore").then(({ getDoc, doc }) => {
                    import("@/lib/firebase").then(({ db }) => {
                        getDoc(doc(db, "user", user.uid)).then(snap => {
                            if (snap.exists()) setUserProfile(snap.data());
                        });
                    });
                });
            }

            getActiveProjects().then(allProjects => {
                if (userRole === 'app_admin' || userRole === 'global_pm') {
                    setProjects(allProjects);
                } else if (userProfile && userProfile.assignedProjectIds) {
                    // Filter for restricted users
                    const allowedIds = userProfile.assignedProjectIds || [];
                    setProjects(allProjects.filter(p => allowedIds.includes(p.id)));
                } else {
                    // Fallback if profile not loaded yet, or no assignments.
                    // Ideally we wait for profile, but valid projects are better than leaking.
                    // If we are restricted and profile isn't ready, show nothing or wait.
                    // Since Effect might race, let's filter inside render or here if we have profile.
                    // BETTER: Do it cleanly next block
                    setProjects(allProjects);
                }
            });
        }
    }, [open, userRole, user?.uid]);

    // Apply strict filtering on render/state update to be safe
    const visibleProjects = projects.filter(p => {
        if (userRole === 'app_admin' || userRole === 'global_pm') return true;
        // If we don't have profile yet, be safe and hide, OR assume empty if logic flows correctly
        if (!userProfile?.assignedProjectIds) return false;
        return userProfile.assignedProjectIds.includes(p.id);
    });

    // Navigate Helper
    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh] animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 overflow-hidden transform animate-in zoom-in-95 duration-200">
                <Command label="Command Menu" className="bg-transparent" loop>

                    {/* Search Input */}
                    <div className="flex items-center border-b border-white/10 px-3" cmdk-input-wrapper="">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-white" />
                        <Command.Input
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                            placeholder="Buscar proyectos o acciones..."
                        />
                    </div>

                    {/* List */}
                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
                        <Command.Empty className="py-6 text-center text-sm text-zinc-500">
                            No se encontraron resultados.
                        </Command.Empty>

                        <Command.Group heading="Navegación" className="px-2 py-1.5 text-xs font-medium text-zinc-500">
                            <Command.Item
                                onSelect={() => runCommand(() => router.push('/'))}
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-zinc-200 outline-none hover:bg-white/10 aria-selected:bg-white/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                            >
                                <Layout className="mr-2 h-4 w-4 text-zinc-400" />
                                <span>Editor Semanal</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => runCommand(() => window.location.href = '/?view=dashboard')}
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-zinc-200 outline-none hover:bg-white/10 aria-selected:bg-white/10"
                            >
                                <Layout className="mr-2 h-4 w-4 text-zinc-400" />
                                <span>Dashboard</span>
                            </Command.Item>
                        </Command.Group>

                        <Command.Separator className="my-1 h-px bg-white/5" />

                        <Command.Group heading="Proyectos" className="px-2 py-1.5 text-xs font-medium text-zinc-500">
                            {visibleProjects.map((project) => (
                                <Command.Item
                                    key={project.id}
                                    onSelect={() => runCommand(() => {
                                        // Use Custom Event for instant client-side switch without reload
                                        const event = new CustomEvent('switch-project', {
                                            detail: {
                                                id: project.id,
                                                name: project.name,
                                                code: project.code,
                                                color: project.color
                                            }
                                        });
                                        window.dispatchEvent(event);
                                    })}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-zinc-200 outline-none hover:bg-white/10 aria-selected:bg-white/10"
                                >
                                    <FolderGit2
                                        className="mr-2 h-4 w-4"
                                        style={{ color: project.color || "#ccc" }}
                                    />
                                    <span>{project.name}</span>
                                    <span className="ml-auto text-xs text-zinc-600">{project.code}</span>
                                </Command.Item>
                            ))}
                        </Command.Group>

                        <Command.Separator className="my-1 h-px bg-white/5" />

                        <Command.Group heading="Acciones" className="px-2 py-1.5 text-xs font-medium text-zinc-500">
                            {(userRole === 'app_admin' || userRole === 'global_pm') && (
                                <Command.Item
                                    onSelect={() => runCommand(() => alert("Crear Proyecto (TODO)"))}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-zinc-200 outline-none hover:bg-white/10 aria-selected:bg-white/10"
                                >
                                    <FolderPlus className="mr-2 h-4 w-4 text-green-500" />
                                    <span>Crear Nuevo Proyecto</span>
                                </Command.Item>
                            )}
                            <Command.Item
                                onSelect={() => runCommand(() => window.location.reload())}
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-zinc-200 outline-none hover:bg-white/10 aria-selected:bg-white/10"
                            >
                                <Home className="mr-2 h-4 w-4 text-zinc-400" />
                                <span>Recargar Aplicación</span>
                            </Command.Item>
                        </Command.Group>

                    </Command.List>
                </Command>
            </div>
        </div>
    );
}
