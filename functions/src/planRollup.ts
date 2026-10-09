import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "./utils";
import {
    aggregateChildren,
    gateStatus,
    isLive,
    sameAggregate,
    toMillis,
    CLOSED_STATUSES,
    PlanNodeLike,
} from "./planRollupCore";

/**
 * [Plan] Propaga el estado del árbol de plan hacia arriba (docs/plan-import-design.md §5).
 *
 * Al cambiar una tarea con `planRole`, recalcula su padre (y el anterior si se movió). Escribir el
 * padre vuelve a disparar esta función sobre él, así que la propagación sube nivel a nivel hasta
 * que un nodo no cambia. Solo escribe si algo cambia: no hay bucles.
 *
 * Las tareas creadas por la importación inicial (`importId` en el alta) se ignoran al crearse: el
 * asistente fija los estados iniciales en el mismo lote, y evitamos cientos de recálculos.
 * Las altas de una reimportación (`importKind: 'reimport'`) sí recalculan: cuelgan de nodos ya existentes.
 */

const WATCHED_FIELDS = [
    "status", "parentId", "estimatedEffort", "actualEffort", "startDate", "endDate",
    "planStatus", "isActive", "planRole", "order", "computed", "planWait",
];

function fieldChanged(before: admin.firestore.DocumentData, after: admin.firestore.DocumentData, field: string): boolean {
    const a = before[field];
    const b = after[field];
    if (a === b) return false;
    const ma = toMillis(a);
    const mb = toMillis(b);
    if (ma !== null && mb !== null && (field === "startDate" || field === "endDate")) return ma !== mb;
    return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

export const planRollup = functions.region("europe-west1").firestore
    .document("tasks/{taskId}")
    .onWrite(async (change) => {
        const before = change.before.exists ? change.before.data()! : null;
        const after = change.after.exists ? change.after.data()! : null;

        // Solo tareas del árbol de plan
        if (!before?.planRole && !after?.planRole) return null;

        // Alta desde importación: el lote ya trae los estados calculados
        if (!before && after?.importId && after?.importKind !== "reimport") return null;

        if (before && after && !WATCHED_FIELDS.some((f) => fieldChanged(before, after, f))) return null;

        const parents = new Set<string>();
        if (before?.parentId) parents.add(before.parentId);
        if (after?.parentId) parents.add(after.parentId);

        for (const parentId of parents) {
            try {
                await recomputeNode(parentId);
            } catch (err) {
                console.error(`[planRollup] Error recalculando ${parentId}:`, err);
            }
        }
        return null;
    });

export async function recomputeNode(nodeId: string): Promise<void> {
    const db = getDb();
    const nodeRef = db.collection("tasks").doc(nodeId);

    await db.runTransaction(async (tx) => {
        const nodeSnap = await tx.get(nodeRef);
        if (!nodeSnap.exists) return;
        const node = { id: nodeSnap.id, ...nodeSnap.data() } as PlanNodeLike & admin.firestore.DocumentData;
        if (!node.planRole) return;

        const childrenSnap = await tx.get(db.collection("tasks").where("parentId", "==", nodeId));
        const children = childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PlanNodeLike));
        const live = children.filter(isLive);
        const agg = aggregateChildren(children);

        const update: admin.firestore.DocumentData = {};

        if ((node.planChildCount ?? 0) !== live.length) update.planChildCount = live.length;

        if (agg) {
            if (node.planRole === "leaf") update.planRole = "parent";

            if (!sameAggregate(node.computed, agg)) {
                update.computed = { ...agg, updatedAt: FieldValue.serverTimestamp() };
                update.progressV13 = {
                    actual: agg.progress,
                    planned: node.progressV13?.planned ?? 0,
                    aggregated: agg.progress,
                };
            }
            if (node.status !== agg.status) {
                update.status = agg.status;
                if (CLOSED_STATUSES.has(agg.status)) {
                    update.closedAt = FieldValue.serverTimestamp();
                    update.closedBy = "system:planRollup";
                } else if (CLOSED_STATUSES.has(String(node.status))) {
                    update.closedAt = FieldValue.delete();
                    update.closedBy = FieldValue.delete();
                }
            }
        } else if (node.computed) {
            // Se quedó sin hijos: un "parent" vuelve a ser hoja; un hito pasa a individual (manual).
            update.computed = FieldValue.delete();
            if (node.planRole === "parent") update.planRole = "leaf";
        }

        // Gates hijos de este nodo
        const gateUpdates: { ref: admin.firestore.DocumentReference; data: admin.firestore.DocumentData }[] = [];
        for (const gate of live.filter((c) => c.planRole === "gate")) {
            const next = gateStatus(gate, children);
            if (next && next !== gate.status) {
                const data: admin.firestore.DocumentData = { status: next, updatedAt: FieldValue.serverTimestamp() };
                if (CLOSED_STATUSES.has(next)) {
                    data.closedAt = FieldValue.serverTimestamp();
                    data.closedBy = "system:planRollup";
                } else {
                    data.closedAt = FieldValue.delete();
                    data.closedBy = FieldValue.delete();
                }
                gateUpdates.push({ ref: db.collection("tasks").doc(gate.id), data });
            }
        }

        if (Object.keys(update).length > 0) {
            update.updatedAt = FieldValue.serverTimestamp();
            tx.update(nodeRef, update);
        }
        for (const g of gateUpdates) tx.update(g.ref, g.data);
    });
}
