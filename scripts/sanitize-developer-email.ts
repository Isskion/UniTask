/**
 * Database Sanitization Script: Remove Developer Email References
 * 
 * Target: daniel.delamo@unigis.com
 * Areas: projects (email, connections, environments), project_interfaces
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin (Assumes standard service account or ADC)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
const FORBIDDEN_EMAIL = "daniel.delamo@unigis.com".toLowerCase();
const DRY_RUN = process.env.DRY_RUN !== 'false';

async function sanitizeProjects() {
    console.log(`\n📦 Sanitizing 'projects' collection...`);
    const snapshot = await db.collection("projects").get();
    let updatedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let needsUpdate = false;
        const updatePayload: any = {};

        // 1. Root email
        if (data.email?.toLowerCase() === FORBIDDEN_EMAIL) {
            updatePayload.email = "";
            needsUpdate = true;
        }

        // 2. Connections object
        if (data.connections) {
            const conn = { ...data.connections };
            if (conn.prodUser?.toLowerCase() === FORBIDDEN_EMAIL) {
                conn.prodUser = "";
                needsUpdate = true;
            }
            if (conn.testUser?.toLowerCase() === FORBIDDEN_EMAIL) {
                conn.testUser = "";
                needsUpdate = true;
            }
            if (needsUpdate) updatePayload.connections = conn;
        }

        // 3. Environments array
        if (Array.isArray(data.environments)) {
            let envsChanged = false;
            const newEnvs = data.environments.map((env: any) => {
                if (env.user?.toLowerCase() === FORBIDDEN_EMAIL) {
                    envsChanged = true;
                    return { ...env, user: "" };
                }
                return env;
            });
            if (envsChanged) {
                updatePayload.environments = newEnvs;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            console.log(`   [MATCH] Project: ${data.name || doc.id} (Tenant: ${data.tenantId})`);
            if (!DRY_RUN) {
                await doc.ref.update(updatePayload);
            }
            updatedCount++;
        }
    }
    console.log(`   ${DRY_RUN ? '[DRY RUN] Would update' : '✅ Updated'} ${updatedCount} projects.`);
}

async function sanitizeInterfaces() {
    console.log(`\n📦 Sanitizing 'project_interfaces' collection...`);
    const snapshot = await db.collection("project_interfaces").get();
    let updatedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let needsUpdate = false;
        const updatePayload: any = {};

        // clientId often used for user/email
        if (data.clientId?.toLowerCase() === FORBIDDEN_EMAIL) {
            updatePayload.clientId = "";
            needsUpdate = true;
        }

        if (needsUpdate) {
            console.log(`   [MATCH] Interface: ${data.name || doc.id} (Tenant: ${data.tenantId})`);
            if (!DRY_RUN) {
                await doc.ref.update(updatePayload);
            }
            updatedCount++;
        }
    }
    console.log(`   ${DRY_RUN ? '[DRY RUN] Would update' : '✅ Updated'} ${updatedCount} interfaces.`);
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   PLATFORM SANITIZATION SCRIPT (DEVELOPER CREDENTIALS)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Target Email: ${FORBIDDEN_EMAIL}`);
    console.log(`   Mode:         ${DRY_RUN ? '🔍 DRY RUN (No changes)' : '🚀 LIVE EXECUTION'}`);
    console.log('═══════════════════════════════════════════════════════════════');

    try {
        await sanitizeProjects();
        await sanitizeInterfaces();
        console.log('\n✅ Process complete.');
    } catch (error) {
        console.error('\n❌ Sanitization failed:', error);
        process.exit(1);
    }
}

main();
