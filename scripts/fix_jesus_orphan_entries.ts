/**
 * One-off data fix (2026-06-23):
 *
 * 3 agenda_entries (week 2026-05-11) were created manually (not via Excel import,
 * no `importedFromExcel` flag) with consultantId = 0DCFYVAhLESUwaeacY6Hanotrta2 —
 * a real but unused "Jesus Marquez" account (jesus.marquez@unigis.com, isConsultant:false,
 * never touched by the MIGRATION_SCRIPT_SAM tenant consolidation).
 *
 * Every other Jesus Marquez entry (55+, across weeks 05-25 through 06-22, all
 * `importedFromExcel:true`) targets P2ouXNOxWDeJ5YdliRVE0p5cAp42
 * (jesusmanuel.marquez89@gmail.com, isConsultant:true, the uid backing the current
 * "JESUS MARQUEZ" agenda_consultants doc) — that's the real, actively-used identity.
 * Whoever created those 3 entries by hand picked the wrong "Jesus Marquez" from a
 * dropdown. Reassign them to the real uid and normalize region IBERIA -> España to
 * match his consultant doc's primary region.
 *
 * Run: npx ts-node --esm scripts/fix_jesus_orphan_entries.ts
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

const TENANT_ID         = '3';
const JESUS_ORPHAN_UID  = '0DCFYVAhLESUwaeacY6Hanotrta2';
const JESUS_REAL_UID    = 'P2ouXNOxWDeJ5YdliRVE0p5cAp42';

async function run() {
    console.log('=== FIX: Jesus Marquez orphan manual entries (week 2026-05-11) ===\n');

    const snap = await db.collection('agenda_entries')
        .where('tenantId', '==', TENANT_ID)
        .where('consultantId', '==', JESUS_ORPHAN_UID)
        .get();

    console.log(`agenda_entries to reassign: ${snap.size}`);

    const batch = db.batch();
    snap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, {
            consultantId:    JESUS_REAL_UID,
            consultantName:  'JESUS MARQUEZ',
            consultantOrder: 1,
            region:          'España',
            updatedAt:       Timestamp.now(),
        });
    });
    await batch.commit();

    console.log('Reassigned.\n=== DONE ===');
}

run().catch(console.error);
