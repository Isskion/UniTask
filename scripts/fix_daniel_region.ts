/**
 * Fixes agenda_entries imported yesterday for Daniel del Amo that were
 * incorrectly assigned region='Francia'. Updates them to region='España'.
 *
 * Also corrects the AgendaConsultant document's primary region to 'España'
 * so future imports default to the right region.
 *
 * Run: npx ts-node --esm scripts/fix_daniel_region.ts
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

const DANIEL_UID  = '6C9ZN0mfngNb5gIAWw1EMSaQcRR2';
const TENANT_ID   = '3';
const OLD_REGION  = 'Francia';
const NEW_REGION  = 'España';

// Yesterday: 2026-05-26 (all entries created that day)
const YESTERDAY_START = new Date('2026-05-26T00:00:00.000Z');
const YESTERDAY_END   = new Date('2026-05-27T00:00:00.000Z');

async function fixDanielRegion() {
    console.log('=== FIX: Daniel del Amo agenda entries region Francia → España ===\n');

    // ── 1. Fix agenda_entries ──────────────────────────────────────────────────

    const entriesRef = db.collection('agenda_entries');
    const q = entriesRef
        .where('tenantId',     '==', TENANT_ID)
        .where('consultantId', '==', DANIEL_UID)
        .where('region',       '==', OLD_REGION)
        .where('importedFromExcel', '==', true)
        .where('createdAt',    '>=', Timestamp.fromDate(YESTERDAY_START))
        .where('createdAt',    '<',  Timestamp.fromDate(YESTERDAY_END));

    const snap = await q.get();
    console.log(`Found ${snap.size} entries to fix.`);

    if (snap.size === 0) {
        console.log('Nothing to update in agenda_entries.');
    } else {
        // Batch updates (max 500 per batch)
        let batch = db.batch();
        let count = 0;
        let total = 0;

        for (const docSnap of snap.docs) {
            batch.update(docSnap.ref, {
                region:    NEW_REGION,
                updatedAt: Timestamp.now(),
            });
            count++;
            total++;

            if (count === 490) {
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

        console.log(`\nagenda_entries updated: ${total}`);
    }

    // ── 2. Fix AgendaConsultant primary region ─────────────────────────────────

    const consultantsRef = db.collection('agenda_consultants');
    const consultantSnap = await consultantsRef
        .where('tenantId', '==', TENANT_ID)
        .where('userId',   '==', DANIEL_UID)
        .get();

    if (consultantSnap.empty) {
        console.warn('\nWARNING: No AgendaConsultant document found for Daniel. Skipping consultant fix.');
    } else {
        for (const cDoc of consultantSnap.docs) {
            const data = cDoc.data();
            console.log(`\nConsultant doc: ${cDoc.id}`);
            console.log(`  Current region: "${data.region}", regions: ${JSON.stringify(data.regions)}`);

            await cDoc.ref.update({
                region:    NEW_REGION,
                updatedAt: Timestamp.now(),
            });
            console.log(`  Updated primary region → "${NEW_REGION}"`);
        }
    }

    console.log('\n=== DONE ===');
}

fixDanielRegion().catch(console.error);
