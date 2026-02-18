"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncResourceScope = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Ensure admin is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * syncResourceScope
 *
 * Trigger: onWrite (Projects & Tasks)
 * Goal: Ensure _accessKey and _tenantAccessKey are strictly consistent with regionId/divisionId.
 * Security: Prevents TOCTOU attacks where client might try to send mismatched keys.
 */
exports.syncResourceScope = functions.firestore
    .document('tenants/{tenantId}/{collection}/{docId}')
    .onWrite(async (change, context) => {
    const { tenantId, collection, docId } = context.params;
    // Filter: Only apply to 'projects' and 'tasks'
    if (collection !== 'projects' && collection !== 'tasks')
        return null;
    // Exit on Delete
    if (!change.after.exists)
        return null;
    const data = change.after.data();
    if (!data)
        return null;
    // Skip if this is a legacy doc without scope fields (migration script handles these)
    // OR if this is the migration script properly setting them.
    if (!data.regionId || !data.divisionId)
        return null;
    const expectedKey = `${data.regionId}:${data.divisionId}`;
    const expectedTenantKey = `${data.tenantId}:${expectedKey}`;
    // Infinite Loop Prevention:
    // If keys are already correct, STOP.
    if (data._accessKey === expectedKey &&
        data._tenantAccessKey === expectedTenantKey &&
        data.tenantId === tenantId) { // Check tenantId consistency too
        return null;
    }
    console.log(`[SAM] Correcting Scope for ${tenantId}/${collection}/${docId}: ${expectedKey}`);
    // System Write (Bypasses Rules)
    return change.after.ref.update({
        _accessKey: expectedKey,
        _tenantAccessKey: expectedTenantKey,
        tenantId: tenantId,
        _scopeSyncedAt: admin.firestore.FieldValue.serverTimestamp()
    });
});
//# sourceMappingURL=sam_sync.js.map