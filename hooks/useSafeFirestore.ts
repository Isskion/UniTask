import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase'; // Direct access for the hook ONLY
import {
    collection,
    doc,
    addDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    DocumentReference,
    CollectionReference,
    DocumentData
} from 'firebase/firestore';
import { RoleLevel } from '../types';

// SECURITY HOOK: "TRIPWIRE"
// Intercepts all write operations to ensure organization integrity.
export const useSafeFirestore = () => {
    const { identity } = useAuth();

    // Internal validator
    const validateWrite = (data: any) => {
        if (!identity) throw new Error("Security Error: No identity found during write.");

        // TRULY SUPERADMIN? Bypass checks (Trust, but backend rules will double check)
        // Ensure numeric comparison
        if (Number(identity.realRole) >= RoleLevel.SUPERADMIN) {
            console.log(`[SafeFirestore] Superadmin Bypass Active for ${identity.uid}`);
            return data;
        }

        // FAIL-SAFE LOGIC FOR REGULAR USERS / ADMINS
        const targetTenantId = data.tenantId || data.organizationId;
        const realTenantId = identity.realTenantId;

        if (targetTenantId && targetTenantId !== realTenantId) {
            // CRITICAL INCIDENT LOGGING
            console.error(`[SECURITY INCIDENT] User ${identity.uid} (Tenant ${realTenantId}) attempted write to Tenant ${targetTenantId}`);
            // TODO: Send to Sentry/LogRocket

            throw new Error(`SECURITY VIOLATION: Cross-tenant write attempted. You belong to ${realTenantId}, tried writing to ${targetTenantId}.`);
        }

        // Force correct organizationId if missing? 
        // Better to explicitly require it or inject it safely.
        // For this implementation, we allow data to pass if it doesn't have organizationId (might be updating non-organization fields),
        // but if it HAS organizationId, it MUST match.

        return data;
    };

    // --- WRAPPERS ---

    const safeAddDoc = async (collectionRef: CollectionReference, data: DocumentData) => {
        validateWrite(data);
        // FORCE organizationId injection for safety?
        // Ideally yes, but let's conform to the passed data + validation check.
        // If the developer forgot organizationId, backend rules might reject it.
        return addDoc(collectionRef, data);
    };

    const safeSetDoc = async (docRef: DocumentReference, data: DocumentData, options?: any) => {
        // For Set, we merge options?
        validateWrite(data);
        return setDoc(docRef, data, options);
    };

    const safeUpdateDoc = async (docRef: DocumentReference, data: DocumentData) => {
        validateWrite(data);
        return updateDoc(docRef, data);
    };

    const safeDeleteDoc = async (docRef: DocumentReference) => {
        // Delete usually doesn't carry data payload, but we might want to verify target doc belongs to organization?
        // That requires a read before write. Expensive.
        // We trust Backend Rules for DELETE authorization context.
        // But for preventing "Accidental Hard Delete" from UI, we check role:
        if (identity && identity.realRole < RoleLevel.SUPERADMIN) {
            // Hard Delete restriction logic could live here too?
            // For now, let firestore.rules handle the resource check.
        }
        return deleteDoc(docRef);
    };

    return {
        addDoc: safeAddDoc,
        setDoc: safeSetDoc,
        updateDoc: safeUpdateDoc,
        deleteDoc: safeDeleteDoc,
        // Expose raw methods for superadmins? No, force safety.
    };
};
