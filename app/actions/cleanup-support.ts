"use server";

import { adminDb } from "@/lib/firebase-admin";

export async function cleanupSupportDataAction() {
    try {
        console.log("[Server] Cleaning up support tickets and notifications...");

        // 1. Delete all support tickets
        const ticketsSnap = await adminDb.collection("support_tickets").get();
        console.log(`[Server] Found ${ticketsSnap.size} support tickets to delete.`);

        const ticketBatch = adminDb.batch();
        ticketsSnap.docs.forEach(doc => ticketBatch.delete(doc.ref));
        await ticketBatch.commit();

        // 2. Delete notifications related to support
        const notificationsSnap = await adminDb.collection("notifications")
            .where("title", "==", "Nuevo Ticket de Soporte")
            .get();

        console.log(`[Server] Found ${notificationsSnap.size} support notifications to delete.`);

        const notifyBatch = adminDb.batch();
        notificationsSnap.docs.forEach(doc => notifyBatch.delete(doc.ref));
        await notifyBatch.commit();

        // 3. Delete ANY notification that has a link to support-management
        const allNotificationsSnap = await adminDb.collection("notifications").get();
        const supportLinksBatch = adminDb.batch();
        let linkCount = 0;

        allNotificationsSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.link && data.link.includes('support-management')) {
                supportLinksBatch.delete(doc.ref);
                linkCount++;
            }
        });

        if (linkCount > 0) {
            await supportLinksBatch.commit();
        }

        return {
            success: true,
            message: `Deleted ${ticketsSnap.size} tickets and ${notificationsSnap.size + linkCount} notifications.`
        };
    } catch (e: any) {
        console.error("Cleanup Support Error:", e);
        return { success: false, error: e.message };
    }
}
