
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require(path.join(process.cwd(), 'serviceAccountKey.json'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function validateV13() {
    console.log('🔍 Starting V13 Data Validation...');

    try {
        const snapshot = await db.collection('tasks').get();
        let errors: string[] = [];
        let validCount = 0;

        snapshot.docs.forEach(doc => {
            const t = doc.data();
            const id = doc.id;
            const fid = t.friendlyId || id;

            // 1. Check Existence of Shadow Fields
            if (!t.progressV13) errors.push(`[${fid}] Missing progressV13`);
            if (!t.type) errors.push(`[${fid}] Missing type`);
            if (t.order === undefined || isNaN(t.order)) errors.push(`[${fid}] Invalid order: ${t.order}`);
            if (!Array.isArray(t.ancestorIds)) errors.push(`[${fid}] Missing/Invalid ancestorIds`);

            // 2. Data Integrity Check (Legacy vs V13)
            const legacyVal = typeof t.progress === 'number' ? t.progress : (t.progress?.actual || 0);
            if (t.progressV13 && t.progressV13.actual !== legacyVal) {
                errors.push(`[${fid}] Progress Mismatch! Legacy: ${legacyVal}, V13: ${t.progressV13.actual}`);
            }

            // 3. Hierarchy Rules
            if (t.ancestorIds && t.ancestorIds.length > 0 && !t.parentId) {
                errors.push(`[${fid}] Inconsistent: Has ancestors but NO parentId`);
            }
            if (t.parentId && (!t.ancestorIds || t.ancestorIds.length === 0)) {
                // Technically this could happen if parent is Top Level, but usually parent implies ancestors check
                // For V1 (Flat), parentId should be null.
                // If migration just ran, parentId should be undefined/null.
            }

            // If no errors for this doc
            if (errors.length === 0 || errors[errors.length - 1].startsWith('[' + fid) === false) {
                validCount++;
            }
        });

        console.log(`📊 Validation Results:`);
        console.log(`   Total Docs: ${snapshot.size}`);
        console.log(`   Valid V13 Docs: ${validCount}`);

        if (errors.length > 0) {
            console.error(`❌ Found ${errors.length} errors:`);
            errors.slice(0, 20).forEach(e => console.error('   ' + e));
            if (errors.length > 20) console.error(`   ...and ${errors.length - 20} more.`);
            process.exit(1);
        } else {
            console.log('✅ All checks passed! Data is ready for V13 Codebase.');
        }

    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
}

validateV13();
