/**
 * UNIFLUX SYSTEM MODEL
 *
 * Semantic intermediate representation that decouples the logical
 * architecture from its visual FlowGraph encoding.
 *
 * Transformation pipeline (target state):
 *   User prompt → [Phase 1 AI] → SystemModel → [validate] → [Phase 2: transform] → FlowGraph
 *
 * This module provides pure converters between the two representations.
 * No React deps, no side effects.
 */

import {
    FlowGraph, FlowNode, FlowEdge,
    SystemModel, C4Actor, C4System, C4Container, C4Component, C4Relation,
    C4LevelValue,
} from './types';

// ── FlowGraph → SystemModel ─────────────────────────────────────────────────

/**
 * Extracts the semantic model from a C4 FlowGraph.
 * Non-C4 graphs return an empty model (use only for docType === 'c4').
 */
export function graphToSystemModel(graph: FlowGraph): SystemModel {
    const actors: C4Actor[] = [];
    const systems: C4System[] = [];
    const containers: C4Container[] = [];
    const components: C4Component[] = [];
    const relations: C4Relation[] = [];

    for (const n of graph.nodes) {
        switch (n.type) {
            case 'C4_PERSON':
                actors.push({
                    id: n.id,
                    name: n.label,
                    description: n.description,
                    external: n.external,
                });
                break;
            case 'C4_SYSTEM':
            case 'C4_SYSTEM_EXT':
                systems.push({
                    id: n.id,
                    name: n.label,
                    technology: n.technology,
                    description: n.description,
                    external: n.external ?? n.type === 'C4_SYSTEM_EXT',
                    boundaryId: n.parentId,
                });
                break;
            case 'C4_CONTAINER_WEB':
            case 'C4_CONTAINER_API':
            case 'C4_CONTAINER_DB':
            case 'C4_CONTAINER_QUEUE': {
                const typeMap: Record<string, C4Container['containerType']> = {
                    C4_CONTAINER_WEB: 'web',
                    C4_CONTAINER_API: 'api',
                    C4_CONTAINER_DB: 'db',
                    C4_CONTAINER_QUEUE: 'queue',
                };
                containers.push({
                    id: n.id,
                    name: n.label,
                    technology: n.technology ?? '',
                    description: n.description,
                    systemId: n.parentId,
                    containerType: typeMap[n.type],
                });
                break;
            }
            case 'C4_COMPONENT':
                components.push({
                    id: n.id,
                    name: n.label,
                    technology: n.technology,
                    description: n.description,
                    containerId: n.parentId,
                });
                break;
            default:
                break;
        }
    }

    for (const e of graph.edges) {
        relations.push({
            id: e.id,
            fromId: e.source,
            toId: e.target,
            label: e.label,
            relType: e.c4RelType,
            protocol: e.protocol,
            dataShape: e.dataShape,
            payload: e.payload,
            sla: e.sla,
        });
    }

    return { actors, systems, containers, components, relations };
}

// ── SystemModel → FlowGraph ─────────────────────────────────────────────────

const CONTAINER_TYPE_MAP: Record<C4Container['containerType'], string> = {
    web:   'C4_CONTAINER_WEB',
    api:   'C4_CONTAINER_API',
    db:    'C4_CONTAINER_DB',
    queue: 'C4_CONTAINER_QUEUE',
};

// Default positions by entity type — overridden by layout engine if present
const DEFAULT_X: Record<string, number> = {
    actor: 50,
    system: 400,
    systemExt: 900,
    container: 400,
    component: 300,
};

/**
 * Builds a FlowGraph from a SystemModel at the specified C4 view level.
 * Positions are approximate — the layout engine or user will refine them.
 */
export function systemModelToGraph(
    model: SystemModel,
    c4Level: C4LevelValue = 1,
    baseGraph?: Partial<FlowGraph>,
): FlowGraph {
    const nodes: FlowNode[] = [];
    let yOffset = 100;
    const GAP = 180;

    // Actors — always present at L1+
    for (const actor of model.actors) {
        nodes.push({
            id: actor.id,
            type: 'C4_PERSON',
            label: actor.name,
            description: actor.description,
            external: actor.external,
            c4Level: 1,
            position: { x: actor.external ? DEFAULT_X.systemExt + 100 : DEFAULT_X.actor, y: yOffset },
        });
        yOffset += GAP;
    }

    yOffset = 100;

    // Systems — L1 view
    for (const sys of model.systems) {
        nodes.push({
            id: sys.id,
            type: sys.external ? 'C4_SYSTEM_EXT' : 'C4_SYSTEM',
            label: sys.name,
            technology: sys.technology,
            description: sys.description,
            external: sys.external,
            c4Level: 1,
            parentId: sys.boundaryId,
            position: { x: sys.external ? DEFAULT_X.systemExt : DEFAULT_X.system, y: yOffset },
        });
        yOffset += GAP;
    }

    yOffset = 100;

    // Containers — L2 view
    for (const ctr of model.containers) {
        nodes.push({
            id: ctr.id,
            type: CONTAINER_TYPE_MAP[ctr.containerType] as FlowNode['type'],
            label: ctr.name,
            technology: ctr.technology,
            description: ctr.description,
            c4Level: 2,
            parentId: ctr.systemId,
            position: { x: DEFAULT_X.container, y: yOffset },
        });
        yOffset += GAP;
    }

    yOffset = 100;

    // Components — L3 view
    for (const cmp of model.components) {
        nodes.push({
            id: cmp.id,
            type: 'C4_COMPONENT',
            label: cmp.name,
            technology: cmp.technology,
            description: cmp.description,
            c4Level: 3,
            parentId: cmp.containerId,
            position: { x: DEFAULT_X.component, y: yOffset },
        });
        yOffset += GAP;
    }

    const edges: FlowEdge[] = model.relations.map(r => ({
        id: r.id,
        source: r.fromId,
        target: r.toId,
        label: r.label,
        c4RelType: r.relType,
        protocol: r.protocol,
        dataShape: r.dataShape,
        payload: r.payload,
        sla: r.sla,
    }));

    return {
        id: baseGraph?.id ?? `draft-${Date.now()}`,
        tenantId: baseGraph?.tenantId ?? '',
        projectId: baseGraph?.projectId,
        name: baseGraph?.name ?? 'Arquitectura C4',
        docType: 'c4',
        c4Level,
        schemaVersion: 4,
        nodes,
        edges,
        metadata: baseGraph?.metadata ?? {
            version: '0.1',
            authorId: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a compact text summary of the SystemModel for use in AI prompts.
 * Gives the model context about what already exists without sending the full graph.
 */
export function systemModelToPromptContext(model: SystemModel): string {
    const lines: string[] = [];

    if (model.actors.length)
        lines.push(`Actors: ${model.actors.map(a => a.name).join(', ')}`);
    if (model.systems.length)
        lines.push(`Systems: ${model.systems.map(s => `${s.name}${s.external ? ' (ext)' : ''}`).join(', ')}`);
    if (model.containers.length)
        lines.push(`Containers: ${model.containers.map(c => `${c.name} [${c.containerType}:${c.technology}]`).join(', ')}`);
    if (model.components.length)
        lines.push(`Components: ${model.components.map(c => c.name).join(', ')}`);
    if (model.relations.length)
        lines.push(`Relations: ${model.relations.length} connections`);

    return lines.join('\n');
}
