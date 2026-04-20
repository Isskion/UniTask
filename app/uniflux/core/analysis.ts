/**
 * UNIFLUX GRAPH INTELLIGENCE LAYER
 *
 * Pure graph algorithms for structural analysis.
 * No React deps, no side effects — safe to call from AI prompts, exports, validators.
 *
 * All functions operate on abstract node/edge arrays, not React Flow state.
 */

import { FlowNode, FlowEdge, GraphAnalysis } from './types';

// ── Adjacency ───────────────────────────────────────────────────────────────

function buildAdjacency(nodes: FlowNode[], edges: FlowEdge[]): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n.id, new Set());
    for (const e of edges) {
        adj.get(e.source)?.add(e.target);
    }
    return adj;
}

function buildBidirectionalAdjacency(nodes: FlowNode[], edges: FlowEdge[]): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n.id, new Set());
    for (const e of edges) {
        adj.get(e.source)?.add(e.target);
        adj.get(e.target)?.add(e.source);
    }
    return adj;
}

// ── Orphan Detection ────────────────────────────────────────────────────────

/**
 * Returns nodes that have no edges at all (isolated vertices).
 * Boundaries/grouping nodes are excluded since they contain children by design.
 */
export function findOrphans(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    const EXCLUDED_TYPES = new Set(['ENVIRONMENT', 'C4_BOUNDARY']);
    const connected = new Set<string>();
    for (const e of edges) {
        connected.add(e.source);
        connected.add(e.target);
    }
    return nodes.filter(n => !connected.has(n.id) && !EXCLUDED_TYPES.has(n.type));
}

// ── Cycle Detection (DFS) ───────────────────────────────────────────────────

/**
 * Finds all cycles in a directed graph using DFS.
 * Returns arrays of node IDs forming each cycle.
 */
export function detectCycles(nodes: FlowNode[], edges: FlowEdge[]): string[][] {
    const adj = buildAdjacency(nodes, edges);
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const cycles: string[][] = [];

    function dfs(nodeId: string, path: string[]): void {
        visited.add(nodeId);
        inStack.add(nodeId);
        path.push(nodeId);

        for (const neighbor of adj.get(nodeId) ?? []) {
            if (!visited.has(neighbor)) {
                dfs(neighbor, path);
            } else if (inStack.has(neighbor)) {
                // Found a cycle — extract the cycle portion of the path
                const cycleStart = path.indexOf(neighbor);
                if (cycleStart !== -1) {
                    cycles.push(path.slice(cycleStart));
                }
            }
        }

        path.pop();
        inStack.delete(nodeId);
    }

    for (const n of nodes) {
        if (!visited.has(n.id)) {
            dfs(n.id, []);
        }
    }

    return cycles;
}

// ── Critical Path (longest path in DAG) ────────────────────────────────────

/**
 * Finds the longest paths (critical paths) in the graph.
 * Uses topological sort + dynamic programming.
 * Returns up to 3 paths (the longest ones).
 */
export function findCriticalPaths(nodes: FlowNode[], edges: FlowEdge[]): string[][] {
    if (nodes.length === 0) return [];

    const adj = buildAdjacency(nodes, edges);
    const inDegree = new Map<string, number>();

    for (const n of nodes) inDegree.set(n.id, 0);
    for (const e of edges) {
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }

    // Topological sort (Kahn's algorithm)
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
        if (deg === 0) queue.push(id);
    }

    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    for (const n of nodes) { dist.set(n.id, 0); prev.set(n.id, null); }

    const topoOrder: string[] = [];
    while (queue.length > 0) {
        const curr = queue.shift()!;
        topoOrder.push(curr);
        for (const next of adj.get(curr) ?? []) {
            const newDist = (dist.get(curr) ?? 0) + 1;
            if (newDist > (dist.get(next) ?? 0)) {
                dist.set(next, newDist);
                prev.set(next, curr);
            }
            const newDeg = (inDegree.get(next) ?? 1) - 1;
            inDegree.set(next, newDeg);
            if (newDeg === 0) queue.push(next);
        }
    }

    if (topoOrder.length === 0) return []; // cycle present — no critical path

    // Find the terminal nodes with the highest distances
    const terminals = [...dist.entries()]
        .filter(([id]) => (adj.get(id)?.size ?? 0) === 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    return terminals.map(([termId]) => {
        const path: string[] = [];
        let curr: string | null = termId;
        while (curr !== null) {
            path.unshift(curr);
            curr = prev.get(curr) ?? null;
        }
        return path;
    });
}

// ── Single Points of Failure ────────────────────────────────────────────────

/**
 * Returns nodes whose removal increases the number of connected components.
 * Uses bidirectional connectivity to detect articulation points.
 * In architecture terms: nodes that, if they fail, partition the system.
 */
