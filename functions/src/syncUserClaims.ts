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

// --- SHARED LOGIC ---

/**
 * calculateAndSetClaims
 * 
 * Logic to calculate claims based on Firestore user document and set them in Auth.
 */
async function calculateAndSetClaims(userId: string, userData: any) {
    if (!userData) {
        console.log(`[calculateAndSetClaims] User ${userId} has no doc. Revoking access.`);
        await admin.auth().setCustomUserClaims(userId, { roleLevel: 0, tenantId: '__DENY__' });
        await admin.auth().revokeRefreshTokens(userId);
        return { success: true, message: "Access revoked" };
    }

    const roleRaw = userData.role;
    const tenantRaw = userData.tenantId;
    const isActive = userData.isActive;

    let roleLevel = 0;
    if (typeof userData.roleLevel === 'number' && !isNaN(userData.roleLevel)) {
        roleLevel = userData.roleLevel;
    } else if (typeof roleRaw === 'string' && roleRaw.trim().length > 0) {
        const normalizedRole = roleRaw.toLowerCase().trim();
        roleLevel = SOT_ROLE_LEVELS[normalizedRole] || 0;
        if (roleLevel === 0 && !isNaN(parseInt(normalizedRole))) {
            roleLevel = parseInt(normalizedRole);
        }
    }

    let finalTenantId = '__DENY__';
    if (typeof tenantRaw === 'string' && tenantRaw.trim().length > 0) {
        finalTenantId = tenantRaw.trim();
    }

    if (isActive === false) {
        roleLevel = 0;
    }

    const newClaims = {
        role: roleRaw || 'unknown',
        roleLevel: roleLevel,
        tenantId: finalTenantId,
        isActive: !!isActive,
        syncId: Date.now()
    };

    // A. Update Auth Claims
    await admin.auth().setCustomUserClaims(userId, newClaims);

    // B. Force Token Refresh
    await admin.auth().revokeRefreshTokens(userId);

    // C. Self-Healing Firestore
    if (userData.roleLevel !== roleLevel || userData.syncId !== newClaims.syncId) {
        await admin.firestore().collection('users').doc(userId).update({
            roleLevel: roleLevel,
            syncId: newClaims.syncId
        });
    }

    return { success: true, claims: newClaims };
}

// --- SYNC FUNCTION (Trigger) ---

/**
 * onUserWriteSyncClaims
 * 
 * Trigger: On any write to /users/{userId}
 * Goal: Ensure Auth Custom Claims ALWAYS match the Firestore Document.
 */
export const onUserWriteSyncClaims = functions.region('europe-west1').firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const newData = change.after.exists ? change.after.data() : null;

        console.log(`[onUserWriteSyncClaims] Change detected for user ${userId}.`);
        return calculateAndSetClaims(userId, newData);
    });

// --- SYNC FUNCTION (HTTPS Callable) ---

/**
 * syncUserClaims
 * 
 * Target for intentional "Repair" calls from UI.
 */
export const syncUserClaims = functions.region('europe-west1').https.onCall(async (data, context) => {
    // 1. Basic Auth Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const targetUserId = data.targetUserId;
    if (!targetUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'targetUserId is required.');
    }

    // 2. Permission Check: Can only sync self or be Admin
    const callerUid = context.auth.uid;
    const isSelf = callerUid === targetUserId;
    const callerLevel = context.auth.token.roleLevel || 0;

    if (!isSelf && callerLevel < 80) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can sync other users.');
    }

    console.log(`[syncUserClaims HTTPS] Request for user ${targetUserId} by ${callerUid}`);

    try {
        const userDoc = await admin.firestore().collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User profile not found in Firestore.');
        }

        const result = await calculateAndSetClaims(targetUserId, userDoc.data());
        return { success: true, message: "Claims synced successfully", claims: result.claims };
    } catch (error: any) {
        console.error(`[syncUserClaims HTTPS] Error:`, error);
        throw new functions.https.HttpsError('internal', error.message || 'Failed to sync claims.');
    }
});
