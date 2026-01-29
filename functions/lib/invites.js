"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteUser = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const utils_1 = require("./utils"); // Ensure utils exports getDb or we call admin.firestore()
// Re-using admin instance
const db = (0, utils_1.getDb)();
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
        case 'consultor': return 20;
        case 'usuario_base': return 10;
        case 'usuario_externo': return 5;
        default: return 0;
    }
}
exports.inviteUser = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    }
    const { uid, token } = context.auth;
    const { tenantId, targetRole, assignedProjectIds = [] } = data;
    // Get Creator Role (Trust Custom Claims!)
    const creatorRole = token.role || 'usuario_externo';
    // If we want detailed check, fetch DB, but claims should be synced.
    // Let's fetch from DB if claim is missing (legacy safety)
    let finalCreatorRole = creatorRole;
    if (!token.role) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists)
            finalCreatorRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    }
    const creatorLevel = getRoleLevelNum(finalCreatorRole);
    const targetLevel = getRoleLevelNum(targetRole);
    if (creatorLevel < 80) {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }
    if (creatorLevel === 80 && targetLevel >= 80) {
        throw new functions.https.HttpsError('permission-denied', 'Cannot invite equal/higher role');
    }
    // Create Code
    // Collision check logic
    let code = generateCode();
    let attempts = 0;
    while (attempts < 3) {
        const doc = await db.collection('invites').doc(code).get();
        if (!doc.exists)
            break;
        code = generateCode();
        attempts++;
    }
    try {
        await db.collection('invites').doc(code).set({
            code,
            createdBy: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isUsed: false,
            tenantId,
            role: targetRole,
            assignedProjectIds
        });
        return { success: true, code };
    }
    catch (e) {
        throw new functions.https.HttpsError('internal', "Failed to create invite: " + e.message);
    }
});
//# sourceMappingURL=invites.js.map