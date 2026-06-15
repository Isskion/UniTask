const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function hardDeleteDuplicates() {
    console.log("=== STARTING HARD DELETE OF DUPLICATE CONSULTANTS ===");
    
    const snap = await db.collection('agenda_consultants').get();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Group by tenantId + Normalized Name (to catch different UIDs for the same person)
    const grouped = new Map();
    docs.forEach(c => {
        const name = (c.name || '').trim().toLowerCase();
        const key = `${c.tenantId}::${name}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(c);
    });
    
    const batch = db.batch();
    let deletedCount = 0;
    
    for (const [key, groupDocs] of grouped.entries()) {
        if (groupDocs.length > 1) {
            console.log(`\nFound ${groupDocs.length} duplicates for ${key}:`);
            
            // Sort to find the "best" one to keep.
            // 1. Prefer isActive: true
            // 2. Prefer non-empty region
            // 3. Prefer older sortOrder
            groupDocs.sort((a, b) => {
                if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
                const aReg = !!(a.region || '').trim();
                const bReg = !!(b.region || '').trim();
                if (aReg !== bReg) return aReg ? -1 : 1;
                return (a.sortOrder || 0) - (b.sortOrder || 0);
            });
            
            const keep = groupDocs[0];
            const toDelete = groupDocs.slice(1);
            
            console.log(`  KEEPING: [${keep.id}] UID:${keep.userId} Region:${keep.region} Active:${keep.isActive}`);
            
            toDelete.forEach(d => {
                console.log(`  DELETING: [${d.id}] UID:${d.userId} Region:${d.region} Active:${d.isActive}`);
                batch.delete(db.collection('agenda_consultants').doc(d.id));
                deletedCount++;
            });
        }
    }
    
    if (deletedCount > 0) {
        await batch.commit();
        console.log(`\n🎉 Successfully hard deleted ${deletedCount} duplicate records.`);
    } else {
        console.log("\n✅ No duplicates found.");
    }
}

hardDeleteDuplicates().catch(console.error);
