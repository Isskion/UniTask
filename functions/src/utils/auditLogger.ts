/**
 * Audit Logger Utility
 * 
 * Cloud Function utilities for logging admin actions.
 * All logs are structured for Google Cloud Logging and can be
 * queried for compliance/legal purposes.
 * 
 * Log Levels:
 * - NOTICE: Standard admin actions (blue in Cloud Console)
 * - WARNING: Sensitive operations (yellow)
 * - CRITICAL: Destructive actions like data deletion (red)
 */

import * as admin from 'firebase-admin';

export type AuditSeverity = 'NOTICE' | 'WARNING' | 'CRITICAL';

export interface AuditLogEntry {
    severity: AuditSeverity;
    message: string;
    adminId: string;
    adminEmail?: string;
    tenantId: string;
    action: string;
    targetCollection?: string;
    targetDocumentId?: string;
    details?: Record<string, any>;
    timestamp: string;
    punishableAction: boolean; // Flag for legal/compliance filtering
    ipAddress?: string;
}

/**
 * Logs an admin action to Cloud Logging in structured format.
 * These logs are immutable and can be used for legal evidence.
 */
export function logAdminAction(
    adminUid: string,
    action: string,
    targetTenant: string,
    details: Record<string, any> = {},
    severity: AuditSeverity = 'NOTICE'
): void {
    const logEntry: AuditLogEntry = {
        severity,
        message: `[ADMIN_AUDIT] Action: ${action}`,
        adminId: adminUid,
        tenantId: targetTenant,
        action,
        details,
        timestamp: new Date().toISOString(),
        punishableAction: true
    };

    // Structured logging for Cloud Logging
    console.log(JSON.stringify(logEntry));
}

/**
 * Logs a data access event (read operations on sensitive data)
 */
export function logDataAccess(
    adminUid: string,
    collection: string,
    documentId: string,
    tenantId: string
): void {
    logAdminAction(
        adminUid,
        'DATA_ACCESS',
        tenantId,
        { collection, documentId },
        'NOTICE'
    );
}

/**
 * Logs a data modification event
 */
export function logDataModification(
    adminUid: string,
    collection: string,
    documentId: string,
    tenantId: string,
    changedFields: string[]
): void {
    logAdminAction(
        adminUid,
        'DATA_MODIFICATION',
        tenantId,
        { collection, documentId, changedFields },
        'WARNING'
    );
}

/**
 * Logs a data deletion event (highest severity)
 */
export function logDataDeletion(
    adminUid: string,
    collection: string,
    documentId: string,
    tenantId: string
): void {
    logAdminAction(
        adminUid,
        'DATA_DELETION',
        tenantId,
        { collection, documentId },
        'CRITICAL'
    );
}

/**
 * Logs a tenant purge event (catastrophic action)
 */
export function logTenantPurge(
    adminUid: string,
    tenantId: string,
    tenantName: string,
    deletedCounts: Record<string, number>
): void {
    const logEntry: AuditLogEntry = {
        severity: 'CRITICAL',
        message: `[TENANT_PURGE] Tenant ${tenantId} (${tenantName}) has been permanently deleted.`,
        adminId: adminUid,
        tenantId,
        action: 'TENANT_PURGE',
        details: {
            tenantName,
            deletedCounts,
            totalDocumentsDeleted: Object.values(deletedCounts).reduce((a, b) => a + b, 0)
        },
        timestamp: new Date().toISOString(),
        punishableAction: true
    };

    console.log(JSON.stringify(logEntry));
}

/**
 * Create a Cloud Logging alert filter for monitoring
 * Use this in Google Cloud Console > Logging > Log-based Metrics
 * 
 * Filter: jsonPayload.punishableAction = true AND jsonPayload.severity = "CRITICAL"
 * Alert: Send email when > 0 matches in 1 minute window
 */
export const AUDIT_ALERT_FILTER = `
resource.type="cloud_function"
jsonPayload.punishableAction=true
jsonPayload.severity="CRITICAL"
`;
