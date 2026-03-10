// Removed 'use server' because this uses Firebase client SDK and should run on the client.

import { db } from "@/lib/firebase"; // Assuming this exists or using admin
import { collection, doc, setDoc, getDoc, updateDoc, addDoc, serverTimestamp, query, where, getDocs, orderBy, FieldValue } from "firebase/firestore";
import { FlowGraph, ValidationResult } from "@/app/uniflux/core/types";
import { UnifluxValidator } from "@/app/uniflux/core/validator";

/**
 * UNIFLUX SERVER ACTIONS
 * Handles persistence for logistics flow drafts and immutable versions.
 */

const FLOWS_COLLECTION = "uniflux_flows";

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
 */
export async function saveFlowDraft(tenantId: string, flowData: Partial<FlowGraph>) {
    if (!flowData.id) throw new Error("Flow ID is required to save draft");

    const flowRef = doc(db, FLOWS_COLLECTION, flowData.id);

    const updateData = cleanForFirestore({
        ...flowData,
        tenantId,
        updatedAt: serverTimestamp(),
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
 */
export async function getFlow(flowId: string) {
    const flowRef = doc(db, FLOWS_COLLECTION, flowId);
    const flowSnap = await getDoc(flowRef);

    if (!flowSnap.exists()) return null;
    return { id: flowSnap.id, ...flowSnap.data() } as FlowGraph;
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
