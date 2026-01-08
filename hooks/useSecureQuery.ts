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

interface UserClaims {
    role?: string;
    tenantId?: string;
}

/**
 * Returns a Firestore query with automatic tenantId filtering based on user claims.
 * 
 * @param collectionName - Name of the Firestore collection
 * @param additionalConstraints - Additional query constraints (where, orderBy, etc.)
 * @returns Query object ready to use with onSnapshot or getDocs
 */
export function useSecureQuery(
    collectionName: string,
    additionalConstraints: QueryConstraint[] = []
) {
    const { user, userRole } = useAuth();

    return useMemo(() => {
        if (!user) return null;

        const baseConstraints: QueryConstraint[] = [];

        // Get tenantId from user's custom claims
        // Note: In a real implementation, you'd get this from auth.currentUser.getIdTokenResult()
        // For now, we use a default tenant ID for the migration phase
        const tenantId = '1'; // Default tenant during migration

        // Always add tenantId filter for non-superadmins
        // Superadmins can view all data, but we still filter by default for UX
        // They use a tenant selector in the UI to switch context
        if (userRole !== 'superadmin') {
            baseConstraints.push(where('tenantId', '==', tenantId));
        }

        return query(
            collection(db, collectionName),
            ...baseConstraints,
            ...additionalConstraints
        );
    }, [user, userRole, collectionName, additionalConstraints]);
}

/**
 * Returns the current user's tenant ID from claims.
 * Defaults to '1' during migration phase.
 */
export function useTenantId(): string {
    // TODO: Implement proper claim extraction
    // const { user } = useAuth();
    // const [tenantId, setTenantId] = useState('1');
    // 
    // useEffect(() => {
    //     if (user) {
    //         user.getIdTokenResult().then(result => {
    //             setTenantId(result.claims.tenantId as string || '1');
    //         });
    //     }
    // }, [user]);

    return '1'; // Default during migration
}

/**
 * Helper to get tenant context for new document creation.
 * Always include this in new documents.
 */
export function getTenantContext() {
    return {
        tenantId: '1' // Default during migration - will be replaced by claim extraction
    };
}
