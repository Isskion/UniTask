/**
 * useSecureQuery - Multi-Tenant Safe Query Hook
 * 
 * IMPORTANT: This hook provides UX filtering only.
 * The REAL security enforcement is in Firestore Security Rules.
 */

import { useMemo } from 'react';
import { collection, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

/**
 * Returns a Firestore query with automatic tenantId filtering based on user claims.
 * 
 * @param collectionName - Name of the Firestore collection
 * @param additionalConstraints - Additional query constraints (where, orderBy, etc.)
 * @returns Query object ready to use with onSnapshot or getDocs
 */
export function useTenantQuery(
    collectionName: string,
    additionalConstraints: QueryConstraint[] = []
) {
    const { user, userRole, tenantId } = useAuth();

    return useMemo(() => {
        if (!user) return null;

        const baseConstraints: QueryConstraint[] = [];

        // Always add tenantId filter unless Superadmin is in "ALL" mode (which we don't really support yet in queries easily)
        // Even Superadmins should see data scoped to their current "View As" tenant.
        // If they want to see "ALL", they would need a specific "ALL" organization selector or we skip.

        // Fix: Trust the AuthContext tenantId (which handles masquerading).
        // Only skip if tenantId is missing (shouldn't happen) or if we explicitly want global view.
        if (tenantId) {
            baseConstraints.push(where('tenantId', '==', tenantId));
        }

        return query(
            collection(db, collectionName),
            ...baseConstraints,
            ...additionalConstraints
        );
    }, [user, userRole, tenantId, collectionName, additionalConstraints]);
}

/**
 * Returns the current user's tenant ID from Context.
 */
export function useTenantId(): string {
    const { tenantId } = useAuth();
    return tenantId || '1';
}

