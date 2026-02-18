
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Ensure admin is initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * auditUserScope
 * 
 * Trigger: onUpdate (Users)
 * Goal: Create an immutable audit trail whenever a user's accessScopes or activeContext changes.
 * Security: Detects privilege escalation attempts or unauthorized scope changes.
 */
export const auditUserScope = functions.firestore
    // [SAM] Hard Isolation Note: Users remain GLOBAL 'users/{userId}' 
    // because auth is global. Tenant association is via 'tenantId' field.
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const userId = context.params.userId;
        const before = change.before.data();
        const after = change.after.data();

        // Check if scopes changed
        const scopesChanged = JSON.stringify(before.accessScopes) !== JSON.stringify(after.accessScopes);
        const contextChanged = JSON.stringify(before.activeContext) !== JSON.stringify(after.activeContext);

        if (!scopesChanged && !contextChanged) {
            return null;
        }

        console.log(`[AUDIT] User Scope Change detected for ${userId}`);

        const auditEntry = {
            targetUserId: userId,
            changedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Who triggered this? 
            // Note: Cloud Functions background triggers don't have 'context.auth' of the invoker easily available 
            // unless we store 'lastUpdatedBy' in the doc. We assume the doc has it.
            modifiedBy: after.lastUpdatedBy || 'UNKNOWN',
            changes: {
                accessScopes: scopesChanged ? {
                    from: before.accessScopes,
                    to: after.accessScopes
                } : null,
                activeContext: contextChanged ? {
                    from: before.activeContext,
                    to: after.activeContext
                } : null
            },
            type: 'SCOPE_CHANGE'
        };

        // Write to immutable audit collection
        return admin.firestore().collection('scopeAudit').add(auditEntry);
    });
