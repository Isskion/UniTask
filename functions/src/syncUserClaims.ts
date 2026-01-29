import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Admin if not already done
if (admin.apps.length === 0) {
    admin.initializeApp();
}



// --- CONFIGURATION ---

// Explicit Role Mapping (Hardcoded for Safety & Performance)
// "Fallo Ruidoso": If it's not here, it's 0.
const SOT_ROLE_LEVELS: Record<string, number> = {
    'superadmin': 100,
    'app_admin': 80,
    'global_pm': 60,
    'consultant': 40,
    'team_member': 20,
    'client': 10,
    // Legacy maps
    'usuario_externo': 10,
    'usuario_base': 20, // Degraded from 'team_member' equivalent context if ambiguous
    'consultor': 40
};

// --- SYNC FUNCTION ---

/**
 * syncUserClaims
 * 
 * Trigger: On any write to /users/{userId}
 * Goal: Ensure Auth Custom Claims ALWAYS match the Firestore Document.
 * Policy: "Token Only" - The token is the single source of truth for Security Rules.
 */
export const syncUserClaims = functions.region('europe-west1').firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;

        // 1. DELETE Case: If user doc is deleted, revoke access immediately.
        if (!change.after.exists) {
            console.log(`[syncUserClaims] User ${userId} deleted. Revoking access.`);
            await admin.auth().setCustomUserClaims(userId, { roleLevel: 0, tenantId: '__DENY__' });
            await admin.auth().revokeRefreshTokens(userId);
            return;
        }

        const newData = change.after.data() || {};
        const oldData = change.before.data() || {};

        // 2. Extract & Normalize Data
        const roleRaw = newData.role;
        const tenantRaw = newData.tenantId;
        const isActive = newData.isActive; // Boolean

        // 3. Security Logic: Calculate "Real" Values
        // Role Level Calculation (Strict Degradation)
        let roleLevel = 0;
        if (typeof roleRaw === 'string') {
            const normalizedRole = roleRaw.toLowerCase().trim();
            roleLevel = SOT_ROLE_LEVELS[normalizedRole] || 0;
            if (roleLevel === 0 && normalizedRole !== '') {
                console.warn(`[syncUserClaims] Unknown role '${roleRaw}' for user ${userId}. Degraded to 0.`);
            }
        }

        // Tenant Calculation (Strict DEFAULT to __DENY__)
        // Preventing "unknown" or empty strings from granting access
        let finalTenantId = '__DENY__';
        if (typeof tenantRaw === 'string' && tenantRaw.trim().length > 0) {
            finalTenantId = tenantRaw.trim();
        }

        // Active Status Check
        if (isActive === false) {
            console.log(`[syncUserClaims] User ${userId} is inactive. Level degraded to 0.`);
            roleLevel = 0;
            // We keep tenantId for context, but level 0 blocks everything.
        }

        // 4. Change Detection
        // Compare with *theoretical* previous state? No, compare with *actual* previous data to decide if we need to call Auth API.
        // HOWEVER, we should also check if the *current* claims match what we want. 
        // Best practice: Just check data usage to minimize Auth API calls (rate limited).

        // Did the factors influencing claims change?
        const roleChanged = oldData.role !== newData.role;
        const tenantChanged = oldData.tenantId !== newData.tenantId;
        const statusChanged = oldData.isActive !== newData.isActive;
        const levelChanged = oldData.roleLevel !== roleLevel; // If DB had wrong level

        if (roleChanged || tenantChanged || statusChanged || levelChanged) {
            console.log(`[syncUserClaims] Syncing claims for ${userId}. Reason: Role:${roleChanged} Tenant:${tenantChanged} Status:${statusChanged}`);

            const newClaims = {
                role: roleRaw || 'unknown', // Keep string for UI display/legacy
                roleLevel: roleLevel,
                tenantId: finalTenantId,
                isActive: !!isActive,
                syncId: Date.now() // Useful for frontend to detect staleness
            };

            // A. Update Auth Claims
            await admin.auth().setCustomUserClaims(userId, newClaims);

            // B. Force Token Refresh (Revocation)
            // This is CRITICAL. It forces the client SDK to fetch a new token on next request.
            await admin.auth().revokeRefreshTokens(userId);

            console.log(`[syncUserClaims] SUCCESS: Claims updated for ${userId} ->`, newClaims);

            // C. Self-Healing: Update Firestore if the calculated Level was missing/wrong
            // This aids the "Frontend Viewer" to be accurate without hydrating logic.
            if (newData.roleLevel !== roleLevel) {
                console.log(`[syncUserClaims] Self-healing Firestore roleLevel (${newData.roleLevel} -> ${roleLevel})`);
                // Use update to avoid triggering infinite loop? 
                // onWrite triggers on update. WE MUST BE CAREFUL.
                // If we update, we trigger onWrite again.
                // We only update if it is different.
                // The Check `levelChanged` above includes this.
                // To prevent loop: Ensure the write strictly sets what we just calculated, 
                // so next run `oldData.roleLevel === roleLevel` and we exit.
                await change.after.ref.update({ roleLevel: roleLevel });
            }
        }
    });
