
const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Use Client SDK style for rules testing?
// Backend bypasses rules.
// But I can simulate a user context? 
// No, I cannot simulate Rules locally without emulator suite running.
// BUT, I can see from firestore.rules that match /tenants/{tenantId}/knowledge_entries IS MISSING.
// I trust my code analysis. Admin SDK test is pointless as it bypasses rules.
// Switching to plan: Add the rule.

function inspectRules() {
    const rulesPath = resolve(__dirname, '../firestore.rules');
    const content = fs.readFileSync(rulesPath, 'utf8');
    const lines = content.split('\n');
    let insideTenant = false;
    let foundKb = false;

    lines.forEach((line, idx) => {
        if (line.includes('match /tenants/{tenantId}')) insideTenant = true;
        if (insideTenant && line.includes('match /knowledge_entries')) foundKb = true;
        if (insideTenant && line.trim() === '}') insideTenant = false;
        if (!insideTenant && line.includes('match /knowledge_entries')) {
            console.log(`Knowledge Entries found OUTSIDE tenant block at line ${idx + 1}`);
        }
    });

    if (!foundKb) {
        console.log("❌ CONFIRMED: No 'knowledge_entries' block found INSIDE 'match /tenants/{tenantId}'");
    } else {
        console.log("✅ Found knowledge_entries inside tenant block.");
    }
}

inspectRules();
