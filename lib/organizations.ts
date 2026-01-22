import { createTenant, getTenants, getNextTenantId } from './tenants';

/**
 * Bridge for Organization/Tenant nomenclature migration.
 */
export const createOrganization = createTenant;
export const getOrganizations = getTenants;
export const getNextOrganizationId = getNextTenantId;

export * from './tenants';
