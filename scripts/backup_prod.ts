import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import serviceAccount from '../serviceAccountKey.json.json';

// Ensure we are NOT using the emulator for this script (we want PROD)
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (!admin.apps.length) {
    admin.initializeApp({
        // @ts-ignore
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

const COLLECTIONS = [
    'users',
    'tenants',
    'projects',
    'tasks',
    'weekly_entries',
    'journal_entries'
];

async function backup() {
    console.log("📦 Starting Production Backup...");
    console.log("   Target: data/prod_dump.json");

    const dump: Record<string, any> = {};

    for (const colName of COLLECTIONS) {
        console.log(`   - Fetching ${colName}...`);
        const snap = await db.collection(colName).get();
        dump[colName] = {};

        snap.forEach(doc => {
            let data = doc.data();

            // Convert timestamps to ISO strings for JSON serialization
            // (We will need to convert them back on import)
            for (const key in data) {
                if (data[key] instanceof admin.firestore.Timestamp) {
                    data[key] = {
                        _type: 'timestamp',
                        seconds: data[key].seconds,
                        nanoseconds: data[key].nanoseconds
                    };
                }
            }
            dump[colName][doc.id] = data;
        });
        console.log(`     Saved ${snap.size} documents.`);
    }

    const dumpPath = path.join(__dirname, '../data/prod_dump.json');

    // Ensure data dir exists
    if (!fs.existsSync(path.dirname(dumpPath))) {
        fs.mkdirSync(path.dirname(dumpPath));
    }

    fs.writeFileSync(dumpPath, JSON.stringify(dump, null, 2));
    console.log("✅ Backup Complete!");
}

backup().catch(console.error);
