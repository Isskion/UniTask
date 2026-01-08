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

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

export const processUserClaims = functions.auth.user().onCreate(async (user) => {
    console.log(`[processUserClaims] Processing new user: ${user.email}`);

    try {
        // 1. Check if user is in admin whitelist
        const adminDoc = await db.collection('system_config').doc('admins').get();
        const allowedEmails: string[] = adminDoc.exists
            ? (adminDoc.data()?.emails || []).map((e: string) => e.toLowerCase())
            : [];

        let customClaims: { role: string; tenantId: string; isActive: boolean };

        if (user.email && allowedEmails.includes(user.email.toLowerCase())) {
            // Superadmin: System-level access
            console.log(`[processUserClaims] Superadmin detected: ${user.email}`);
            customClaims = {
                role: 'superadmin',
                tenantId: 'SYSTEM',
                isActive: true
            };
        } else {
            // Regular user: Assign to default tenant
            // TODO: Implement invite-based tenant assignment
            const tenantId = await resolveTenantForUser(user);
            console.log(`[processUserClaims] Regular user assigned to tenant: ${tenantId}`);
            customClaims = {
                role: 'usuario_base',
                tenantId: tenantId,
                isActive: false // Pending approval by admin
            };
        }

        // 2. Set immutable Custom Claims in JWT
        await admin.auth().setCustomUserClaims(user.uid, customClaims);
        console.log(`[processUserClaims] Claims set for ${user.uid}:`, customClaims);

        // 3. Create/Update user profile in Firestore
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: customClaims.role,
            tenantId: customClaims.tenantId,
            isActive: customClaims.isActive,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`[processUserClaims] User profile created/updated for ${user.uid}`);

    } catch (error) {
        console.error(`[processUserClaims] Error processing user ${user.uid}:`, error);
        throw error;
    }
});

/**
 * Resolves which tenant a new user should be assigned to.
 * 
 * Priority:
 * 1. Invite code (if present in custom data - not implemented yet)
 * 2. Email domain matching
 * 3. Default tenant '1'
 */
async function resolveTenantForUser(user: admin.auth.UserRecord): Promise<string> {
    // TODO: Check for invite code in user metadata or Firestore
    // TODO: Check for email domain matching a tenant

    // Default: Assign to tenant '1'
    return '1';
}

/**
 * Optional: Cloud Function to update claims when admin changes user role.
 * Call this from the client when UserManagement updates a user's role.
 */
export const updateUserClaims = functions.https.onCall(async (data, context) => {
    // Verify caller is superadmin
    if (!context.auth?.token.role || context.auth.token.role !== 'superadmin') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only superadmins can update user claims'
        );
    }

    const { targetUserId, newRole, newTenantId } = data;

    if (!targetUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'targetUserId is required');
    }

    // Get current claims
    const targetUser = await admin.auth().getUser(targetUserId);
    const currentClaims = targetUser.customClaims || {};

    // Update claims
    const updatedClaims = {
        ...currentClaims,
        ...(newRole && { role: newRole }),
        ...(newTenantId && { tenantId: newTenantId })
    };

    await admin.auth().setCustomUserClaims(targetUserId, updatedClaims);

    // Sync to Firestore profile
    await db.collection('users').doc(targetUserId).update({
        role: updatedClaims.role,
        tenantId: updatedClaims.tenantId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[updateUserClaims] Updated claims for ${targetUserId}:`, updatedClaims);

    return { success: true, claims: updatedClaims };
});
