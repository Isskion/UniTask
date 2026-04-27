import * as admin from "firebase-admin";

let dbInstance: admin.firestore.Firestore | null = null;

export const getDb = () => {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    if (!dbInstance) {
        dbInstance = admin.firestore();
    }
    return dbInstance;
};

// --- SHARED PROMPT GUARD UTILS ---

export async function isAiEnabled(tenantId: string): Promise<{ enabled: boolean; reason?: string }> {
    try {
        const db = getDb();
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

    const db = getDb();
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
        const db = getDb();
        await db.collection('ai_performance_logs').add({
            ...data,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log usage", e);
    }
}

/**
 * Sanitizes a FlowGraph to reduce token usage.
 * Removes visual noise like styles, z-index, and precise positions.
 */
export function sanitizeGraphForAI(graph: any) {
    if (!graph) return null;
    
    return {
        ...graph,
        nodes: (graph.nodes || []).map((n: any) => ({
            id: n.id,
            type: n.type || n.data?.type,
            label: n.label || n.data?.label,
            parentId: n.parentId,
            // Only keep rough positions to save tokens
            position: n.position ? { x: Math.round(n.position.x), y: Math.round(n.position.y) } : undefined,
            // Data fields specific to business logic, but no styles
            ...(n.data?.technology ? { technology: n.data.technology } : {}),
            ...(n.data?.description ? { description: n.data.description } : {}),
            ...(n.data?.external !== undefined ? { external: n.data.external } : {}),
        })),
        edges: (graph.edges || []).map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            condition: e.condition || e.data?.condition
        }))
    };
}

/**
 * Utility to wrap AI calls with exponential backoff and retry logic.
 * Specifically handles 429 (Rate Limit / Resource Exhausted) errors.
 */
export async function withAiRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 2000
): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            const errorMessage = error.message || "";
            const isRateLimit =
                errorMessage.includes("429") ||
                errorMessage.includes("Too Many Requests") ||
                errorMessage.includes("Resource exhausted") ||
                error.status === 429;

            if (!isRateLimit || i === maxRetries) {
                throw error;
            }

            const delay = (initialDelay * Math.pow(2, i)) + (Math.random() * 500);
            const apiKey = process.env.GEMINI_API_KEY || "";
            const keySnippet = apiKey ? `...${apiKey.slice(-4)}` : "MISSING";
            
            console.warn(`[Functions AI Retry] Attempt ${i + 1} failed (429). Key: ${keySnippet}. Retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
