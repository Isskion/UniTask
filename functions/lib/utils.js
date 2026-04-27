"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAiRetry = exports.sanitizeGraphForAI = exports.logUsage = exports.checkUsageLimit = exports.isAiEnabled = exports.getDb = void 0;
const admin = require("firebase-admin");
let dbInstance = null;
const getDb = () => {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    if (!dbInstance) {
        dbInstance = admin.firestore();
    }
    return dbInstance;
};
exports.getDb = getDb;
// --- SHARED PROMPT GUARD UTILS ---
async function isAiEnabled(tenantId) {
    var _a, _b;
    try {
        const db = (0, exports.getDb)();
        const globalRef = db.collection('app_config').doc('global');
        const globalSnap = await globalRef.get();
        if (globalSnap.exists && ((_a = globalSnap.data()) === null || _a === void 0 ? void 0 : _a.aiGlobalEnabled) === false) {
            return { enabled: false, reason: "AI services are globally disabled by the administrator." };
        }
        const tenantRef = db.collection('tenants').doc(tenantId);
        const tenantSnap = await tenantRef.get();
        if (tenantSnap.exists && ((_b = tenantSnap.data()) === null || _b === void 0 ? void 0 : _b.aiEnabled) === false) {
            return { enabled: false, reason: "AI services are disabled for your organization." };
        }
        return { enabled: true };
    }
    catch (error) {
        console.error("Error checking AI config:", error);
        return { enabled: false, reason: "Failed to verify AI configuration." };
    }
}
exports.isAiEnabled = isAiEnabled;
async function checkUsageLimit(tenantId, userId, userRole, action) {
    if (userRole === 'superadmin')
        return { allowed: true };
    const db = (0, exports.getDb)();
    const tenantRef = db.collection('tenants').doc(tenantId);
    const tenantSnap = await tenantRef.get();
    const config = tenantSnap.data() || {};
    // Default limits
    const aiDailyLimit = config.aiDailyLimit || 100;
    // TODO: Implement actual counting logic if needed. 
    // For now, we allow broadly but return TRUE.
    return { allowed: true };
}
exports.checkUsageLimit = checkUsageLimit;
async function logUsage(data) {
    try {
        const db = (0, exports.getDb)();
        await db.collection('ai_performance_logs').add(Object.assign(Object.assign({}, data), { timestamp: admin.firestore.FieldValue.serverTimestamp() }));
    }
    catch (e) {
        console.error("Failed to log usage", e);
    }
}
exports.logUsage = logUsage;
/**
 * Sanitizes a FlowGraph to reduce token usage.
 * Removes visual noise like styles, z-index, and precise positions.
 */
function sanitizeGraphForAI(graph) {
    if (!graph)
        return null;
    return Object.assign(Object.assign({}, graph), { nodes: (graph.nodes || []).map((n) => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign(Object.assign({ id: n.id, type: n.type || ((_a = n.data) === null || _a === void 0 ? void 0 : _a.type), label: n.label || ((_b = n.data) === null || _b === void 0 ? void 0 : _b.label), parentId: n.parentId, 
                // Only keep rough positions to save tokens
                position: n.position ? { x: Math.round(n.position.x), y: Math.round(n.position.y) } : undefined }, (((_c = n.data) === null || _c === void 0 ? void 0 : _c.technology) ? { technology: n.data.technology } : {})), (((_d = n.data) === null || _d === void 0 ? void 0 : _d.description) ? { description: n.data.description } : {})), (((_e = n.data) === null || _e === void 0 ? void 0 : _e.external) !== undefined ? { external: n.data.external } : {})));
        }), edges: (graph.edges || []).map((e) => {
            var _a;
            return ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label,
                condition: e.condition || ((_a = e.data) === null || _a === void 0 ? void 0 : _a.condition)
            });
        }) });
}
exports.sanitizeGraphForAI = sanitizeGraphForAI;
/**
 * Utility to wrap AI calls with exponential backoff and retry logic.
 * Specifically handles 429 (Rate Limit / Resource Exhausted) errors.
 */
async function withAiRetry(fn, maxRetries = 3, initialDelay = 2000) {
    let lastError;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            const errorMessage = error.message || "";
            const isRateLimit = errorMessage.includes("429") ||
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
exports.withAiRetry = withAiRetry;
//# sourceMappingURL=utils.js.map