export function findSinglePointsOfFailure(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
    if (nodes.length < 3) return [];

    const adj = buildBidirectionalAdjacency(nodes, edges);
    const nodeIds = nodes.map(n => n.id);

    function countComponents(excludeId: string): number {
        const visited = new Set<string>();
        let components = 0;
        for (const id of nodeIds) {
            if (id === excludeId || visited.has(id)) continue;
            components++;
            const stack = [id];
            while (stack.length > 0) {
                const curr = stack.pop()!;
                if (visited.has(curr) || curr === excludeId) continue;
                visited.add(curr);
                for (const neighbor of adj.get(curr) ?? []) {
                    if (!visited.has(neighbor) && neighbor !== excludeId) {
                        stack.push(neighbor);
                    }
                }
            }
        }
        return components;
    }

    const baseComponents = countComponents('__none__');
    return nodes.filter(n => countComponents(n.id) > baseComponents);
}

// ── Connected Components ────────────────────────────────────────────────────

/**
 * Groups nodes into connected components (ignoring edge direction).
 * Single-node groups indicate completely isolated nodes.
 */
export function findDisconnectedComponents(nodes: FlowNode[], edges: FlowEdge[]): string[][] {
    const adj = buildBidirectionalAdjacency(nodes, edges);
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const n of nodes) {
        if (visited.has(n.id)) continue;
        const component: string[] = [];
        const stack = [n.id];
        while (stack.length > 0) {
            const curr = stack.pop()!;
            if (visited.has(curr)) continue;
            visited.add(curr);
            component.push(curr);
            for (const neighbor of adj.get(curr) ?? []) {
                if (!visited.has(neighbor)) stack.push(neighbor);
            }
        }
        components.push(component);
    }

    return components;
}

// ── Graph Density ───────────────────────────────────────────────────────────

/**
 * Density = edges / (n*(n-1)) for directed graphs.
 * 0 = no connections, 1 = fully connected.
 */
export function computeDensity(nodeCount: number, edgeCount: number): number {
    if (nodeCount < 2) return 0;
    return Math.min(edgeCount / (nodeCount * (nodeCount - 1)), 1);
}

// ── Full Analysis ───────────────────────────────────────────────────────────

/**
 * Runs the complete structural analysis pipeline on a graph's nodes and edges.
 * All algorithms are O(V+E) to O(V²) — safe for diagrams up to ~200 nodes.
 */
export function analyzeGraph(nodes: FlowNode[], edges: FlowEdge[]): GraphAnalysis {
    const orphans = findOrphans(nodes, edges);
    const cycles = detectCycles(nodes, edges);
    const criticalPaths = findCriticalPaths(nodes, edges);
    const spofs = findSinglePointsOfFailure(nodes, edges);
    const components = findDisconnectedComponents(nodes, edges);
    const maxDepth = criticalPaths.reduce((max, p) => Math.max(max, p.length - 1), 0);
    const density = computeDensity(nodes.length, edges.length);

    return {
        orphanNodeIds: orphans.map(n => n.id),
        cycles,
        criticalPaths,
        singlePointsOfFailure: spofs.map(n => n.id),
        disconnectedComponents: components.filter(c => c.length > 0),
        maxDepth,
        density,
    };
}

// ── Insight Messages (human-readable summaries) ─────────────────────────────

/**
 * Converts a GraphAnalysis into actionable human-readable insights.
 * Useful for AI toolbar context or a future "Insights" panel.
 */
export function analysisToInsights(analysis: GraphAnalysis, nodeMap: Map<string, FlowNode>): string[] {
    const insights: string[] = [];

    if (analysis.orphanNodeIds.length > 0) {
        const names = analysis.orphanNodeIds
            .map(id => nodeMap.get(id)?.label ?? id)
            .join(', ');
        insights.push(`⚠ ${analysis.orphanNodeIds.length} elemento(s) sin conexiones: ${names}`);
    }

    if (analysis.cycles.length > 0) {
        insights.push(`🔄 ${analysis.cycles.length} ciclo(s) detectado(s) en el grafo`);
    }

    if (analysis.singlePointsOfFailure.length > 0) {
        const names = analysis.singlePointsOfFailure
            .map(id => nodeMap.get(id)?.label ?? id)
            .join(', ');
        insights.push(`🚨 ${analysis.singlePointsOfFailure.length} punto(s) único(s) de fallo: ${names}`);
    }

    if (analysis.disconnectedComponents.length > 1) {
        insights.push(`📦 ${analysis.disconnectedComponents.length} grupos aislados detectados`);
    }

    if (analysis.density > 0.5) {
        insights.push(`🔗 Grafo muy denso (${Math.round(analysis.density * 100)}%) — considera simplificar`);
    }

    if (analysis.maxDepth > 10) {
        insights.push(`📏 Ruta crítica muy larga (${analysis.maxDepth} pasos) — posible cuello de botella`);
    }

    if (insights.length === 0) {
        insights.push('✅ El grafo no presenta problemas estructurales detectables');
    }

    return insights;
}
