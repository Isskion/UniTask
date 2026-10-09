/**
 * [Plan] Estado inicial de cada fila de un plan importado (docs/plan-import-design.md §2).
 *
 * Lógica pura: la usan la vista previa del asistente y la importación, con el mismo código que la
 * Cloud Function planRollup (las altas con `importId` no disparan la función, así que el lote
 * tiene que llegar ya coherente):
 * - Hojas e hitos individuales al 100 % en el Excel → `completed` (Aprobación Final); el resto `pending`.
 * - Controles (gates) → cerrados si su bloque de hermanos anteriores lo está.
 * - Nodos con hijos → agregado de sus hijos.
 */
import { aggregateChildren, gateStatus, type PlanNodeLike } from '@/functions/src/planRollupCore';
import { isCompletedInExcel, type ParsedPlan, type PlanNode } from './planParser';

/** Orden entre hermanos (1000, 2000…), el mismo que se guarda en `order`. */
export function siblingOrder(plan: ParsedPlan): Map<string, number> {
    const byKey = new Map(plan.nodes.map((n) => [n.key, n]));
    const order = new Map<string, number>();
    for (const n of plan.nodes) {
        const siblings = n.parentKey ? byKey.get(n.parentKey)!.children : plan.roots;
        order.set(n.key, (siblings.indexOf(n) + 1) * 1000);
    }
    return order;
}

export function computeInitialStates(plan: ParsedPlan): Map<string, PlanNodeLike> {
    const order = siblingOrder(plan);
    const likeOf = new Map<string, PlanNodeLike>();

    const closeGates = (children: PlanNode[]) => {
        const likes = children.map((c) => likeOf.get(c.key)!);
        for (const g of likes.filter((l) => l.planRole === 'gate')) {
            const next = gateStatus(g, likes);
            if (next) g.status = next;
        }
    };

    // Postorden (preorden invertido): los hijos están resueltos antes que su padre
    for (const n of [...plan.nodes].reverse()) {
        const like: PlanNodeLike = {
            id: n.key,
            status: isCompletedInExcel(n) ? 'completed' : 'pending',
            planRole: n.role,
            order: order.get(n.key),
            estimatedEffort: n.children.length ? null : (n.leafEffortDays ?? null),
            startDate: n.start,
            endDate: n.end,
            planChildCount: n.children.length,
        };
        if (n.children.length) {
            closeGates(n.children);
            const agg = aggregateChildren(n.children.map((c) => likeOf.get(c.key)!));
            if (agg) { like.status = agg.status; like.computed = agg; }
        }
        likeOf.set(n.key, like);
    }
    closeGates(plan.roots);
    return likeOf;
}
