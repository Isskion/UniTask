/**
 * Migration Script: Assign tenantId to legacy journal entries
 * 
 * This script:
 * 1. Finds journal entries without tenantId
 * 2. Determines the tenant from the projects inside the entry
 * 3. Updates the entry with the correct tenantId
 * 4. Creates a new document with format {tenantId}_{date}
 * 5. Deletes the old legacy document
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

// Firebase config (same as your app)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Project {
    id: string;
    tenantId?: string;
    [key: string]: any;
}

interface JournalEntry {
    date: string;
    projects: Project[];
    tenantId?: string;
    [key: string]: any;
}

async function migrateJournalEntries() {
    console.log('🚀 Starting migration of legacy journal entries...\n');

    try {
        // 1. Get all journal entries
        const entriesRef = collection(db, 'journal_entries');
        const snapshot = await getDocs(entriesRef);

        console.log(`📦 Found ${snapshot.size} total journal entries`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const docSnap of snapshot.docs) {
            const entryId = docSnap.id;
            const entry = docSnap.data() as JournalEntry;

            // Skip if already has tenantId and follows new format
            if (entry.tenantId && entryId.includes('_')) {
                console.log(`⏭️  Skipping ${entryId} (already migrated)`);
                skippedCount++;
                continue;
            }

            console.log(`\n📝 Processing entry: ${entryId}`);

            // 2. Determine tenant from projects
            let determinedTenantId: string | null = null;

            if (entry.projects && entry.projects.length > 0) {
                // Get first project's tenantId
                const firstProject = entry.projects[0];

                if (firstProject.id) {
                    // Fetch project document to get its tenantId
                    const projectDoc = await getDoc(doc(db, 'projects', firstProject.id));
                    if (projectDoc.exists()) {
                        const projectData = projectDoc.data();
                        determinedTenantId = projectData.tenantId || '1';
                        console.log(`   ✓ Determined tenant from project: ${determinedTenantId}`);
                    } else {
                        console.log(`   ⚠️  Project ${firstProject.id} not found, defaulting to tenant 1`);
                        determinedTenantId = '1';
                    }
                } else {
                    console.log(`   ⚠️  Project has no ID, defaulting to tenant 1`);
                    determinedTenantId = '1';
                }
            } else {
                console.log(`   ⚠️  No projects in entry, defaulting to tenant 1`);
                determinedTenantId = '1';
            }

            // 3. Create new document with correct format
            const newDocId = `${determinedTenantId}_${entry.date}`;
            const updatedEntry = {
                ...entry,
                tenantId: determinedTenantId
            };

            try {
                // Check if new document already exists
                const newDocRef = doc(db, 'journal_entries', newDocId);
                const existingDoc = await getDoc(newDocRef);

                if (existingDoc.exists()) {
                    console.log(`   ⚠️  Document ${newDocId} already exists, skipping migration`);
                    skippedCount++;
                    continue;
                }

                // Create new document
                await setDoc(newDocRef, updatedEntry);
                console.log(`   ✅ Created new document: ${newDocId}`);

                // Delete old document only if it has different ID
                if (entryId !== newDocId) {
                    await deleteDoc(doc(db, 'journal_entries', entryId));
                    console.log(`   🗑️  Deleted legacy document: ${entryId}`);
                }

                migratedCount++;
            } catch (error) {
                console.error(`   ❌ Error migrating ${entryId}:`, error);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${migratedCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration
migrateJournalEntries()
    .then(() => {
        console.log('✨ Migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    });
