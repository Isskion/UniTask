/**
 * mermaidToVisual.ts
 * Converts Mermaid DSL (sequence / flowchart) to Uniflux visual FlowNode[] + FlowEdge[]
 */

import type { FlowNode, FlowEdge, NodeType } from './types';

export interface ConversionResult {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

// ─────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────
export function parseMermaidToVisual(code: string): ConversionResult {
    const trimmed = code.trim();
    if (trimmed.startsWith('sequenceDiagram')) return parseSequence(trimmed);
    if (/^(flowchart|graph)\s/.test(trimmed)) return parseFlowchart(trimmed);
    return { nodes: [], edges: [] };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function cleanLabel(text: string): string {
    return text.replace(/<br\s*\/?>/gi, ' · ').replace(/\s+/g, ' ').trim();
}

function detectNodeType(label: string): NodeType {
    const lc = label.toLowerCase();
    if (/\berror\b|\bko\b|\bfallo\b|\bfail/.test(lc)) return 'ERROR';
    if (/estado|state|status|ingresado|confirmado|planif|entregado|finaliz|recogido|devoluc/.test(lc)) return 'STATE';
    return 'OPERATION';
}

// ─────────────────────────────────────────────
// SEQUENCE DIAGRAM PARSER
// Layout: main path center (x=400), alt branch left (x=160), else branch right (x=680)
// ─────────────────────────────────────────────
function parseSequence(code: string): ConversionResult {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    let nIdx = 0;
    let eIdx = 0;
    const nid = () => `sq${++nIdx}`;
    const eid = () => `se${++eIdx}`;

    const X_CENTER = 400;
    const X_LEFT   = 160;
    const X_RIGHT  = 680;
    const Y_STEP   = 130;

    // Global Y cursor
    let globalY = 80;

    // "Tails" — nodes we need to connect to the NEXT node
    let tails: string[] = [];

    // Branch stack for alt/opt/loop blocks
    interface BranchBlock {
        type: 'alt' | 'opt' | 'loop';
        decisionId: string;
        branchBaseY: number;   // Y where branches start (decision Y + Y_STEP)
        // Per-branch tracking (0 = alt/first, 1 = else/second)
        perBranch: { y: number; tails: string[] }[];
        activeBranch: number;
        loopTailBeforeBlock: string[]; // for loop: save tails before block
    }
    const stack: BranchBlock[] = [];

    // Current x based on branch depth
    function currentX(): number {
        if (stack.length === 0) return X_CENTER;
        const top = stack[stack.length - 1];
        if (top.type === 'loop') return X_CENTER;
        return top.activeBranch === 0 ? X_LEFT : X_RIGHT;
    }

    // Current Y based on branch depth
    function currentY(): number {
        if (stack.length === 0) return globalY;
        const top = stack[stack.length - 1];
        return top.perBranch[top.activeBranch].y;
    }

    function advanceY(amount = Y_STEP) {
        if (stack.length === 0) {
            globalY += amount;
        } else {
            const top = stack[stack.length - 1];
            top.perBranch[top.activeBranch].y += amount;
        }
    }

    function addNode(label: string, type: NodeType): string {
        const id = nid();
        const x = currentX();
        const y = currentY();
        nodes.push({ id, label, type, position: { x, y } });
        advanceY();

        // Connect from current tails
        for (const t of tails) {
            edges.push({ id: eid(), source: t, target: id });
        }
        tails = [id];

        // Update branch tails if in a block
        if (stack.length > 0) {
            const top = stack[stack.length - 1];
            top.perBranch[top.activeBranch].tails = [id];
        }

        return id;
    }

    // ── START node ──
    const startId = nid();
    nodes.push({ id: startId, label: 'Inicio', type: 'START', position: { x: X_CENTER, y: globalY } });
    tails = [startId];
    globalY += Y_STEP;

    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

    for (const line of lines) {
        if (line === 'sequenceDiagram') continue;
        if (/^(participant|actor|activate|deactivate)\s/.test(line)) continue;

        // ── alt / opt ──
        const altMatch = line.match(/^(alt|opt)\s*(.*)/);
        if (altMatch) {
            const [, blockType, rawCond] = altMatch;
            const condition = rawCond.trim() || (blockType === 'opt' ? 'Opcional' : 'Decisión');
            const decId = nid();
            const decY = stack.length === 0 ? globalY : stack[stack.length - 1].perBranch[stack[stack.length - 1].activeBranch].y;
            nodes.push({ id: decId, label: condition, type: 'DECISION', position: { x: X_CENTER, y: decY } });
            for (const t of tails) edges.push({ id: eid(), source: t, target: decId });
            tails = [];

            if (stack.length === 0) globalY += Y_STEP;
            else {
                const top = stack[stack.length - 1];
                top.perBranch[top.activeBranch].y += Y_STEP;
            }

            const branchBaseY = stack.length === 0 ? globalY : stack[stack.length - 1].perBranch[stack[stack.length - 1].activeBranch].y;

            stack.push({
                type: blockType as 'alt' | 'opt',
                decisionId: decId,
                branchBaseY,
                perBranch: [
                    { y: branchBaseY, tails: [decId] },
                    { y: branchBaseY, tails: [decId] },
                ],
                activeBranch: 0,
                loopTailBeforeBlock: [],
            });
            tails = [decId];
            continue;
        }

        // ── loop ──
        const loopMatch = line.match(/^loop\s*(.*)/);
        if (loopMatch) {
            const label = loopMatch[1].trim() || 'Repetición';
            const loopId = addNode(`↺ ${label}`, 'OPERATION');
            const loopBaseY = stack.length === 0 ? globalY : stack[stack.length - 1].perBranch[stack[stack.length - 1].activeBranch].y;
            stack.push({
                type: 'loop',
                decisionId: loopId,
                branchBaseY: loopBaseY,
                perBranch: [{ y: loopBaseY, tails: [loopId] }],
                activeBranch: 0,
                loopTailBeforeBlock: [loopId],
            });
            continue;
        }

        // ── else ──
        if (/^else(\s|$)/.test(line)) {
            if (stack.length > 0) {
                const top = stack[stack.length - 1];
                // Save current branch tails
                top.perBranch[top.activeBranch].tails = [...tails];
                // Switch to branch 1
                top.activeBranch = 1;
                tails = [top.decisionId];
            }
            continue;
        }

        // ── end ──
        if (line === 'end') {
            if (stack.length > 0) {
                const block = stack.pop()!;
                // Save current branch tails
                block.perBranch[block.activeBranch].tails = [...tails];

                // Collect all branch end tails as next tails
                const allTails = block.perBranch.flatMap(b => b.tails).filter(Boolean);
                tails = [...new Set(allTails)];

                // Advance globalY (or parent branch Y) to max of all branches
                const maxBranchY = Math.max(...block.perBranch.map(b => b.y));
                if (stack.length === 0) {
                    globalY = maxBranchY;
                } else {
                    const parent = stack[stack.length - 1];
                    parent.perBranch[parent.activeBranch].y = maxBranchY;
                }
            }
            continue;
        }

        // ── Note ──
        const noteMatch = line.match(/^Note\s+[^:]+:\s*(.+)/i);
        if (noteMatch) {
            addNode(cleanLabel(noteMatch[1]), 'OPERATION');
            continue;
        }

        // ── Message arrow ──
        const msgMatch = line.match(/^[^-:>]+\s*(?:-->>|->>|-->|->)\s*[^:]+\s*:\s*(.+)/);
        if (msgMatch) {
            const label = cleanLabel(msgMatch[1]);
            addNode(label, detectNodeType(label));
        }
    }

    // ── TERMINAL node ──
    const termY = stack.length === 0 ? globalY : stack[stack.length - 1].perBranch[stack[stack.length - 1].activeBranch].y;
    const termId = nid();
    nodes.push({ id: termId, label: 'Fin', type: 'TERMINAL', position: { x: X_CENTER, y: termY } });
    for (const t of tails) edges.push({ id: eid(), source: t, target: termId });

    return { nodes, edges };
}

// ─────────────────────────────────────────────
// FLOWCHART PARSER
// Parses Mermaid flowchart/graph syntax and positions nodes by BFS level
// ─────────────────────────────────────────────
function parseFlowchart(code: string): ConversionResult {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    let eIdx = 0;
    const eid = () => `fe${++eIdx}`;

    // Temporary parsed data
    const nodeMap = new Map<string, { label: string; type: NodeType }>();
    const edgeList: { from: string; to: string; label?: string }[] = [];

    const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

    // Patterns for Mermaid node shapes
    const nodePatterns: [RegExp, NodeType][] = [
        [/^(\w[\w\s-]*)\(\[(.+?)\]\)/, 'START'],          // ([label])  stadium/pill
        [/^(\w[\w\s-]*)\[\[(.+?)\]\]/, 'TASK'],            // [[label]]  subprocess
        [/^(\w[\w\s-]*)\{(.+?)\}/, 'DECISION'],            // {label}    decision
        [/^(\w[\w\s-]*)\((.+?)\)/, 'OPERATION'],           // (label)    rounded
        [/^(\w[\w\s-]*)\[(.+?)\]/, 'OPERATION'],           // [label]    rect
        [/^(\w[\w\s-]*)>(.+?)\]/, 'STATE'],                // >label]    asymmetric
    ];

    function parseNodeDef(part: string): { id: string; label: string; type: NodeType } | null {
        part = part.trim();
        for (const [rx, type] of nodePatterns) {
            const m = part.match(rx);
            if (m) return { id: m[1].trim(), label: cleanLabel(m[2]), type };
        }
        // Plain id (no shape)
        const plain = part.match(/^(\w[\w\s-]*)$/);
        if (plain) return { id: plain[1].trim(), label: plain[1].trim(), type: 'OPERATION' };
        return null;
    }

    const EDGE_RX = /(-->>?|->|===|==|-.->)(\|([^|]+)\|)?/;

    for (const line of lines) {
        // Skip diagram declaration and subgraph wrappers
        if (/^(flowchart|graph)\s/.test(line)) continue;
        if (/^(subgraph|end|style|classDef|class)\s/.test(line) || line === 'end') continue;

        // Try to parse as edge line: NodeA --> NodeB or NodeA -->|label| NodeB
        const edgeMatch = line.match(/^(.+?)\s*(-->>?|->|===|==|-.->)(\|([^|]+)\|)?\s*(.+)$/);
        if (edgeMatch) {
            const [, leftPart, , , edgeLabel, rightPart] = edgeMatch;

            const left = parseNodeDef(leftPart.trim());
            const right = parseNodeDef(rightPart.trim());

            if (left) nodeMap.set(left.id, { label: left.label, type: left.type });
            if (right) nodeMap.set(right.id, { label: right.label, type: right.type });

            if (left && right) {
                edgeList.push({ from: left.id, to: right.id, ...(edgeLabel ? { label: edgeLabel } : {}) });
            }
            continue;
        }

        // Standalone node definition
        const nodeDef = parseNodeDef(line);
        if (nodeDef) {
            nodeMap.set(nodeDef.id, { label: nodeDef.label, type: nodeDef.type });
        }
    }

    // ── BFS layout ──
    // Find root nodes (no incoming edges)
    const hasIncoming = new Set(edgeList.map(e => e.to));
    const roots = [...nodeMap.keys()].filter(id => !hasIncoming.has(id));
    if (roots.length === 0 && nodeMap.size > 0) roots.push(nodeMap.keys().next().value!);

    // Assign levels via BFS
    const levelMap = new Map<string, number>();
    const queue = roots.map(r => ({ id: r, level: 0 }));
    while (queue.length > 0) {
        const { id, level } = queue.shift()!;
        if (levelMap.has(id) && levelMap.get(id)! <= level) continue;
        levelMap.set(id, level);
        edgeList.filter(e => e.from === id).forEach(e => queue.push({ id: e.to, level: level + 1 }));
    }

    // Nodes without BFS reach (disconnected)
    nodeMap.forEach((_, id) => { if (!levelMap.has(id)) levelMap.set(id, 0); });

    // Group by level, position
    const byLevel = new Map<number, string[]>();
    levelMap.forEach((lvl, id) => {
        const arr = byLevel.get(lvl) ?? [];
        arr.push(id);
        byLevel.set(lvl, arr);
    });

    const X_SPACING = 220;
    const Y_SPACING = 140;
    const Y_START = 80;

    byLevel.forEach((ids, level) => {
        const totalW = (ids.length - 1) * X_SPACING;
        ids.forEach((id, i) => {
            const info = nodeMap.get(id)!;
            const x = 400 - totalW / 2 + i * X_SPACING;
            const y = Y_START + level * Y_SPACING;

            // Heuristic: first node at level 0 with no def shape → START
            let type = info.type;
            if (level === 0 && roots.includes(id) && type === 'OPERATION') type = 'START';

            nodes.push({ id, label: info.label, type, position: { x, y } });
        });
    });

    // Build edges
    edgeList.forEach(e => {
        if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
            edges.push({ id: eid(), source: e.from, target: e.to, ...(e.label ? { label: e.label } : {}) });
        }
    });

    return { nodes, edges };
}
