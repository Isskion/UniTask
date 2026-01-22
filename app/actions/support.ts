"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

interface SupportSubmission {
    userId: string;
    userName: string;
    userEmail: string;
    tenantId: string;
    message: string;
    context: string;
}

export async function submitSupportAction(data: SupportSubmission) {
    try {
        console.log(`[Server] Submitting support ticket for ${data.userEmail}`);

        // 1. Create the Ticket
        const ticketRef = await adminDb.collection("support_tickets").add({
            ...data,
            status: 'open',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        // 2. Notify Superadmins (Role Level 100)
        // Find all users with roleLevel 100
        const superadminsSnap = await adminDb.collection("users")
            .where("roleLevel", "==", 100)
            .get();

        // Fallback to role "superadmin" if no level 100 users found (though they should have level 100)
        let adminsToNotify = superadminsSnap.docs;
        if (adminsToNotify.length === 0) {
            const fallbackSnap = await adminDb.collection("users")
                .where("role", "==", "superadmin")
                .get();
            adminsToNotify = fallbackSnap.docs;
        }

        console.log(`[Server] Found ${adminsToNotify.length} admins to notify.`);
        const notifications = adminsToNotify.map(adminDoc => {
            console.log(`[Server] Notifying admin: ${adminDoc.id} (${adminDoc.data().email})`);
            return adminDb.collection("notifications").add({
                userId: adminDoc.id,
                tenantId: data.tenantId, // Use the same tenantId as the ticket
                type: 'system',
                title: 'New Support Ticket',
                message: `User ${data.userName} (${data.userEmail}) has sent a support request from ${data.context}.`,
                read: false,
                createdAt: FieldValue.serverTimestamp(),
                link: `/?view=support-management`
            });
        });

        await Promise.all(notifications);

        return { success: true, ticketId: ticketRef.id };
    } catch (e: any) {
        console.error("Server Action submitSupport error:", e);
        return { success: false, error: e.message };
    }
}
