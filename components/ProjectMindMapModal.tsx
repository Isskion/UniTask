"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Task, Project } from "@/types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X, Search, ZoomIn, ZoomOut, AlertTriangle, Box, Layers, CheckSquare, FileText, CheckCircle, ChevronRight, ChevronDown, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { getProgressSafe } from "@/lib/data-migration";
import { ImportMappingModal } from "./ImportMappingModal";
import { DataIntegratorModal } from "./DataIntegratorModal";
import { ProjectPlanNode } from "@/lib/project-import";
import { LinkTaskModal } from "./LinkTaskModal";
import { useAuth } from "@/context/AuthContext";

interface Props {
    project: Project;
    onClose: () => void;
    initialTaskId?: string;
}

interface TreeNode {
    id: string;
    isPlanNode: boolean;
    task?: Task;
    plan?: ProjectPlanNode;
    title: string;
    children: TreeNode[];
    level: number;
    order: number;
    wbs?: string;
}

export function ProjectMindMapModal({ project, onClose, initialTaskId }: Props) {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { userRole, tenantId } = useAuth();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [planNodes, setPlanNodes] = useState<ProjectPlanNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId || null);
    const [showDataIntegrator, setShowDataIntegrator] = useState(false);
    const [linkingPlanNode, setLinkingPlanNode] = useState<ProjectPlanNode | null>(null);

    // Mapping State
    const [importHeaders, setImportHeaders] = useState<string[]>([]);
    const [importFile, setImportFile] = useState<File | null>(null);

    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    // ... (rest of the component state and hooks remain unchanged) ...
    // Note: To avoid sending an extremely large replacement string, I will replace only the relevant parts.

    useEffect(() => {
        // [FIX] Guard against premature firing before auth context resolves
        if (!tenantId && userRole !== 'superadmin') return;

        const load = async () => {
            setLoading(true);
            try {
                // Use the authenticated user's tenantId to satisfy Firestore rules
                const userTenantId = (userRole === 'superadmin' && project.tenantId) ? project.tenantId : tenantId;
                const tenantQueryPart = userTenantId ? [where("tenantId", "==", userTenantId)] : [];

                const qT = query(collection(db, "tasks"), where("projectId", "==", project.id), ...tenantQueryPart);
                const snapT = await getDocs(qT);
                const loadedT = snapT.docs.map(d => ({ id: d.id, ...d.data() } as Task));
                loadedT.sort((a, b) => (a.order || 0) - (b.order || 0));
                setTasks(loadedT);

                const qP = query(collection(db, "project_hierarchy"), where("projectId", "==", project.id), ...tenantQueryPart);
                const snapP = await getDocs(qP);
                const loadedP = snapP.docs.map(d => ({ id: d.id, ...d.data() } as ProjectPlanNode));
                setPlanNodes(loadedP);
            } catch (e) {
                console.error("Error loading mind map tasks", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [project.id, tenantId, userRole]);

    const tree = useMemo(() => {
        const nodeMap = new Map<string, TreeNode>();
        const roots: TreeNode[] = [];

        if (planNodes.length > 0) {
            planNodes.forEach(p => {
                nodeMap.set('plan_' + p.id, {
                    id: 'plan_' + p.id,
                    isPlanNode: true,
                    plan: p,
                    title: p.title,
                    children: [],
                    level: 0,
                    order: 0,
                    wbs: p.id
                });
            });

            planNodes.forEach(p => {
                const node = nodeMap.get('plan_' + p.id)!;
                if (p.parentId && nodeMap.has('plan_' + p.parentId)) {
                    nodeMap.get('plan_' + p.parentId)!.children.push(node);
                } else {
                    roots.push(node);
                }
            });

            tasks.forEach(t => {
                const tNode: TreeNode = {
                    id: 'task_' + t.id,
                    isPlanNode: false,
                    task: t,
                    title: t.title,
                    children: [],
                    level: 0,
                    order: t.order || 0
                };
                if (t.planId && nodeMap.has('plan_' + t.planId)) {
                    nodeMap.get('plan_' + t.planId)!.children.push(tNode);
                } else if (t.parentId && nodeMap.has('task_' + t.parentId)) {
                    nodeMap.get('task_' + t.parentId)!.children.push(tNode);
                } else {
                    roots.push(tNode);
                }
                nodeMap.set('task_' + t.id, tNode);
            });

        } else {
            tasks.forEach(t => {
                nodeMap.set('task_' + t.id, {
                    id: 'task_' + t.id,
                    isPlanNode: false,
                    task: t,
                    title: t.title,
                    children: [],
                    level: 0,
                    order: t.order || 0
                });
            });

            tasks.forEach(t => {
                const node = nodeMap.get('task_' + t.id)!;
                if (t.parentId && nodeMap.has('task_' + t.parentId)) {
                    nodeMap.get('task_' + t.parentId)!.children.push(node);
                } else {
                    roots.push(node);
                }
            });
        }

        const setLevel = (nodes: TreeNode[], lvl: number) => {
            nodes.forEach(n => {
                n.level = lvl;
                setLevel(n.children, lvl + 1);
            });
        };
        setLevel(roots, 0);

        const sortNodes = (nodes: TreeNode[]) => {
            nodes.sort((a, b) => {
                if (a.isPlanNode && b.isPlanNode) {
                    return a.plan!.id.localeCompare(b.plan!.id, undefined, { numeric: true });
                }
                return (a.order || 0) - (b.order || 0);
            });
            nodes.forEach(n => sortNodes(n.children));
        };
        sortNodes(roots);

        return roots;
    }, [tasks, planNodes]);

    const handleSearch = () => {
        if (!searchQuery.trim()) return;

        const term = searchQuery.toLowerCase();

        const foundTask = tasks.find(t =>
            t.title.toLowerCase().includes(term) ||
            (t.friendlyId && t.friendlyId.toLowerCase().includes(term))
        );
        const foundPlan = planNodes.find(p => p.title.toLowerCase().includes(term) || p.id.toLowerCase().includes(term));
        const foundId = foundTask ? 'task_' + foundTask.id : foundPlan ? 'plan_' + foundPlan.id : null;

        if (foundId) {
            setSelectedTaskId(foundId);
            setTimeout(() => {
                const el = document.getElementById(`node-${foundId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    el.classList.add('ring-4', 'ring-yellow-500');
                    setTimeout(() => el.classList.remove('ring-4', 'ring-yellow-500'), 2000);
                }
            }, 100);
        }
    };

    const getTypeColor = (node: TreeNode) => {
        if (node.isPlanNode) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        const type = node.task?.type;
        switch (type) {
            case 'epic': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'milestone': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'root_epic': return 'text-pink-400 bg-pink-500/10 border-pink-500/20';
            case 'subtask': return 'text-zinc-400 bg-zinc-500/5 border-zinc-500/10';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    };

    const getTypeIcon = (node: TreeNode) => {
        if (node.isPlanNode) return <Database className="w-3.5 h-3.5" />;
        const type = node.task?.type;
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
        const isExpanded = expanded[node.id] !== false;
        const progress = node.isPlanNode ? { actual: node.plan?.percentComplete || 0 } : getProgressSafe(node.task || {} as any);

        return (
            <div key={node.id} id={`node-${node.id}`} className="flex flex-col relative items-start pl-8 transition-all">
                <div className="absolute top-4 left-0 w-8 h-[2px] bg-zinc-700/50 -translate-y-1/2" />
                <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-zinc-700/50 -translate-x-1/2" />

                <div className="relative group">
                    <div
                        onClick={() => setSelectedTaskId(node.id)}
                        className={cn(
                            "flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer min-w-[280px] bg-card/80 backdrop-blur-sm",
                            selectedTaskId === node.id
                                ? "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] bg-indigo-950/30"
                                : "border-white/5 hover:border-white/10 hover:bg-white/5"
                        )}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setExpanded(prev => ({ ...prev, [node.id]: !isExpanded })); }}
                            className={cn(
                                "p-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors border border-white/5",
                                !hasChildren && "opacity-0 pointer-events-none"
                            )}
                        >
                            {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-400" /> : <ChevronRight className="w-3 h-3 text-zinc-400" />}
                        </button>

                        <div className={cn("p-1.5 rounded-lg border", getTypeColor(node))}>
                            {getTypeIcon(node)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className={cn("text-xs font-bold truncate", selectedTaskId === node.id ? "text-white" : "text-zinc-300")}>
                                {node.title || "Sin título"}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                {node.isPlanNode ? (
                                    <span className="text-[10px] font-mono text-emerald-500">MS Plan: WBS {node.plan?.id} {node.plan?.durationText && `| ${node.plan.durationText}`}</span>
                                ) : (
                                    <>
                                        <span className="text-[10px] font-mono text-zinc-500">{node.task?.friendlyId}</span>
                                        {node.task?.status === 'completed' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                    </>
                                )}
                            </div>
                        </div>

                        {selectedTaskId === node.id && node.isPlanNode && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setLinkingPlanNode(node.plan!); }}
                                className="px-3 py-1.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/50 rounded-lg text-xs font-semibold mr-2 transition-all shadow-sm"
                            >
                                Vincular Tarea
                            </button>
                        )}

                        {progress.actual > 0 && (
                            <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden shrink-0 ml-2">
                                <div className={cn("h-full transition-all", progress.actual >= 100 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${progress.actual}%` }} />
                            </div>
                        )}
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="flex flex-col relative border-l border-transparent ml-4">
                        {node.children.map(child => renderNode(child))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
            <div className={cn("h-16 border-b flex items-center justify-between px-6 shrink-0 z-10", isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-white/10")}>

                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <Box className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className={cn("font-bold text-lg", isLight ? "text-zinc-900" : "text-white")}>Mapa Jerárquico: {project.name}</h2>
                        <p className={cn("text-xs", isLight ? "text-zinc-500" : "text-zinc-400")}>{tasks.length} elementos vinculados</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div>
                        <input
                            type="file"
                            accept=".xlsx"
                            id="ms-project-upload"
                            className="hidden"
                            onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                    try {
                                        const file = e.target.files[0];
                                        const { ProjectImportService } = await import('@/lib/project-import');
                                        const headers = await ProjectImportService.extractHeaders(file);
                                        setImportHeaders(headers);
                                        setImportFile(file);
                                    } catch (err: any) {
                                        alert("Error leyendo el archivo: " + err.message);
                                    }
                                    e.target.value = ''; // Reset input
                                }
                            }}
                        />
                        <label
                            htmlFor="ms-project-upload"
                            className="p-2 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold border border-emerald-500/20 bg-emerald-500/10"
                            title="Importar Cronograma (MS Project XLSX)"
                        >
                            <Database className="w-4 h-4" /> Importar Jerarquía
                        </label>
                    </div>

                    <div className="h-6 w-[1px] bg-zinc-700/50" />

                    <div>
                        <button
                            onClick={async () => {
                                const { ProjectImportService } = await import('@/lib/project-import');
                                ProjectImportService.exportToPlannerCSV(planNodes, tasks);
                            }}
                            className="p-2 hover:bg-white/10 text-blue-400 hover:text-blue-300 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-blue-500/20 bg-blue-500/10"
                            title="Exportar a Microsoft Planner (CSV)"
                        >
                            <Database className="w-4 h-4" /> Exportar a Planner
                        </button>
                    </div>

                    {(userRole === 'admin' || userRole === 'app_admin' || userRole === 'project_manager') && planNodes.length > 0 && (
                        <>
                            <div className="h-6 w-[1px] bg-zinc-700/50" />
                            <div>
                                <button
                                    onClick={async () => {
                                        if (window.confirm("¿Estás seguro de que quieres Deshacer la Importación?\nEsto eliminará el cronograma maestro y desvinculará todas las tareas de UniTask asociadas a él.")) {
                                            try {
                                                const { ProjectImportService } = await import('@/lib/project-import');
                                                const userTenantId = ((userRole as string) === 'superadmin' && project.tenantId) ? project.tenantId : tenantId;
                                                if (!userTenantId) throw new Error("Tenant ID not found");
                                                await ProjectImportService.rollbackImport(project.id, userTenantId);

                                                // Refresh local state
                                                setPlanNodes([]);
                                                setTasks(prev => prev.map(t => ({ ...t, planId: undefined })));

                                                alert("Importación deshecha correctamente.");
                                            } catch (err: any) {
                                                alert("Error al deshacer importación: " + err.message);
                                            }
                                        }
                                    }}
                                    className="p-2 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-red-500/20 bg-red-500/10"
                                    title="Deshacer Importación (Solo PMs y Admins)"
                                >
                                    <AlertTriangle className="w-4 h-4" /> Deshacer Importación
                                </button>
                            </div>
                        </>
                    )}

                    <div className="h-6 w-[1px] bg-zinc-700/50" />

                    <button
                        onClick={() => setShowDataIntegrator(true)}
                        className="p-2 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors hidden sm:block"
                        title="Import / Export Data"
                    >
                        <Database className="w-5 h-5" />
                    </button>

                    <div className="h-6 w-[1px] bg-zinc-700/50 hidden sm:block" />

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
                                <div key={root.id} className="relative">
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
            {linkingPlanNode && (
                <LinkTaskModal
                    project={project}
                    planNode={linkingPlanNode}
                    tasks={tasks}
                    onClose={() => setLinkingPlanNode(null)}
                    onLinked={(taskId) => {
                        setLinkingPlanNode(null);
                        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, planId: linkingPlanNode.id } : t));
                    }}
                />
            )}
            {importHeaders.length > 0 && importFile && (
                <ImportMappingModal
                    headers={importHeaders}
                    onCancel={() => {
                        setImportHeaders([]);
                        setImportFile(null);
                    }}
                    onConfirm={async (mapping) => {
                        try {
                            const { ProjectImportService } = await import('@/lib/project-import');
                            const nodes = await ProjectImportService.parseXlsxWithMapping(importFile, mapping, project.id);
                            await ProjectImportService.saveHierarchyToFirebase(project.id, project.tenantId || "1", nodes);
                            setPlanNodes(nodes); // Update UI
                            setImportHeaders([]);
                            setImportFile(null);
                        } catch (err: any) {
                            alert("Error importando el plan: " + err.message);
                        }
                    }}
                />
            )}
        </div>
    );
}
