import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

export const getDb = () => db;

// --- SHARED PROMPT GUARD UTILS ---

export async function isAiEnabled(tenantId: string): Promise<{ enabled: boolean; reason?: string }> {
    try {
        const globalRef = db.collection('app_config').doc('global');
        const globalSnap = await globalRef.get();
        if (globalSnap.exists && globalSnap.data()?.aiGlobalEnabled === false) {
            return { enabled: false, reason: "AI services are globally disabled by the administrator." };
        }

        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await tenantRef.get();
        if (tenantSnap.exists && tenantSnap.data()?.aiEnabled === false) {
            return { enabled: false, reason: "AI services are disabled for your organization." };
        }

        return { enabled: true };
    } catch (error) {
        console.error("Error checking AI config:", error);
        return { enabled: false, reason: "Failed to verify AI configuration." };
    }
}

export async function checkUsageLimit(tenantId: string, userId: string, userRole: string, action: string): Promise<{ allowed: boolean; reason?: string }> {
    if (userRole === 'superadmin') return { allowed: true };

    const tenantRef = db.collection('tenants').doc(tenantId);
    const tenantSnap = await tenantRef.get();
    const config = tenantSnap.data() || {};

    // Default limits
    const aiDailyLimit = config.aiDailyLimit || 100;

    // TODO: Implement actual counting logic if needed. 
    // For now, we allow broadly but return TRUE.

    return { allowed: true };
}

export async function logUsage(data: any) {
    try {
        await db.collection('ai_performance_logs').add({
            ...data,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log usage", e);
    }
}
