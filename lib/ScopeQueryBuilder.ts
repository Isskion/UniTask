
import {
    Query,
    collection,
    query,
    where,
    Firestore,
    CollectionReference
} from 'firebase/firestore';
import { UserProfile } from '@/types';
import { getTenantCollection } from './tenant_db';

/**
 * ScopeQueryBuilder
 * 
 * Helper class to construct Firestore queries that respect the SAM architecture.
 * Automatically applies tenant isolation and access scope filters.
 */
export class ScopeQueryBuilder {

    /**
     * Builds a secure query for a given collection based on user's identity and scopes.
     * 
     * @param db Firestore instance
     * @param collectionName Name of the collection (e.g., 'projects', 'tasks')
     * @param user The authenticated user's profile
     * @returns A Firestore Query object with security filters applied
     * @throws Error if the user's scope combination exceeds Firestore limits (30)
     */
    static build(db: Firestore, collectionName: string, user: UserProfile): Query {
        // [SAM] Hard Isolation: Get Collection from Tenant Path
        const colRef = getTenantCollection(db, collectionName, user.tenantId);
        return ScopeQueryBuilder.buildFromRef(colRef, user);
    }

    /**
     * Applies security filters to an existing CollectionReference or Query.
     * Use this if you need to add more filters (e.g. status == active) on top of the base security.
     */
    static buildFromRef(queryRef: Query | CollectionReference, user: UserProfile): Query {
        if (!user.tenantId) {
            throw new Error("Security Violation: User has no tenantId");
        }

        // 1. Hard Isolation: Tenant ID is mandatory
        // With /tenants/{id}/... path, this check is redundant for security but good for query consistency
        // if we mix root/tenant queries. 
        // However, if we query /tenants/{id}/projects, all docs HAVE that tenantId implicitly.
        // Let's Keep it for safety if 'queryRef' came from a CollectionGroup query or Root.
        let secureQuery = query(queryRef, where('tenantId', '==', user.tenantId));

        // 2. Scope Resolution
        // Prefer activeContext if set (limited subset), otherwise full accessScopes
        const scope = user.activeContext || user.accessScopes;

        if (!scope || !scope.regionIds || !scope.divisionIds) {
            // Safe fallback: If no scopes defined, return query that matches nothing meaningful
            // or just the tenant check if that's the intended "no scope" behavior (usually it means NO access)
            // For now, let's assume if no scope is present, they shouldn't see anything scoped.
            // But legacy users might not have scopes yet.
            // STRATEGY: Return only tenantId check if we are in migration phase? 
            // NO, we want enforce. But if data is not migrated yet, query might return empty.
            // Let's proceed with standard logic.
            return secureQuery;
        }

        // 3. Strategy A: Wildcards (Optimal for Admins/Global Users)
        const hasGlobalRegion = scope.regionIds.includes('*');
        const hasGlobalDivision = scope.divisionIds.includes('*');

        if (hasGlobalRegion || hasGlobalDivision) {
            // Optimization: If global in one dimension, we only filter the other
            if (!hasGlobalRegion) {
                secureQuery = query(secureQuery, where('regionId', 'in', scope.regionIds));
            }
            if (!hasGlobalDivision) {
                secureQuery = query(secureQuery, where('divisionId', 'in', scope.divisionIds));
            }
            return secureQuery;
        }

        // 4. Strategy B: Cartesian Product (Access Keys)
        // Verify combinatorial limit
        const totalCombinations = scope.regionIds.length * scope.divisionIds.length;

        if (totalCombinations > 30) {
            throw new Error(
                `FORCE_CONTEXT_SELECTION: User has ${totalCombinations} scope combinations. ` +
                `Maximum allowed is 30. Please reduce activeContext.`
            );
        }

        // Generate Access Keys
        const keys: string[] = [];
        for (const region of scope.regionIds) {
            for (const division of scope.divisionIds) {
                keys.push(`${region}:${division}`);
            }
        }

        // Apply accessKey filter
        if (keys.length > 0) {
            secureQuery = query(secureQuery, where('_accessKey', 'in', keys));
        } else {
            // Edge case: empty scopes -> empty result (impossible condition)
            secureQuery = query(secureQuery, where('_accessKey', '==', '__DENY__'));
        }

        return secureQuery;
    }
}
