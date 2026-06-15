const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function runCleanup() {
    console.log("=== STARTING AGENDA CONSULTANTS CLEANUP ===");
    
    // 1. Fetch all users
    const usersSnap = await db.collection('users').get();
    const userMap = new Map();
    usersSnap.docs.forEach(doc => {
        userMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    // 2. Fetch all agenda_consultants
    const consultantsSnap = await db.collection('agenda_consultants').get();
    const consultants = consultantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Group consultants by tenantId and userId
    const grouped = new Map(); // tenantId::userId -> list of docs
    consultants.forEach(c => {
        if (!c.isActive) return; // skip already inactive ones
        const key = `${c.tenantId}::${c.userId}`;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key).push(c);
    });
    
    const batch = db.batch();
    let updatesCount = 0;
    
    for (const [key, docs] of grouped.entries()) {
        const [tenantId, userId] = key.split('::');
        const user = userMap.get(userId);
        
        if (!user) {
            console.log(`⚠️ Consultant doc has no matching user. Deactivating: ${docs.map(d => d.id).join(', ')}`);
            docs.forEach(d => {
                batch.update(db.collection('agenda_consultants').doc(d.id), { isActive: false });
                updatesCount++;
            });
            continue;
        }
        
        const role = (user.role || '').toLowerCase();
        const isAllowedRole = ['consultant', 'consultor', 'team_member', 'usuario_base'].includes(role);
        
        if (!isAllowedRole) {
            console.log(`🚫 User ${user.email} has role '${user.role}' which is not a consultant/team member. Deactivating docs: ${docs.map(d => d.id).join(', ')}`);
            docs.forEach(d => {
                batch.update(db.collection('agenda_consultants').doc(d.id), { isActive: false });
                updatesCount++;
            });
            continue;
        }
        
        // If there are duplicates
        if (docs.length > 1) {
            console.log(`👥 Duplicate active docs found for user ${user.email} (tenant ${tenantId}):`);
            
            // Sort: prefer doc with non-empty region, then by doc ID or date
            const sorted = [...docs].sort((a, b) => {
                const aHasReg = !!(a.region || '').trim();
                const bHasReg = !!(b.region || '').trim();
                if (aHasReg !== bHasReg) {
                    return aHasReg ? -1 : 1; // non-empty region first
                }
                return a.id.localeCompare(b.id);
            });
            
            const keepDoc = sorted[0];
            const discardDocs = sorted.slice(1);
            
            console.log(`   Keeping: DocID=${keepDoc.id} Region='${keepDoc.region}'`);
            discardDocs.forEach(d => {
                console.log(`   Deactivating: DocID=${d.id} Region='${d.region}'`);
                batch.update(db.collection('agenda_consultants').doc(d.id), { isActive: false });
                updatesCount++;
            });
        }
    }
    
    if (updatesCount > 0) {
        await batch.commit();
        console.log(`🎉 Successfully deactivated ${updatesCount} redundant/invalid consultant entries.`);
    } else {
        console.log("✅ No redundant or invalid consultant entries found to clean up.");
    }
}

runCleanup().catch(err => {
    console.error("Cleanup failed:", err);
});
