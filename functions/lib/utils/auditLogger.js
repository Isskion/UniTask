"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_ALERT_FILTER = exports.logTenantPurge = exports.logDataDeletion = exports.logDataModification = exports.logDataAccess = exports.logAdminAction = void 0;
/**
 * Logs an admin action to Cloud Logging in structured format.
 * These logs are immutable and can be used for legal evidence.
 */
function logAdminAction(adminUid, action, targetTenant, details = {}, severity = 'NOTICE') {
    const logEntry = {
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
exports.logAdminAction = logAdminAction;
/**
 * Logs a data access event (read operations on sensitive data)
 */
function logDataAccess(adminUid, collection, documentId, tenantId) {
    logAdminAction(adminUid, 'DATA_ACCESS', tenantId, { collection, documentId }, 'NOTICE');
}
exports.logDataAccess = logDataAccess;
/**
 * Logs a data modification event
 */
function logDataModification(adminUid, collection, documentId, tenantId, changedFields) {
    logAdminAction(adminUid, 'DATA_MODIFICATION', tenantId, { collection, documentId, changedFields }, 'WARNING');
}
exports.logDataModification = logDataModification;
/**
 * Logs a data deletion event (highest severity)
 */
function logDataDeletion(adminUid, collection, documentId, tenantId) {
    logAdminAction(adminUid, 'DATA_DELETION', tenantId, { collection, documentId }, 'CRITICAL');
}
exports.logDataDeletion = logDataDeletion;
/**
 * Logs a tenant purge event (catastrophic action)
 */
function logTenantPurge(adminUid, tenantId, tenantName, deletedCounts) {
    const logEntry = {
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
exports.logTenantPurge = logTenantPurge;
/**
 * Create a Cloud Logging alert filter for monitoring
 * Use this in Google Cloud Console > Logging > Log-based Metrics
 *
 * Filter: jsonPayload.punishableAction = true AND jsonPayload.severity = "CRITICAL"
 * Alert: Send email when > 0 matches in 1 minute window
 */
exports.AUDIT_ALERT_FILTER = `
resource.type="cloud_function"
jsonPayload.punishableAction=true
jsonPayload.severity="CRITICAL"
`;
//# sourceMappingURL=auditLogger.js.map