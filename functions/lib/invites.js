"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteUser = exports.consumeInvite = exports.checkInvite = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const utils_1 = require("./utils"); // Ensure utils exports getDb or we call admin.firestore()
// Re-using admin instance
// const db = getDb(); // REMOVED: Global init causes crash
function generateCode(length = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function getRoleLevelNum(role) {
    switch (role) {
        case 'superadmin': return 100;
        case 'app_admin': return 80;
        case 'global_pm': return 60;
        case 'consultant':
        case 'consultor': return 40;
        case 'team_member': return 20;
        case 'client': return 10;
        case 'usuario_base': return 20; // Default base role
        case 'usuario_externo': return 5;
        default: return 0;
    }
}
// ... existing inviteUser ...
/**
 * Validates an invite code
 */
exports.checkInvite = functions.region('europe-west1').https.onCall(async (data, context) => {
    const { code } = data;
    if (!code)
        throw new functions.https.HttpsError('invalid-argument', 'Code required');
    try {
        const db = (0, utils_1.getDb)();
        const doc = await db.collection('invites').doc(code).get();
        if (!doc.exists) {
            return { valid: false, reason: "Invitation not found" };
        }
        const invite = doc.data();
        if (invite === null || invite === void 0 ? void 0 : invite.isUsed) {
            return { valid: false, reason: "Invitation already used" };
        }
        return {
            valid: true,
            tenantId: invite === null || invite === void 0 ? void 0 : invite.tenantId,
            role: invite === null || invite === void 0 ? void 0 : invite.role,
            assignedProjectIds: invite === null || invite === void 0 ? void 0 : invite.assignedProjectIds
        };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', e.message);
    }
});
/**
 * Consumes an invite code (Marks it as used)
 */
exports.consumeInvite = functions.region('europe-west1').https.onCall(async (data, context) => {
    var _a;
    const { code, userUid } = data;
    if (!code || !userUid)
        throw new functions.https.HttpsError('invalid-argument', 'Code and User UID required');
    try {
        const db = (0, utils_1.getDb)();
        const inviteRef = db.collection('invites').doc(code);
        const inviteSnap = await inviteRef.get();
        if (!inviteSnap.exists || ((_a = inviteSnap.data()) === null || _a === void 0 ? void 0 : _a.isUsed)) {
            throw new functions.https.HttpsError('failed-precondition', 'Invalid or already used invitation');
        }
        const inviteData = inviteSnap.data();
        // Transactional update: mark used and sync user data
        await db.runTransaction(async (transaction) => {
            transaction.update(inviteRef, {
                isUsed: true,
                usedBy: userUid,
                usedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Update user document if it exists
            const userRef = db.collection('users').doc(userUid);
            transaction.set(userRef, {
                tenantId: inviteData === null || inviteData === void 0 ? void 0 : inviteData.tenantId,
                role: inviteData === null || inviteData === void 0 ? void 0 : inviteData.role,
                roleLevel: getRoleLevelNum(inviteData === null || inviteData === void 0 ? void 0 : inviteData.role),
                isActive: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
        return { success: true };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', e.message);
    }
});
exports.inviteUser = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
    var _a;
    // 1. Auth Check
    if (!context.auth) {
        console.error("[inviteUser] Unauthenticated call");
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const { uid, token } = context.auth;
    const { tenantId, targetRole, assignedProjectIds = [] } = data;
    console.log(`[inviteUser] Call from ${uid} for tenant ${tenantId}, role ${targetRole}`);
    // 2. Logic & Permission Check
    try {
        const db = (0, utils_1.getDb)(); // Lazy load to ensure init
        // Get Creator Role (Trust Custom Claims!)
        const creatorRole = token.role || 'usuario_externo';
        let finalCreatorRole = creatorRole;
        // Fallback check if claim missing
        if (!token.role) {
            console.log("[inviteUser] No role claim, checking DB...");
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists)
                finalCreatorRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
        }
        const creatorLevel = getRoleLevelNum(finalCreatorRole);
        const targetLevel = getRoleLevelNum(targetRole);
        console.log(`[inviteUser] Levels - Creator: ${creatorLevel}, Target: ${targetLevel}`);
        if (creatorLevel < 80) {
            console.warn("[inviteUser] Permission denied (Level < 80)");
            throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
        }
        if (creatorLevel === 80 && targetLevel >= 80) {
            // Allow App Admins to invite other admins? Usually restricted. 
            // Logic says: Cannot invite equal/higher.
            console.warn(`[inviteUser] Permission denied (Target level ${targetLevel} >= Creator ${creatorLevel})`);
            throw new functions.https.HttpsError('permission-denied', 'Cannot invite equal/higher role');
        }
        // 3. Generate Code
        let code = generateCode();
        let attempts = 0;
        let collision = false;
        while (attempts < 3) {
            const doc = await db.collection('invites').doc(code).get();
            if (!doc.exists)
                break;
            console.log("[inviteUser] Collision detected, retrying...");
            code = generateCode();
            attempts++;
            if (attempts === 3)
                collision = true;
        }
        if (collision) {
            throw new functions.https.HttpsError('resource-exhausted', 'Failed to generate unique code');
        }
        // 4. Write to DB
        await db.collection('invites').doc(code).set({
            code,
            createdBy: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isUsed: false,
            tenantId,
            role: targetRole,
            assignedProjectIds
        });
        console.log(`[inviteUser] Success: ${code}`);
        return { success: true, code };
    }
    catch (e) {
        console.error("[inviteUser] CRITICAL ERROR:", e);
        // Ensure we pass meaningful message if it's already HttpsError
        if (e instanceof functions.https.HttpsError) {
            throw e;
        }
        throw new functions.https.HttpsError('internal', `Failed to create invite: ${e.message}`);
    }
});
//# sourceMappingURL=invites.js.map