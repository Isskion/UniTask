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
    const [open, setOpen] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
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
            getActiveProjects().then(setProjects);
        }
    }, [open]);

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
                            {projects.map((project) => (
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
                            <Command.Item
                                onSelect={() => runCommand(() => alert("Crear Proyecto (TODO)"))}
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-zinc-200 outline-none hover:bg-white/10 aria-selected:bg-white/10"
                            >
                                <FolderPlus className="mr-2 h-4 w-4 text-green-500" />
                                <span>Crear Nuevo Proyecto</span>
                            </Command.Item>
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
