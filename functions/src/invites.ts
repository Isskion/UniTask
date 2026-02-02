import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getDb } from "./utils"; // Ensure utils exports getDb or we call admin.firestore()

// Re-using admin instance
// const db = getDb(); // REMOVED: Global init causes crash


function generateCode(length = 8): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getRoleLevelNum(role: string): number {
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

export const inviteUser = functions
    .region('europe-west1')
    .https.onCall(async (data: any, context: functions.https.CallableContext) => {
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
            const db = getDb(); // Lazy load to ensure init

            // Get Creator Role (Trust Custom Claims!)
            const creatorRole = token.role || 'usuario_externo';
            let finalCreatorRole = creatorRole;

            // Fallback check if claim missing
            if (!token.role) {
                console.log("[inviteUser] No role claim, checking DB...");
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) finalCreatorRole = userDoc.data()?.role;
            }

            const creatorLevel = getRoleLevelNum(finalCreatorRole as string);
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
                if (!doc.exists) break;
                console.log("[inviteUser] Collision detected, retrying...");
                code = generateCode();
                attempts++;
                if (attempts === 3) collision = true;
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

        } catch (e: any) {
            console.error("[inviteUser] CRITICAL ERROR:", e);
            // Ensure we pass meaningful message if it's already HttpsError
            if (e instanceof functions.https.HttpsError) {
                throw e;
            }
            throw new functions.https.HttpsError('internal', `Failed to create invite: ${e.message}`);
        }
    });
