"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteUser = exports.deactivateInvite = exports.consumeInvite = exports.checkInvite = exports.createInvite = void 0;
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
 * Creates a new invite code
 */
exports.createInvite = functions.region("europe-west1").https.onCall(async (data, context) => {
    // TODO: Implement createInvite logic
    throw new functions.https.HttpsError('unimplemented', 'createInvite is not yet implemented');
});
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
        // 2. Check if active (Manual deactivation)
        if ((invite === null || invite === void 0 ? void 0 : invite.isActive) === false) {
            return { valid: false, reason: "EXPIRED_OR_REVOKED" };
        }
        // 3. Check expiration (10 days)
        if (invite === null || invite === void 0 ? void 0 : invite.createdAt) {
            const createdTime = invite.createdAt.toDate().getTime();
            const tenDaysInMillis = 10 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            if (now - createdTime > tenDaysInMillis) {
                return { valid: false, reason: "EXPIRED_OR_REVOKED" };
            }
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
    const { code, userUid } = data;
    if (!code || !userUid)
        throw new functions.https.HttpsError('invalid-argument', 'Code and User UID required');
    try {
        const db = (0, utils_1.getDb)();
        const inviteRef = db.collection('invites').doc(code);
        const inviteSnap = await inviteRef.get();
        if (!inviteSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Invitation not found');
        }
        const inviteData = inviteSnap.data();
        // 1. Check if Used
        if (inviteData === null || inviteData === void 0 ? void 0 : inviteData.isUsed) {
            throw new functions.https.HttpsError('failed-precondition', 'Invitation already used');
        }
        // 2. Check if Active
        if ((inviteData === null || inviteData === void 0 ? void 0 : inviteData.isActive) === false) {
            throw new functions.https.HttpsError('failed-precondition', 'EXPIRED_OR_REVOKED');
        }
        // 3. Check Expiration
        if (inviteData === null || inviteData === void 0 ? void 0 : inviteData.createdAt) {
            const createdTime = inviteData.createdAt.toDate().getTime();
            const tenDaysInMillis = 10 * 24 * 60 * 60 * 1000;
            if (Date.now() - createdTime > tenDaysInMillis) {
                throw new functions.https.HttpsError('failed-precondition', 'EXPIRED_OR_REVOKED');
            }
        }
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
        // Pass through known errors
        if (e instanceof functions.https.HttpsError)
            throw e;
        throw new functions.https.HttpsError('internal', e.message);
    }
});
/**
 * Manually deactivates an invite
 */
