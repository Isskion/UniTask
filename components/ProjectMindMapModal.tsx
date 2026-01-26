"use client";

import { useState, useEffect, useMemo, useRef } from "react";
// import { Dialog, DialogContent } from "./ui/Dialog"; // Removed unused
import { Task, Project } from "@/types";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Search, ZoomIn, ZoomOut, Maximize, AlertTriangle, Box, Layers, CheckSquare, FileText, CheckCircle, ChevronRight, ChevronDown, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { getProgressSafe } from "@/lib/data-migration";
import { DataIntegratorModal } from "./DataIntegratorModal";

/**
 * ProjectMindMapModal
 * 
 * A full-screen, interactive "Mind Map" / Dependency Tree view for a project.
 * Allows searching for tasks (which auto-expands the tree to find them).
 */

interface Props {
    project: Project;
    onClose: () => void;
    initialTaskId?: string; // If we want to deep link to a task
}

interface TreeNode {
    task: Task;
    children: TreeNode[];
    level: number;
}

export function ProjectMindMapModal({ project, onClose, initialTaskId }: Props) {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId || null);
    const [showDataIntegrator, setShowDataIntegrator] = useState(false);

    // Zoom/Pan State (Simple CSS Scale)
    const [scale, setScale] = useState(1);

    const containerRef = useRef<HTMLDivElement>(null);

    // Load Tasks
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Fetch all tasks for this project to build the full tree
                const q = query(
                    collection(db, "tasks"),
                    where("projectId", "==", project.id),
                    // order by order field?
                );
                const snap = await getDocs(q);
                const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
                // Sort by V13 order logic if present, else safe fallback
                loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
                setTasks(loaded);
            } catch (e) {
                console.error("Error loading mind map tasks", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [project.id]);

    // Build Tree
    const tree = useMemo(() => {
        const nodeMap = new Map<string, TreeNode>();
        const roots: TreeNode[] = [];

        // Init
        tasks.forEach(t => nodeMap.set(t.id, { task: t, children: [], level: 0 }));

        // Link
        tasks.forEach(t => {
            const node = nodeMap.get(t.id)!;
            if (t.parentId && nodeMap.has(t.parentId)) {
                nodeMap.get(t.parentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        // Set Levels
        const setLevel = (nodes: TreeNode[], lvl: number) => {
            nodes.forEach(n => {
                n.level = lvl;
                setLevel(n.children, lvl + 1);
            });
        };
        setLevel(roots, 0);

        // Sort Roots & Children by Order
        const sortNodes = (nodes: TreeNode[]) => {
            nodes.sort((a, b) => (a.task.order || 0) - (b.task.order || 0));
            nodes.forEach(n => sortNodes(n.children));
        };
        sortNodes(roots);

        return roots;
    }, [tasks]);

    // Search & Auto Expand logic
    const handleSearch = () => {
        if (!searchQuery.trim()) return;

        const term = searchQuery.toLowerCase();
        const found = tasks.find(t =>
            t.title.toLowerCase().includes(term) ||
            (t.friendlyId && t.friendlyId.toLowerCase().includes(term))
        );

        if (found) {
            setSelectedTaskId(found.id);
            // Expand all ancestors
            const toExpand: Record<string, boolean> = {};

            let current = found;
            while (current.parentId) {
                toExpand[current.parentId] = true;
                const parent = tasks.find(t => t.id === current.parentId);
                if (parent) current = parent;
                else break;
            }

            setExpanded(prev => ({ ...prev, ...toExpand }));

            // Scroll to element (with a slight delay to allow render)
            setTimeout(() => {
                const el = document.getElementById(`node-${found.id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    // Provide a visual flash?
                    el.classList.add('ring-4', 'ring-yellow-500');
                    setTimeout(() => el.classList.remove('ring-4', 'ring-yellow-500'), 2000);
                }
            }, 100);
        }
    };

    // --- Render Helpers ---
    const getTypeColor = (type?: string) => {
        switch (type) {
            case 'epic': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'milestone': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'root_epic': return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
            case 'subtask': return 'text-zinc-400 bg-zinc-500/5 border-zinc-500/10';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20'; // task
        }
    };

    const getTypeIcon = (type?: string) => {
        switch (type) {
            case 'epic': return <Box className="w-3.5 h-3.5" />;
            case 'milestone': return <AlertTriangle className="w-3.5 h-3.5" />;
            case 'root_epic': return <Layers className="w-3.5 h-3.5" />;
            case 'subtask': return <CheckSquare className="w-3.5 h-3.5" />;
            default: return <FileText className="w-3.5 h-3.5" />;
        }
    };

    const renderNode = (node: TreeNode) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expanded[node.task.id] !== false; // Default Open?
        const progress = getProgressSafe(node.task);

        return (
            <div key={node.task.id} id={`node-${node.task.id}`} className="flex flex-col relative items-start pl-8 transition-all">
                {/* Horizontal Connector Line to Self */}
                <div className="absolute top-4 left-0 w-8 h-[2px] bg-zinc-700/50 -translate-y-1/2" />

                {/* Vertical Connector Line from Parent (Covering height) */}
                <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-zinc-700/50 -translate-x-1/2" />

                <div className="relative group">
                    <div
                        onClick={() => setSelectedTaskId(node.task.id)}
                        className={cn(
                            "flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer min-w-[280px] bg-card/80 backdrop-blur-sm",
                            selectedTaskId === node.task.id
                                ? "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] bg-indigo-950/30"
                                : "border-white/5 hover:border-white/10 hover:bg-white/5"
                        )}
                    >
                        {/* Expand Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [node.task.id]: !isExpanded })); }}
                            className={cn(
                                "p-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors border border-white/5",
                                !hasChildren && "opacity-0 pointer-events-none"
                            )}
                        >
                            {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-400" /> : <ChevronRight className="w-3 h-3 text-zinc-400" />}
                        </button>

                        <div className={cn("p-1.5 rounded-lg border", getTypeColor(node.task.type))}>
                            {getTypeIcon(node.task.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className={cn("text-xs font-bold truncate", selectedTaskId === node.task.id ? "text-white" : "text-zinc-300")}>
                                {node.task.title || "Sin título"}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-zinc-500">{node.task.friendlyId}</span>
                                {node.task.status === 'completed' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                            </div>
                        </div>

                        {/* Progress */}
                        {progress.actual > 0 && (
                            <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden shrink-0 ml-2">
                                <div className={cn("h-full transition-all", progress.actual >= 100 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${progress.actual}%` }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="flex flex-col relative border-l border-transparent ml-4">
                        {/* We hide the default border because we draw custom lines */}
                        {node.children.map(child => renderNode(child))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
            {/* Toolbar */}
            <div className={cn("h-16 border-b flex items-center justify-between px-6 shrink-0 z-10", isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-white/10")}>
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <Box className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className={cn("font-bold text-lg", isLight ? "text-zinc-900" : "text-white")}>Mapa Jerárquico: {project.name}</h2>
                        <p className={cn("text-xs", isLight ? "text-zinc-500" : "text-zinc-400")}>{tasks.length} elementos jerarquizados</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Data Integration */}
                    <button
                        onClick={() => setShowDataIntegrator(true)}
                        className="p-2 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors"
                        title="Import / Export Data"
                    >
                        <Database className="w-5 h-5" />
                    </button>

                    <div className="h-6 w-[1px] bg-zinc-700/50" />

                    {/* Search */}
                    <div className="relative group">
                        <div className={cn("flex items-center border rounded-lg overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500/50",
                            isLight ? "bg-zinc-100 border-zinc-200" : "bg-black/40 border-white/10"
                        )}>
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Buscar ID o Tarea..."
                                className="bg-transparent border-none outline-none px-3 py-1.5 text-sm w-48 lg:w-64 placeholder:text-zinc-500"
                            />
                            <button onClick={handleSearch} className="p-2 hover:bg-white/10 text-zinc-400 hover:text-white">
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="h-6 w-[1px] bg-zinc-700/50" />

                    {/* Zoom Controls */}
                    <div className="flex bg-black/20 rounded-lg p-1 border border-white/5">
                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-white/10 rounded"><ZoomOut className="w-4 h-4 text-zinc-400" /></button>
                        <span className="w-12 text-center text-xs text-zinc-500 flex items-center justify-center font-mono">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1.5 hover:bg-white/10 rounded"><ZoomIn className="w-4 h-4 text-zinc-400" /></button>
                    </div>

                    <div className="h-6 w-[1px] bg-zinc-700/50" />

                    <button onClick={onClose} className="p-2 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto bg-[url('/grid.svg')] bg-fixed relative cursor-grab active:cursor-grabbing" ref={containerRef}>
                <div
                    className="min-w-fit min-h-fit p-20 origin-top-left transition-transform duration-200 ease-out"
                    style={{ transform: `scale(${scale})` }}
                >
                    {loading ? (
                        <div className="flex items-center gap-3 text-zinc-500">
                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            Cargando estructura...
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {tree.map(root => (
                                <div key={root.task.id} className="relative">
                                    {/* Root Node has special visual? */}
                                    {renderNode(root)}
                                </div>
                            ))}
                            {tree.length === 0 && (
                                <div className="text-zinc-500 italic">Este proyecto está vacío. Crea tareas para verlas aquí.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {showDataIntegrator && (
                <DataIntegratorModal
                    onClose={() => setShowDataIntegrator(false)}
                    projectId={project.id}
                    tenantId={project.tenantId}
                />
            )}
        </div>
    );
}
