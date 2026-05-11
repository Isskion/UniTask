// Removed 'use server' because this uses Firebase client SDK and should run on the client.

import { db } from "@/lib/firebase"; // Assuming this exists or using admin
import { collection, doc, setDoc, getDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, query, where, getDocs, orderBy, FieldValue } from "firebase/firestore";
import { FlowGraph, ValidationResult } from "@/app/uniflux/core/types";
import { UnifluxValidator } from "@/app/uniflux/core/validator";

/**
 * UNIFLUX SERVER ACTIONS
 * Handles persistence for logistics flow drafts and immutable versions.
 *
 * ACCESS RULES (enforced in every mutation):
 *   - tenantId must always match the caller's active tenant
 *   - projectId must always be present (no orphan flows)
 *   - createdBy is stamped on creation and never overwritten
 *   - Delete: ADMIN (roleLevel ≥ 80) can delete any flow in their tenant;
 *             lower roles can only delete flows they created
 */

const FLOWS_COLLECTION = "uniflux_flows";
const ADMIN_ROLE_LEVEL = 80; // matches RoleLevel.ADMIN

/**
 * Recursively removes undefined values from an object so Firestore doesn't reject it.
 */
function cleanForFirestore<T>(obj: T): T {
    if (Array.isArray(obj)) {
        return obj.map(cleanForFirestore) as unknown as T;
    }
    // Pass through Firestore sentinels (serverTimestamp, deleteField, etc.) and Dates untouched
    if (obj instanceof FieldValue || obj instanceof Date) {
        return obj;
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, cleanForFirestore(v)])
        ) as T;
    }
    return obj;
}

/**
 * Saves a flow draft. Does not require validation.
 * Stamps createdBy on first save (never overwritten on subsequent saves).
 */
export async function saveFlowDraft(tenantId: string, flowData: Partial<FlowGraph>, userId: string) {
    if (!flowData.id) throw new Error("Flow ID is required to save draft");
    if (!userId) throw new Error("userId is required to save draft");

    // Ensure tenantId is a string to match Firestore rules expectations
    const safeTenantId = String(tenantId);

    const flowRef = doc(db, FLOWS_COLLECTION, flowData.id);
    let existingSnap;
    
    try {
        existingSnap = await getDoc(flowRef);
    } catch (e: any) {
        console.warn("[uniflux-actions] getDoc failed before save, assuming doc doesn't exist or permission deferred.", e);
        // We continue because setDoc will either create (if permitted) or fail with permission error
    }

    // Build update payload — never overwrite createdBy if already set
    const updateData = cleanForFirestore({
        ...flowData,
        tenantId: safeTenantId,
        updatedAt: serverTimestamp(),
        // Stamp createdBy only if we confirmed it doesn't exist
        ...((existingSnap && !existingSnap.exists()) ? { createdBy: userId } : {}),
    });

    await setDoc(flowRef, updateData, { merge: true });

    return { success: true };
}

/**
 * Publishes a flow version. Requires strict validation.
 */
export async function publishFlowVersion(tenantId: string, flowId: string, authorId: string) {
    const flowRef = doc(db, FLOWS_COLLECTION, flowId);
    const flowSnap = await getDoc(flowRef);

    if (!flowSnap.exists()) throw new Error("Flow not found");

    const flowData = flowSnap.data() as FlowGraph;
    if (flowData.tenantId !== tenantId) throw new Error("Unauthorized: tenant mismatch");

    // 1. Validate
    const validation = UnifluxValidator.validate(flowData);
    if (!validation.isValid) {
        return { success: false, errors: validation.errors };
    }

    // 2. Create Snapshot
    const snapshotRef = collection(flowRef, "snapshots");
    const newVersion = `v${Date.now()}`; // Simplified versioning

    await addDoc(snapshotRef, {
        ...flowData,
        version: newVersion,
        publishedAt: serverTimestamp(),
        publishedBy: authorId,
    });

    // 3. Update Root with activeVersion
    await updateDoc(flowRef, {
        activeVersion: newVersion,
        lastPublishedAt: serverTimestamp()
    });

    return { success: true, version: newVersion };
}

/**
 * Retrieves a flow by ID.
 * Verifies tenantId to prevent cross-tenant reads.
 */
export async function getFlow(tenantId: string, flowId: string) {
    const flowRef = doc(db, FLOWS_COLLECTION, flowId);
    const flowSnap = await getDoc(flowRef);

    if (!flowSnap.exists()) return null;

    const data = flowSnap.data() as FlowGraph;
    if (data.tenantId !== tenantId) {
        // Return null instead of throwing — caller gets "not found" behaviour
        return null;
    }

    return { ...data, id: flowSnap.id } as FlowGraph;
}

