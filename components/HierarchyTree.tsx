
import React, { useMemo, useState } from 'react';
import { Task } from '@/types';
import { ChevronRight, ChevronDown, FileText, CheckCircle, Circle, AlertTriangle, Box, Layers, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProgressSafe } from '@/lib/data-migration';

interface HierarchyTreeProps {
    tasks: Task[];
    onSelectTask: (task: Task) => void;
    selectedTaskId?: string;
    projectId?: string; // Filter context
}

interface TreeNode {
    task: Task;
    children: TreeNode[];
    level: number;
}

export const HierarchyTree: React.FC<HierarchyTreeProps> = ({ tasks, onSelectTask, selectedTaskId, projectId }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const tree = useMemo(() => {
        // 1. Filter by Project (if applicable context)
        const relevantTasks = projectId ? tasks.filter(t => t.projectId === projectId) : tasks;

        // 2. Build Tree Map
        const nodeMap = new Map<string, TreeNode>();
        const roots: TreeNode[] = [];

        // Initialize nodes
        relevantTasks.forEach(t => {
            nodeMap.set(t.id, { task: t, children: [], level: 0 });
        });

        // Link Parent-Child
        relevantTasks.forEach(t => {
            const node = nodeMap.get(t.id)!;
            if (t.parentId && nodeMap.has(t.parentId)) {
                const parent = nodeMap.get(t.parentId)!;
                parent.children.push(node);
                // Sort children by order
                parent.children.sort((a, b) => (a.task.order || 0) - (b.task.order || 0));
            } else {
                roots.push(node);
            }
        });

        // Recursive level assignment (optional, for indent)
        const assignLevel = (nodes: TreeNode[], lvl: number) => {
            nodes.forEach(n => {
                n.level = lvl;
                assignLevel(n.children, lvl + 1);
            });
        };
        assignLevel(roots, 0);

        // Sort roots
        roots.sort((a, b) => (a.task.order || 0) - (b.task.order || 0));

        return roots;
    }, [tasks, projectId]);

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

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
            case 'milestone': return <AlertTriangle className="w-3.5 h-3.5" />; // Diamond shape ideally
            case 'root_epic': return <Layers className="w-3.5 h-3.5" />;
            case 'subtask': return <CheckSquare className="w-3.5 h-3.5" />;
            default: return <FileText className="w-3.5 h-3.5" />;
        }
    };

    const renderNode = (node: TreeNode, index: number, siblings: TreeNode[]) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expanded[node.task.id] !== false; // Default to expanded? Or keep default collapsed?
        const progress = getProgressSafe(node.task);

        // Auto-expand if root or filtered
        // React.useEffect(() => { if (node.level < 2) setExpanded(prev => ({...prev, [node.task.id]: true})) }, []);

        const isLast = index === siblings.length - 1;

        return (
            <div key={node.task.id} className="relative">
                {/* Node Content */}
                <div className="flex items-center group">
                    {/* Horizontal Connector (if not root) */}
                    {node.level > 0 && (
                        <div className="absolute -left-4 top-1/2 w-4 h-[1px] bg-zinc-700/50" />
                    )}

                    <div
                        onClick={() => onSelectTask(node.task)}
                        className={cn(
                            "flex items-center gap-2 py-1.5 px-3 rounded-lg cursor-pointer transition-all border min-w-[200px] hover:shadow-md",
                            selectedTaskId === node.task.id
                                ? "bg-indigo-600/20 border-indigo-500/50 text-white shadow-indigo-900/20"
                                : "bg-card hover:bg-white/5 border-transparent hover:border-white/10 text-zinc-300"
                        )}
                    >
                        {/* Expand Toggle */}
                        <button
                            onClick={(e) => hasChildren && toggleExpand(node.task.id, e)}
                            className={cn(
                                "p-0.5 rounded hover:bg-white/20 transition-colors mr-1",
                                !hasChildren ? "invisible" : isExpanded ? "text-zinc-400" : "text-zinc-500"
                            )}
                        >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>

                        {/* Type Icon Badge */}
                        <div className={cn("p-1 rounded flex items-center justify-center border", getTypeColor(node.task.type))}>
                            {getTypeIcon(node.task.type)}
                        </div>

                        {/* Title & Info */}
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className={cn("text-xs font-medium truncate", selectedTaskId === node.task.id ? "text-white" : "text-zinc-200")}>
                                {node.task.title || "Sin Título"}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] opacity-50 font-mono">{node.task.friendlyId}</span>
                                {node.task.status === 'completed' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                            </div>
                        </div>

                        {/* Progress */}
                        {progress.actual > 0 && (
                            <div className="flex flex-col items-end gap-0.5 ml-2">
                                <div className="w-10 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={cn("h-full transition-all", progress.actual >= 100 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${progress.actual}%` }} />
                                </div>
                                <span className="text-[9px] font-mono opacity-60">{Math.round(progress.actual)}%</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Vertical Connector Line for Children */}
                {hasChildren && isExpanded && (
                    <div className="relative ml-4 pl-4 border-l border-zinc-700/50 pt-2 pb-1 space-y-2">
                        {node.children.map((child, idx) => renderNode(child, idx, node.children))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-h-full overflow-y-auto custom-scrollbar p-6 bg-black/20 rounded-xl border border-white/5 min-h-[300px]">
            {/* Header / Legend */}
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Project Map</h3>
                <div className="flex gap-2 text-[9px] text-zinc-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500/50" /> Epic</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500/50" /> Task</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500/50" /> Milestone</span>
                </div>
            </div>

            {tree.length === 0 ? (
                <div className="text-center text-zinc-500 text-xs py-10 flex flex-col items-center">
                    <Circle className="w-8 h-8 mb-2 opacity-20" />
                    No hay elementos jerárquicos configurados.
                    <p className="mt-1 opacity-50">Crea tareas y asigna "Padres" para construir el mapa.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {tree.map((root, i) => renderNode(root, i, tree))}
                </div>
            )}
        </div>
    );
};
