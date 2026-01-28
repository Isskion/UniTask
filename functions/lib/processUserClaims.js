"use strict";
/**
 * Cloud Function: processUserClaims
 *
 * This function runs when a new user is created in Firebase Auth.
 * It assigns Custom Claims (role, tenantId) based on:
 * 1. If email is in system_config/admins -> superadmin
 * 2. Otherwise -> user with default tenant
 *
 * DEPLOYMENT:
 * 1. Create a Cloud Functions project: firebase init functions
 * 2. Install dependencies: npm install firebase-admin firebase-functions
 * 3. Copy this file to functions/src/
 * 4. Deploy: firebase deploy --only functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserClaims = exports.processUserClaims = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Ensure admin is initialized before using firestore
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
// Role Weight Mapping (Duplicated to avoid import issues in Cloud Functions)
const ROLE_LEVELS = {
    'usuario_externo': 10,
    'usuario_base': 20,
    'consultor': 40,
    'global_pm': 60,
    'app_admin': 80,
    'superadmin': 100
};
// 2. Trigger on User Creation
// ------------------------------------------------------------------
exports.processUserClaims = functions.region('europe-west1').auth.user().onCreate(async (user) => {
    var _a;
    console.log(`[processUserClaims] Processing new user: ${user.email}`);
    try {
        // 1. Check if user is in admin whitelist
        const adminDoc = await db.collection('system_config').doc('admins').get();
        const allowedEmails = adminDoc.exists
            ? (((_a = adminDoc.data()) === null || _a === void 0 ? void 0 : _a.emails) || []).map((e) => e.toLowerCase())
            : [];
        let customClaims;
        if (user.email && allowedEmails.includes(user.email.toLowerCase())) {
            // Superadmin: System-level access
            console.log(`[processUserClaims] Superadmin detected: ${user.email}`);
            customClaims = {
                role: 'superadmin',
                tenantId: 'SYSTEM',
                isActive: true,
                roleLevel: 100
            };
        }
        else {
            // Regular user: Assign to default tenant
            const tenantId = await resolveTenantForUser(user);
            console.log(`[processUserClaims] Regular user assigned to tenant: ${tenantId}`);
            const defaultRole = 'usuario_base';
            customClaims = {
                role: defaultRole,
                tenantId: tenantId,
                isActive: false,
                roleLevel: ROLE_LEVELS[defaultRole] || 20
            };
        }
        // 2. Set immutable Custom Claims in JWT
        await admin.auth().setCustomUserClaims(user.uid, customClaims);
        console.log(`[processUserClaims] Claims set for ${user.uid}:`, customClaims);
        // 3. Create/Update user profile in Firestore (Using 'users' collection)
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: customClaims.role,
            roleLevel: customClaims.roleLevel,
            tenantId: customClaims.tenantId,
            isActive: customClaims.isActive,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[processUserClaims] User profile created/updated for ${user.uid}`);
    }
    catch (error) {
        console.error(`[processUserClaims] Error processing user ${user.uid}:`, error);
        throw error;
    }
});
/**
 * Resolves which tenant a new user should be assigned to.
 */
async function resolveTenantForUser(user) {
    return '1';
}
/**
 * Update claims helper
 */
exports.updateUserClaims = functions.region('europe-west1').https.onCall(async (data, context) => {
    var _a, _b;
    // Verify caller is superadmin (Level 100)
    const callerLevel = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.roleLevel) || 0;
    const callerRole = (_b = context.auth) === null || _b === void 0 ? void 0 : _b.token.role;
    if (callerRole !== 'superadmin' && callerLevel < 80) { // Allocating update power to admin/superadmin
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions to update claims');
    }
    const { targetUserId, newRole, newTenantId } = data;
    if (!targetUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'targetUserId is required');
    }
    // Get current claims
    const targetUser = await admin.auth().getUser(targetUserId);
    const currentClaims = targetUser.customClaims || {};
    const targetLevel = currentClaims.roleLevel || 0;
    // Safety: You can't edit someone with higher or equal level unless you are Superadmin (100)
    if (callerLevel <= targetLevel && callerRole !== 'superadmin') {
        throw new functions.https.HttpsError('permission-denied', 'Cannot edit a user with equal or higher rank');
    }
    // Calculate new Level if role changes
    const newLevel = newRole ? (ROLE_LEVELS[newRole] || 0) : undefined;
    // Update claims
    const updatedClaims = Object.assign(Object.assign(Object.assign(Object.assign({}, currentClaims), (newRole && { role: newRole })), (newRole && { roleLevel: newLevel })), (newTenantId && { tenantId: newTenantId }));
    await admin.auth().setCustomUserClaims(targetUserId, updatedClaims);
    // Sync to Firestore profile
    await db.collection('users').doc(targetUserId).set({
        role: updatedClaims.role,
        roleLevel: updatedClaims.roleLevel,
        tenantId: updatedClaims.tenantId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`[updateUserClaims] Updated claims for ${targetUserId}:`, updatedClaims);
    return { success: true, claims: updatedClaims };
});
//# sourceMappingURL=processUserClaims.js.map