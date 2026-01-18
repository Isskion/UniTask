const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Try to correct the double extension if needed, or check both
// Direct import for production deployment
const serviceAccount = require("../serviceAccountKey-prod.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "minuta-f75a4"
    });
}

async function deployRules() {
    console.log("🚀 Starting Firestore Rules Deployment via Admin SDK...");

    const rulesPath = path.join(__dirname, '../firestore.rules');
    if (!fs.existsSync(rulesPath)) {
        console.error("❌ Error: firestore.rules file not found!");
        process.exit(1);
    }

    let content = fs.readFileSync(rulesPath, 'utf8');

    // Admin SDK sometimes dislikes 'rules_version' or Windows line endings in the payload
    // Strip version header if present
    content = content.replace(/rules_version = '2';\s*/, '');

    // Normalize line endings to \n
    content = content.replace(/\r\n/g, '\n');

    const rulesService = admin.securityRules();

    try {
        console.log("1. Creating new Ruleset...");
        const ruleset = await rulesService.createRuleset({
            source: {
                files: [{
                    name: 'firestore.rules',
                    content: content
                }]
            }
        });
        console.log(`   ✅ Ruleset created: ${ruleset.name}`);

        console.log("2. Releasing Ruleset to Cloud Firestore...");
        // This releases to the default database
        await rulesService.releaseFirestoreRuleset(ruleset.name);

        console.log("✅ SUCCESS: Rules deployed and active!");
    } catch (error) {
        console.error("❌ Deployment Failed:", error);
        console.error(JSON.stringify(error, null, 2));
    }
}

deployRules();