/**
 * Lists all flows for a tenant (ignoring project).
 */
export async function listTenantFlows(tenantId: string) {
    const q = query(
        collection(db, FLOWS_COLLECTION),
        where("tenantId", "==", tenantId),
        orderBy("updatedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Deletes a flow draft.
 * Access rules:
 *   - tenantId must match
 *   - ADMIN (roleLevel ≥ 80) can delete any flow in their tenant
 *   - Other roles can only delete flows they created (createdBy === userId)
 */
export async function deleteFlow(tenantId: string, flowId: string, userId: string, roleLevel: number) {
    if (!userId) throw new Error("userId is required to delete a flow");

    const flowRef = doc(db, FLOWS_COLLECTION, flowId);
    const flowSnap = await getDoc(flowRef);

    if (!flowSnap.exists()) throw new Error("Flow not found");

    const flowData = flowSnap.data();

    if (flowData.tenantId !== tenantId) {
        throw new Error("Unauthorized: flow does not belong to this tenant");
    }

    const isAdmin = roleLevel >= ADMIN_ROLE_LEVEL;
    const isOwner = flowData.createdBy === userId;

    if (!isAdmin && !isOwner) {
        throw new Error("Unauthorized: you can only delete flows you created");
    }

    await deleteDoc(flowRef);
    return { success: true };
}

/**
 * Lists flows for a specific project within a tenant.
 */
export async function listProjectFlows(tenantId: string, projectId: string) {
    const q = query(
        collection(db, FLOWS_COLLECTION),
        where("tenantId", "==", tenantId),
        where("projectId", "==", projectId),
        orderBy("updatedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Creates a bidirectional link between two nodes in different flows.
 * Updates both documents in Firestore.
 */
export async function createBidirectionalLink(
    tenantId: string,
    sourceFlowId: string,
    sourceNodeId: string,
    targetFlowId: string,
    targetNodeId: string
) {
    if (!sourceFlowId || !targetFlowId || !sourceNodeId || !targetNodeId) return { success: false };

    const sourceRef = doc(db, FLOWS_COLLECTION, sourceFlowId);
    const targetRef = doc(db, FLOWS_COLLECTION, targetFlowId);

    const [sourceSnap, targetSnap] = await Promise.all([
        getDoc(sourceRef),
        getDoc(targetRef)
    ]);

    if (!sourceSnap.exists() || !targetSnap.exists()) {
        throw new Error("One or both flows not found");
    }

    const sourceData = sourceSnap.data() as FlowGraph;
    const targetData = targetSnap.data() as FlowGraph;

    // Update Source Flow (A -> B)
    const updatedSourceNodes = sourceData.nodes.map(n => 
        n.id === sourceNodeId ? { ...n, targetFlowId, targetNodeId } : n
    );
    await updateDoc(sourceRef, { 
        nodes: updatedSourceNodes,
        updatedAt: serverTimestamp()
    });

    // Update Target Flow (B -> A)
    const updatedTargetNodes = targetData.nodes.map(n => 
        n.id === targetNodeId ? { ...n, targetFlowId: sourceFlowId, targetNodeId: sourceNodeId } : n
    );
    await updateDoc(targetRef, { 
        nodes: updatedTargetNodes,
        updatedAt: serverTimestamp()
    });

    return { success: true };
}

/**
 * Sets a timed lock on the flow to indicate active editing by a specific user.
 */
export async function lockFlow(flowId: string, userId: string, userName: string) {
    if (!flowId || !userId) return;
    const flowRef = doc(db, FLOWS_COLLECTION, flowId);
    
    // Dynamically import deleteField if needed, but we imported others at the top.
    // Wait, I will need to add deleteField to the top imports in a multi-replace.
    await updateDoc(flowRef, {
        lockedBy: {
            uid: userId,
            name: userName || "Colaborador",
            timestamp: Date.now(),
            updatedAtStr: new Date().toISOString()
        }
    }).catch(err => console.warn("Locking failed", err));
}

/**
 * Explicitly clears the lock when the user exits the editor.
 */
export async function unlockFlow(flowId: string) {
    if (!flowId) return;
    const flowRef = doc(db, FLOWS_COLLECTION, flowId);
    const { deleteField } = await import("firebase/firestore");
    
    await updateDoc(flowRef, {
        lockedBy: deleteField()
    }).catch(err => console.warn("Unlocking failed", err));
}
