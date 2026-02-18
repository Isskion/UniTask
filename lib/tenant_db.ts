
import { collection, doc, Firestore } from "firebase/firestore";

/**
 * TENANT-AWARE FIRESTORE HELPERS
 * 
 * Centralizes the logic for "Hard Isolation".
 * Instead of `collection(db, "projects")`, use `getTenantCollection(db, "projects", tenantId)`.
 */

export function getTenantCollection(db: Firestore, collectionName: string, tenantId?: string) {
    if (!tenantId || tenantId === "1" || tenantId === "ALL") {
        // Fallback for Phase 3 Transition: 
        // If we want to support Legacy Root + New Tenant, we might need logic here.
        // For strict Hard Isolation, EVERYTHING must be under tenants/{id}.
        // But "1" is often used as default/admin.
        return collection(db, "tenants", tenantId || "1", collectionName);
    }
    return collection(db, "tenants", tenantId, collectionName);
}

export function getTenantDoc(db: Firestore, collectionName: string, docId: string, tenantId?: string) {
    // Note: getDoc(doc(...)) requires the path. 
    // If we only have docId, we MUST know the tenantId to find it in Hard Isolation.
    // This is a key change: You cannot find a doc by ID alone anymore.
    return doc(db, "tenants", tenantId || "1", collectionName, docId);
}
