import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getDb } from "./utils";

const db = getDb();

export const submitSupport = functions.https.onCall(async (data, context) => {
    // Auth check optional for support? Usually good to have.
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

    const { userId, userName, userEmail, tenantId, message, context: msgContext } = data;

    try {
        // 1. Create Ticket
        const ticketRef = await db.collection("support_tickets").add({
            userId,
            userName,
            userEmail,
            tenantId,
            message,
            context: msgContext,
            status: 'open',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Notify Admins
        const adminsSnap = await db.collection("users")
            .where("role", "==", "superadmin")
            .get();

        const notifications = adminsSnap.docs.map(adminDoc => {
            return db.collection("notifications").add({
                userId: adminDoc.id,
                tenantId: tenantId,
                type: 'system',
                title: 'New Support Ticket',
                message: `User ${userName} (${userEmail}) has sent a support request.`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                link: `/?view=support-management`
            });
        });

        await Promise.all(notifications);
        return { success: true, ticketId: ticketRef.id };
    } catch (e: any) {
        throw new functions.https.HttpsError('internal', "Failed to submit support: " + e.message);
    }
});
