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
// SEQUENCE DIAGRAM PARSER — Swimlane layout
// Each participant gets its own X column.
// Nodes appear at the receiver's column; time flows downward (shared Y axis).
// alt/else branches offset ±120px around the decision column.
// ─────────────────────────────────────────────
function parseSequence(code: string): ConversionResult {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    let nIdx = 0;
    let eIdx = 0;
    const nid = () => `sq${++nIdx}`;
    const eid = () => `se${++eIdx}`;

    const COL_WIDTH   = 280;   // pixels between participant columns
    const Y_STEP      = 130;   // vertical gap between nodes
    const BRANCH_OFF  = 120;   // horizontal offset for alt/else branches

    // ─── Pass 1: collect participants in order of appearance ───────────────
    const participantList: string[] = [];
    const partIdx = new Map<string, number>();

    function registerPart(raw: string) {
        const n = raw.trim();
        if (!partIdx.has(n)) { partIdx.set(n, participantList.length); participantList.push(n); }
    }

    const rawLines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

    // Explicit participant/actor declarations first (preserve intended order)
    for (const line of rawLines) {
        const m = line.match(/^(?:participant|actor)\s+(.+)/);
        if (m) registerPart(m[1]);
    }
    // Auto-detect from message arrows
    for (const line of rawLines) {
        const m = line.match(/^([^-:>\n]+?)\s*(?:-->>|->>|-->|->)\s*([^:\n]+?)\s*:/);
        if (m) { registerPart(m[1]); registerPart(m[2]); }
    }
    if (participantList.length === 0) participantList.push('Sistema');

    // ─── Column X helper (centered at x=400) ───────────────────────────────
    const totalW = (participantList.length - 1) * COL_WIDTH;
    const getColX = (name: string): number => {
        const i = partIdx.get(name.trim()) ?? 0;
        return 400 - totalW / 2 + i * COL_WIDTH;
    };

    // ─── Runtime state ──────────────────────────────────────────────────────
    let globalY   = 100;           // global Y cursor
    let tails: string[] = [];      // nodes that connect to the NEXT node
    let activePart = participantList[0] ?? 'Sistema';  // currently active participant

    interface BranchBlock {
        type: 'alt' | 'opt' | 'loop';
        decisionId: string;
        decisionX: number;
        branchBaseY: number;
        perBranch: { y: number; tails: string[] }[];
        activeBranch: number;
    }
    const stack: BranchBlock[] = [];

    function currentY(): number {
        if (stack.length === 0) return globalY;
        const top = stack[stack.length - 1];
        return top.perBranch[top.activeBranch].y;
    }

    // X of the next node to place:
    // – Inside loop: always use activePart column
    // – Inside alt branch 0: decision column – BRANCH_OFF
    // – Inside alt branch 1: decision column + BRANCH_OFF
    // – Outside: activePart column
    function currentX(): number {
        if (stack.length === 0) return getColX(activePart);
        const top = stack[stack.length - 1];
        if (top.type === 'loop') return getColX(activePart);
        return top.activeBranch === 0
            ? top.decisionX - BRANCH_OFF
            : top.decisionX + BRANCH_OFF;
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
        const id  = nid();
        const x   = currentX();
        const y   = currentY();
        nodes.push({ id, label: cleanLabel(label), type, position: { x, y } });
        advanceY();
        for (const t of tails) edges.push({ id: eid(), source: t, target: id });
        tails = [id];
        if (stack.length > 0) {
            const top = stack[stack.length - 1];
            top.perBranch[top.activeBranch].tails = [id];
        }
        return id;
    }

    // ─── Participant label nodes (appear above the flow, one per column) ───
    for (const p of participantList) {
        nodes.push({
            id: `label_${partIdx.get(p)}`,
            label: p,
            type: 'STATE',
            position: { x: getColX(p), y: 0 },
        });
    }

    // ─── START node ──────────────────────────────────────────────────────────
    const startId = nid();
    nodes.push({ id: startId, label: 'Inicio', type: 'START', position: { x: 400, y: globalY } });
    tails = [startId];
    globalY += Y_STEP;

    // ─── Main line parser ────────────────────────────────────────────────────
    for (const line of rawLines) {
        if (line === 'sequenceDiagram') continue;
        if (/^(?:participant|actor|activate|deactivate)\s/.test(line)) continue;

        // ── alt / opt ──────────────────────────────────────────────────────
        const altMatch = line.match(/^(alt|opt)\s*(.*)/);
        if (altMatch) {
            const [, blockType, rawCond] = altMatch;
            const cond  = rawCond.trim() || (blockType === 'opt' ? 'Opcional' : 'Decisión');
            const decId = nid();
            const decX  = getColX(activePart);
            const y     = currentY();
            nodes.push({ id: decId, label: cond, type: 'DECISION', position: { x: decX, y } });
            for (const t of tails) edges.push({ id: eid(), source: t, target: decId });
            tails = [];
            advanceY();
            const branchBaseY = currentY();
            stack.push({
                type: blockType as 'alt' | 'opt',
                decisionId: decId,
                decisionX: decX,
                branchBaseY,
                perBranch: [
                    { y: branchBaseY, tails: [decId] },
                    { y: branchBaseY, tails: [decId] },
                ],
                activeBranch: 0,
            });
            tails = [decId];
            continue;
        }

        // ── loop ──────────────────────────────────────────────────────────
        const loopMatch = line.match(/^loop\s*(.*)/);
        if (loopMatch) {
            const label  = loopMatch[1].trim() || 'Repetición';
            const loopId = addNode(`↺ ${label}`, 'OPERATION');
            const loopBaseY = currentY();
            stack.push({
                type: 'loop',
                decisionId: loopId,
                decisionX: getColX(activePart),
                branchBaseY: loopBaseY,
                perBranch: [{ y: loopBaseY, tails: [loopId] }],
                activeBranch: 0,
            });
            continue;
        }

        // ── else ──────────────────────────────────────────────────────────
        if (/^else(\s|$)/.test(line)) {
            if (stack.length > 0) {
                const top = stack[stack.length - 1];
                top.perBranch[top.activeBranch].tails = [...tails];
                top.activeBranch = 1;
                tails = [top.decisionId];
            }
            continue;
        }

        // ── end ───────────────────────────────────────────────────────────
        if (line === 'end') {
            if (stack.length > 0) {
                const block = stack.pop()!;
                block.perBranch[block.activeBranch].tails = [...tails];
                const allTails = block.perBranch.flatMap(b => b.tails).filter(Boolean);
                tails = [...new Set(allTails)];
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

        // ── Note ──────────────────────────────────────────────────────────
        const noteMatch = line.match(/^Note\s+[^:]+:\s*(.+)/i);
        if (noteMatch) {
            addNode(cleanLabel(noteMatch[1]), 'OPERATION');
            continue;
        }

        // ── Message arrow: From -->> To : label ───────────────────────────
        const msgMatch = line.match(/^([^-:>\n]+?)\s*(?:-->>|->>|-->|->)\s*([^:\n]+?)\s*:\s*(.+)/);
        if (msgMatch) {
            const to    = msgMatch[2].trim();
            const label = cleanLabel(msgMatch[3]);
            activePart  = to;   // move active column to the receiver
            addNode(label, detectNodeType(label));
        }
    }

    // ─── TERMINAL node ────────────────────────────────────────────────────────
    const termY  = stack.length === 0 ? globalY : stack[stack.length - 1].perBranch[stack[stack.length - 1].activeBranch].y;
    const termId = nid();
    nodes.push({ id: termId, label: 'Fin', type: 'TERMINAL', position: { x: 400, y: termY } });
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

    for (const line of lines) {
        // Skip diagram declaration and subgraph wrappers
        if (/^(flowchart|graph)\s/.test(line)) continue;
        if (/^(subgraph|end|style|classDef|class)\s/.test(line) || line === 'end') continue;

        // Try to parse as edge line: NodeA --> NodeB or NodeA -->|label| NodeB
        const edgeMatch = line.match(/^(.+?)\s*(-->>?|->|===|==|-.->)(\|([^|]+)\|)?\s*(.+)$/);
        if (edgeMatch) {
            const [, leftPart, , , edgeLabel, rightPart] = edgeMatch;

            const left  = parseNodeDef(leftPart.trim());
            const right = parseNodeDef(rightPart.trim());

            if (left)  nodeMap.set(left.id,  { label: left.label,  type: left.type });
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
    const hasIncoming = new Set(edgeList.map(e => e.to));
    const roots = [...nodeMap.keys()].filter(id => !hasIncoming.has(id));
    if (roots.length === 0 && nodeMap.size > 0) roots.push(nodeMap.keys().next().value!);

    const levelMap = new Map<string, number>();
    const queue = roots.map(r => ({ id: r, level: 0 }));
    while (queue.length > 0) {
        const { id, level } = queue.shift()!;
        if (levelMap.has(id) && levelMap.get(id)! <= level) continue;
        levelMap.set(id, level);
        edgeList.filter(e => e.from === id).forEach(e => queue.push({ id: e.to, level: level + 1 }));
    }

    nodeMap.forEach((_, id) => { if (!levelMap.has(id)) levelMap.set(id, 0); });

    const byLevel = new Map<number, string[]>();
    levelMap.forEach((lvl, id) => {
        const arr = byLevel.get(lvl) ?? [];
        arr.push(id);
        byLevel.set(lvl, arr);
    });

    const X_SPACING = 220;
    const Y_SPACING = 140;
    const Y_START   = 80;

    byLevel.forEach((ids, level) => {
        const totalW = (ids.length - 1) * X_SPACING;
        ids.forEach((id, i) => {
            const info = nodeMap.get(id)!;
            const x    = 400 - totalW / 2 + i * X_SPACING;
            const y    = Y_START + level * Y_SPACING;
            let type   = info.type;
            if (level === 0 && roots.includes(id) && type === 'OPERATION') type = 'START';
            nodes.push({ id, label: info.label, type, position: { x, y } });
        });
    });

    edgeList.forEach(e => {
        if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
            edges.push({ id: eid(), source: e.from, target: e.to, ...(e.label ? { label: e.label } : {}) });
        }
    });

    return { nodes, edges };
}
