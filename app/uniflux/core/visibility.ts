/**
 * UNIFLUX COMPUTED VISIBILITY
 *
 * Pure functions to determine node/edge visibility for semantic zoom.
 * Keeps the workspace free of ad-hoc opacity logic.
 *
 * Visibility tiers:
 *   'full'   — node is primary in the current view level
 *   'dimmed' — node exists but is out of focus (lower opacity, non-interactive)
 *   'hidden' — node should not appear at all (future use)
 */

import { FlowNode, FlowEdge } from './types';

export type VisibilityTier = 'full' | 'dimmed' | 'hidden';

export const OPACITY: Record<VisibilityTier, number> = {
    full:   1,
    dimmed: 0.12,
    hidden: 0,
};

// Natural C4 level per node type (nodes without a natural level default to 'full' always)
const C4_NATURAL_LEVEL: Record<string, number> = {
    C4_PERSON:          1,
    C4_SYSTEM:          1,
    C4_SYSTEM_EXT:      1,
    C4_CONTAINER_WEB:   2,
    C4_CONTAINER_API:   2,
    C4_CONTAINER_DB:    2,
    C4_CONTAINER_QUEUE: 2,
    C4_COMPONENT:       3,
    C4_BOUNDARY:        1,   // boundaries always visible as context
};

/**
 * Returns the visibility tier of a node given the current view level.
 * Non-C4 nodes are always 'full'.
 */
export function getNodeVisibility(node: FlowNode, viewLevel: number): VisibilityTier {
    const naturalLevel = node.c4Level ?? C4_NATURAL_LEVEL[node.type];
    if (naturalLevel === undefined) return 'full'; // non-C4 node
    if (node.type === 'C4_BOUNDARY') return 'full'; // boundaries always show
    return naturalLevel <= viewLevel ? 'full' : 'dimmed';
}

/**
 * Returns true if the node is interactive (draggable, selectable) at this level.
 * Dimmed nodes should not be accidentally moved.
 */
export function isNodeInteractive(node: FlowNode, viewLevel: number): boolean {
    return getNodeVisibility(node, viewLevel) === 'full' && !node.isLocked;
}

/**
 * Returns true if the node should be included in the React Flow node array.
 * Currently: 'hidden' nodes are excluded; 'dimmed' nodes render at low opacity.
 * This avoids creating React Flow nodes for entities that have no visual presence,
 * improving render performance for large diagrams.
 */
export function shouldRender(node: FlowNode, viewLevel: number): boolean {
    return getNodeVisibility(node, viewLevel) !== 'hidden';
}

/**
 * Splits nodes into three buckets: visible, dimmed, hidden.
 * Useful for export, layout, and AI context.
 */
export function partitionNodes(nodes: FlowNode[], viewLevel: number): {
    visible: FlowNode[];
    dimmed: FlowNode[];
    hidden: FlowNode[];
} {
    const visible: FlowNode[] = [];
    const dimmed: FlowNode[] = [];
    const hidden: FlowNode[] = [];

    for (const node of nodes) {
        const tier = getNodeVisibility(node, viewLevel);
        if (tier === 'full')   visible.push(node);
        if (tier === 'dimmed') dimmed.push(node);
        if (tier === 'hidden') hidden.push(node);
    }

    return { visible, dimmed, hidden };
}

/**
 * An edge is visible only when BOTH endpoints are fully visible.
 * When one endpoint is dimmed, the edge is also dimmed.
 */
export function getEdgeVisibility(
    edge: FlowEdge,
    nodeMap: Map<string, FlowNode>,
    viewLevel: number,
): VisibilityTier {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) return 'hidden';

    const srcVis = getNodeVisibility(src, viewLevel);
    const tgtVis = getNodeVisibility(tgt, viewLevel);

    if (srcVis === 'hidden' || tgtVis === 'hidden') return 'hidden';
    if (srcVis === 'dimmed' || tgtVis === 'dimmed') return 'dimmed';
    return 'full';
}

/**
 * Builds a node map for efficient edge visibility lookups.
 */
export function buildNodeMap(nodes: FlowNode[]): Map<string, FlowNode> {
    return new Map(nodes.map(n => [n.id, n]));
}

/**
 * Returns the subset of nodes/edges that should be passed to AI generation
 * (only fully visible nodes — don't confuse the model with dimmed context).
 */
export function getAIVisibleGraph(
    nodes: FlowNode[],
    edges: FlowEdge[],
    viewLevel: number,
): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const { visible } = partitionNodes(nodes, viewLevel);
    const visibleIds = new Set(visible.map(n => n.id));
    return {
        nodes: visible,
        edges: edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target)),
    };
}
