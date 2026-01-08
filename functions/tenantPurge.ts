/**
 * Tenant Purge Function (Secure Data Deletion)
 * 
 * This function implements a SECURE deletion process:
 * 1. Double verification (ID + Name confirmation)
 * 2. Soft-delete option (30-day retention)
 * 3. Immutable audit logging
 * 4. Batch processing for large datasets
 * 
 * ONLY callable by Superadmins.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logTenantPurge, logAdminAction } from './utils/auditLogger';

const db = admin.firestore();

// Collections to clean when purging a tenant
const COLLECTIONS_TO_PURGE = [
    'projects',
    'tasks',
    'journal_entries',
    'weekly_entries',
    'permission_groups',
    'invites'
];

// User collection handled separately (might have cross-tenant considerations)
const USER_COLLECTIONS = ['users', 'user'];

interface PurgeRequest {
    targetTenantId: string;
    confirmTenantName: string; // Must match exactly for safety
    softDelete?: boolean;       // If true, marks as deleted instead of removing
    includeUsers?: boolean;     // Explicitly opt-in for user deletion
}

/**
 * Soft-delete: Marks tenant and all documents as pending deletion
 * Hard-delete: Permanently removes all data
 */
export const purgeTenantData = functions
    .runWith({
        timeoutSeconds: 540,    // Extended timeout for large datasets
        memory: '2GB'           // Extra memory for batch processing
    })
    .https.onCall(async (data: PurgeRequest, context) => {

        // ═══════════════════════════════════════════════════════
        // 1. AUTHORIZATION CHECK
        // ═══════════════════════════════════════════════════════

        if (!context.auth?.token.role || context.auth.token.role !== 'superadmin') {
            logAdminAction(
                context.auth?.uid || 'unknown',
                'UNAUTHORIZED_PURGE_ATTEMPT',
                data.targetTenantId,
                { attemptedBy: context.auth?.token.email },
                'CRITICAL'
            );
            throw new functions.https.HttpsError(
                'permission-denied',
                'Esta operación de alto riesgo está restringida a Superadmins.'
            );
        }

        const { targetTenantId, confirmTenantName, softDelete = true, includeUsers = false } = data;

        // ═══════════════════════════════════════════════════════
        // 2. TENANT VERIFICATION (Prevents accidental deletion)
        // ═══════════════════════════════════════════════════════

        const tenantRef = db.collection('tenants').doc(targetTenantId);
        const tenantDoc = await tenantRef.get();

        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                `El tenant "${targetTenantId}" no existe.`
            );
        }

        const tenantData = tenantDoc.data()!;

        // SECURITY: Name must match exactly (prevents copy-paste errors)
        if (tenantData.name !== confirmTenantName) {
            logAdminAction(
                context.auth.uid,
                'PURGE_VERIFICATION_FAILED',
                targetTenantId,
                { providedName: confirmTenantName, actualName: tenantData.name },
                'WARNING'
            );
            throw new functions.https.HttpsError(
                'invalid-argument',
                `El nombre del tenant no coincide. Proporcionado: "${confirmTenantName}", Esperado: "${tenantData.name}"`
            );
        }

        // ═══════════════════════════════════════════════════════
        // 3. SOFT DELETE (Recommended default)
        // ═══════════════════════════════════════════════════════

        if (softDelete) {
            const deletionDate = new Date();
            deletionDate.setDate(deletionDate.getDate() + 30); // 30-day retention

            await tenantRef.update({
                status: 'pending_deletion',
                deletionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
                deletionRequestedBy: context.auth.uid,
                scheduledDeletionDate: deletionDate.toISOString(),
                isActive: false
            });

            logAdminAction(
                context.auth.uid,
                'TENANT_SOFT_DELETE',
                targetTenantId,
                {
                    tenantName: confirmTenantName,
                    scheduledDeletionDate: deletionDate.toISOString()
                },
                'WARNING'
            );

            return {
                success: true,
                mode: 'soft_delete',
                message: `Tenant "${confirmTenantName}" marcado para eliminación. Será purgado después de ${deletionDate.toLocaleDateString()}.`,
                scheduledDeletionDate: deletionDate.toISOString()
            };
        }

        // ═══════════════════════════════════════════════════════
        // 4. HARD DELETE (Permanent - Use with extreme caution)
        // ═══════════════════════════════════════════════════════

        const auditResults: Record<string, number> = {};
        const BATCH_SIZE = 400;

        // Process each collection
        for (const colName of COLLECTIONS_TO_PURGE) {
            const snapshot = await db.collection(colName)
                .where('tenantId', '==', targetTenantId)
                .get();

            if (snapshot.empty) {
                auditResults[colName] = 0;
                continue;
            }

            let batch = db.batch();
            let batchCount = 0;

            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                batchCount++;

                if (batchCount >= BATCH_SIZE) {
                    await batch.commit();
                    batch = db.batch();
                    batchCount = 0;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
            }

            auditResults[colName] = snapshot.size;
        }

        // Handle users if explicitly requested
        if (includeUsers) {
            for (const userCol of USER_COLLECTIONS) {
                const userSnapshot = await db.collection(userCol)
                    .where('tenantId', '==', targetTenantId)
                    .get();

                if (!userSnapshot.empty) {
                    const batch = db.batch();
                    userSnapshot.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    auditResults[userCol] = userSnapshot.size;
                }
            }
        }

        // Delete tenant master record
        await tenantRef.delete();

        // ═══════════════════════════════════════════════════════
        // 5. IMMUTABLE AUDIT LOG (Legal evidence)
        // ═══════════════════════════════════════════════════════

        logTenantPurge(
            context.auth.uid,
            targetTenantId,
            confirmTenantName,
            auditResults
        );

        return {
            success: true,
            mode: 'hard_delete',
            message: `Tenant "${confirmTenantName}" y todos sus datos han sido eliminados permanentemente.`,
            deletedCounts: auditResults,
            totalDocumentsDeleted: Object.values(auditResults).reduce((a, b) => a + b, 0)
        };
    });

/**
 * Scheduled function to process soft-deleted tenants after retention period
 * Run daily at 2 AM
 */
export const processScheduledDeletions = functions.pubsub
    .schedule('0 2 * * *')
    .timeZone('Europe/Madrid')
    .onRun(async () => {
        const now = new Date();

        const pendingDeletions = await db.collection('tenants')
            .where('status', '==', 'pending_deletion')
            .get();

        for (const tenantDoc of pendingDeletions.docs) {
            const data = tenantDoc.data();
            const scheduledDate = new Date(data.scheduledDeletionDate);

            if (scheduledDate <= now) {
                console.log(`[SCHEDULED_PURGE] Processing tenant: ${tenantDoc.id}`);

                // Trigger hard delete (requires manual implementation of internal call)
                // For safety, this could send an email to admins instead of auto-deleting
                logAdminAction(
                    'SYSTEM_SCHEDULER',
                    'SCHEDULED_PURGE_DUE',
                    tenantDoc.id,
                    { tenantName: data.name, requestedBy: data.deletionRequestedBy },
                    'CRITICAL'
                );
            }
        }
    });
