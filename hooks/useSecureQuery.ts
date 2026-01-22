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
 * Returns a Firestore query with automatic organizationId filtering based on user claims.
 * 
 * @param collectionName - Name of the Firestore collection
 * @param additionalConstraints - Additional query constraints (where, orderBy, etc.)
 * @returns Query object ready to use with onSnapshot or getDocs
 */
export function useSecureQuery(
    collectionName: string,
    additionalConstraints: QueryConstraint[] = []
) {
    const { user, userRole, organizationId } = useAuth();

    return useMemo(() => {
        if (!user) return null;

        const baseConstraints: QueryConstraint[] = [];

        // Always add organizationId filter unless Superadmin is in "ALL" mode (which we don't really support yet in queries easily)
        // Even Superadmins should see data scoped to their current "View As" organization.
        // If they want to see "ALL", they would need a specific "ALL" organization selector or we skip.

        // Fix: Trust the AuthContext organizationId (which handles masquerading).
        // Only skip if organizationId is missing (shouldn't happen) or if we explicitly want global view.
        if (organizationId) {
            baseConstraints.push(where('organizationId', '==', organizationId));
        }

        return query(
            collection(db, collectionName),
            ...baseConstraints,
            ...additionalConstraints
        );
    }, [user, userRole, organizationId, collectionName, additionalConstraints]);
}

/**
 * Returns the current user's organization ID from Context.
 */
export function useOrganizationId(): string {
    const { organizationId } = useAuth();
    return organizationId || '1';
}

