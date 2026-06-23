/**
 * One-off data fix (2026-06-23):
 *
 * 1. agenda_entries with consultantId = GjkwIyjxsOXxj4OHH5D6KtV0DYt1 ("Consultor pruebas")
 *    were created because a stray agenda_consultants doc named "DANIEL DEL AMO"
 *    pointed at that test account's uid instead of the real Daniel Tenant Admin uid
 *    (6C9ZN0mfngNb5gIAWw1EMSaQcRR2). Reassign them + normalize region to "España".
 * 2. Delete that stray "DANIEL DEL AMO" consultant doc (ZWH0gXLHyfU2bYDMDPKW) and add
 *    "DANIEL DEL AMO" as an alias on the real Daniel Tenant Admin consultant doc, so
 *    future Excel imports using either name resolve correctly.
 * 3. Add "DIEGO SENRA" as an alias on the "DIEGO SENRA LAMBERTI" consultant doc — rows
 *    using the short name were being silently skipped (no matching consultant at all).
 * 4. Dedupe the 3 identical "DANIEL TENANT ADMIN" consultant docs down to 1 (keep the
 *    oldest, IX663KNxxiBrE7gdk5JQ).
 *
 * Run: npx ts-node --esm scripts/fix_daniel_diego_mapping.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount     = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const TENANT_ID = '3';

const DANIEL_REAL_UID    = '6C9ZN0mfngNb5gIAWw1EMSaQcRR2'; // Daniel Tenant Admin
const DANIEL_ORPHAN_UID  = 'GjkwIyjxsOXxj4OHH5D6KtV0DYt1'; // Consultor pruebas (wrong target)
const DANIEL_KEEP_DOC_ID = 'IX663KNxxiBrE7gdk5JQ';
const DANIEL_DUP_DOC_IDS = ['dD075vff5XB9TqeXVsjU', 'xzeeCo5ZqurFqAuP4klv'];
const DANIEL_ORPHAN_DOC_ID = 'ZWH0gXLHyfU2bYDMDPKW';

const DIEGO_DOC_ID = 'GTUR12Xs78KDAo9gVUK1';

async function run() {
    console.log('=== FIX: Daniel del Amo entries + Diego Senra alias + dedupe ===\n');

    // ── 1. Reassign agenda_entries from the orphan uid to Daniel's real uid ──────
    const entriesSnap = await db.collection('agenda_entries')
        .where('tenantId', '==', TENANT_ID)
        .where('consultantId', '==', DANIEL_ORPHAN_UID)
        .get();

    console.log(`agenda_entries to reassign: ${entriesSnap.size}`);

    let batch = db.batch();
    let count = 0;
    for (const docSnap of entriesSnap.docs) {
        batch.update(docSnap.ref, {
            consultantId:    DANIEL_REAL_UID,
            consultantName:  'DANIEL TENANT ADMIN',
            consultantOrder: 1,
            region:          'España',
            updatedAt:       Timestamp.now(),
        });
        count++;
        if (count === 450) {
            await batch.commit();
            console.log(`  Committed batch of ${count}`);
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
        console.log(`  Committed final batch of ${count}`);
    }

    // ── 2. Delete the stray "DANIEL DEL AMO" consultant doc ─────────────────────
    await db.collection('agenda_consultants').doc(DANIEL_ORPHAN_DOC_ID).delete();
    console.log(`\nDeleted stray consultant doc ${DANIEL_ORPHAN_DOC_ID} ("DANIEL DEL AMO" -> wrong uid)`);

    // ── 3. Add aliases to the real consultant docs ───────────────────────────────
    await db.collection('agenda_consultants').doc(DANIEL_KEEP_DOC_ID).update({
        aliases:   ['DANIEL DEL AMO'],
        updatedAt: Timestamp.now(),
    });
    console.log(`Added alias "DANIEL DEL AMO" -> consultant ${DANIEL_KEEP_DOC_ID} (Daniel Tenant Admin)`);

    await db.collection('agenda_consultants').doc(DIEGO_DOC_ID).update({
        aliases:   ['DIEGO SENRA'],
        updatedAt: Timestamp.now(),
    });
    console.log(`Added alias "DIEGO SENRA" -> consultant ${DIEGO_DOC_ID} (Diego Senra Lamberti)`);

    // ── 4. Dedupe the 3 identical "DANIEL TENANT ADMIN" docs ─────────────────────
    for (const dupId of DANIEL_DUP_DOC_IDS) {
        await db.collection('agenda_consultants').doc(dupId).delete();
        console.log(`Deleted duplicate consultant doc ${dupId} ("DANIEL TENANT ADMIN")`);
    }

    console.log('\n=== DONE ===');
}

run().catch(console.error);
