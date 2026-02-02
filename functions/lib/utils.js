"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logUsage = exports.checkUsageLimit = exports.isAiEnabled = exports.getDb = void 0;
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
//# sourceMappingURL=utils.js.map