exports.deactivateInvite = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Auth required');
    // Only Admins (Level >= 80) can deactivate? Or Creator?
    // Simplified: Check if user is at least Admin or the Creator
    const { code } = data;
    if (!code)
        throw new functions.https.HttpsError('invalid-argument', 'Code required');
    const db = (0, utils_1.getDb)();
    const inviteRef = db.collection('invites').doc(code);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists)
        throw new functions.https.HttpsError('not-found', 'Invite not found');
    const inviteData = inviteSnap.data();
    // Permission Check: 
    // Must be Creator OR (RoleLevel >= 80)
    const requestorUid = context.auth.uid;
    const isCreator = (inviteData === null || inviteData === void 0 ? void 0 : inviteData.createdBy) === requestorUid;
    // We can check claim for admin status
    const requestorLevel = context.auth.token.roleLevel || 0;
    if (!isCreator && requestorLevel < 80) {
        throw new functions.https.HttpsError('permission-denied', 'You cannot deactivate this invite');
    }
    await inviteRef.update({
        isActive: false,
        deactivatedBy: requestorUid,
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
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
    const { tenantId, targetRole, assignedProjectIds = [], newTenantName, targetPermissionGroupId } = data;
    console.log(`[inviteUser V2 DEBUG] Type of newTenantName: ${typeof newTenantName}, IsArray: ${Array.isArray(newTenantName)}`);
    console.log(`[inviteUser V2 DEBUG] Data:`, { tenantId, targetRole, assignedProjectIds, newTenantName, targetPermissionGroupId });
    if (newTenantName && typeof newTenantName !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `Invalid newTenantName: Expected string, got ${typeof newTenantName} (${Array.isArray(newTenantName) ? 'Array' : 'Object'})`);
    }
    console.log(`[inviteUser] Call from ${uid} for tenant ${tenantId} (New: ${newTenantName}), role ${targetRole}`);
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
            console.warn(`[inviteUser] Permission denied (Target level ${targetLevel} >= Creator ${creatorLevel})`);
            throw new functions.https.HttpsError('permission-denied', 'Cannot invite equal/higher role');
        }
        // 3. Atomic Transaction (Tenant + Project + Invite)
        let code = generateCode();
        let attempts = 0;
        let transactionSuccess = false;
        while (!transactionSuccess && attempts < 3) {
            try {
                await db.runTransaction(async (t) => {
                    // A. Check Collision
                    const inviteRef = db.collection('invites').doc(code);
                    const inviteDoc = await t.get(inviteRef);
                    if (inviteDoc.exists) {
                        throw new Error("COLLISION");
                    }
                    // B. Handle New Tenant
                    let finalTenantId = tenantId;
                    let finalProjectIds = assignedProjectIds;
                    if (newTenantName) {
                        // B1. Get Next Tenant ID
                        const counterRef = db.collection("system").doc("counters");
                        const counterDoc = await t.get(counterRef);
                        let nextId = 2;
                        if (counterDoc.exists) {
                            const counterData = counterDoc.data();
                            nextId = ((counterData === null || counterData === void 0 ? void 0 : counterData.tenants) || (counterData === null || counterData === void 0 ? void 0 : counterData.organizations) || 1) + 1;
                        }
                        // Update Counter
                        t.set(counterRef, { tenants: nextId }, { merge: true });
                        finalTenantId = nextId.toString();
                        // B2. Create Tenant
                        const newTenantRef = db.collection('tenants').doc(finalTenantId);
                        t.set(newTenantRef, {
                            id: finalTenantId,
                            name: newTenantName,
                            code: newTenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            isActive: true
                        });
                        // B3. Create Default Project
                        const projectCode = (newTenantName.substring(0, 3) + "-001").toUpperCase();
                        const newProjectRef = db.collection('projects').doc();
                        t.set(newProjectRef, {
                            id: newProjectRef.id,
                            name: newTenantName,
                            code: projectCode,
                            clientName: newTenantName,
                            status: 'active',
                            health: 'healthy',
                            isActive: true,
                            tenantId: finalTenantId,
                            teamIds: [],
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        finalProjectIds = [newProjectRef.id];
                    }
                    // C. Create Invite
                    const inviteData = {
                        code,
                        createdBy: uid,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        isUsed: false,
                        isActive: true,
                        tenantId: finalTenantId,
                        role: targetRole,
                        assignedProjectIds: finalProjectIds
                    };
                    if (targetPermissionGroupId) {
                        inviteData.permissionGroupId = targetPermissionGroupId;
                    }
                    t.set(inviteRef, inviteData);
                });
                transactionSuccess = true;
            }
            catch (e) {
                if (e.message === "COLLISION") {
                    console.log(`[inviteUser] Collision for code ${code}, retrying...`);
                    code = generateCode();
                    attempts++;
                }
                else {
                    throw e; // Rethrow real errors
                }
            }
        }
        if (!transactionSuccess) {
            throw new functions.https.HttpsError('resource-exhausted', 'Failed to generate unique code');
        }
        console.log(`[inviteUser] Success: ${code}`);
        return { success: true, code };
    }
    catch (e) {
        console.error("[inviteUser] CRITICAL ERROR:", e);
        if (e instanceof functions.https.HttpsError) {
            throw e;
        }
        throw new functions.https.HttpsError('internal', `Failed to create invite: ${e.message}`);
    }
});
//# sourceMappingURL=invites.js.map