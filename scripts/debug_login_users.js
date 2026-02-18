const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read .env.local manually to avoid dotenv dependency issues in this environment
const dotEnvPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(dotEnvPath)) {
    console.error(".env.local not found at", dotEnvPath);
    process.exit(1);
}

const envContent = fs.readFileSync(dotEnvPath, 'utf8');

// Parse FIREBASE_SERVICE_ACCOUNT
// It is likely in the format FIREBASE_SERVICE_ACCOUNT="{\"type\": ... }"
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT="({.*})"/);
let serviceAccount;

if (match && match[1]) {
    try {
        // Unescape the string if needed (dotenv often handles double quotes by treating content as literal, but here it is a JSON string)
        // The file content is literally: FIREBASE_SERVICE_ACCOUNT="{\"type\":\"service_account\"...}"
        // But in the file view it looked like: FIREBASE_SERVICE_ACCOUNT="{"type":"service_account" ...}"
        // Let's try to parse the captured group directly.
        // If the file has escaped quotes like \" it needs unescaping? 
        // In the view_file output: FIREBASE_SERVICE_ACCOUNT="{"type":"service_account","project_id":"minuta-f75a4" ...
        // So it seems it is NOT escaped with backslashes in the file view.
        serviceAccount = JSON.parse(match[1]);
    } catch (e) {
        console.error("Error parsing JSON:", e);
        console.log("Raw match:", match[1]);
        process.exit(1);
    }
} else {
    // Try single quotes or no quotes
    const match2 = envContent.match(/FIREBASE_SERVICE_ACCOUNT='({.*})'/);
    if (match2) {
        serviceAccount = JSON.parse(match2[1]);
    } else {
        console.error("Could not find FIREBASE_SERVICE_ACCOUNT in .env.local with expected format.");
        process.exit(1);
    }
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkUsers() {
    console.log("Checking users for missing tenantId or roleLevel...");
    const snap = await db.collection('users').get();

    let total = 0;
    let problematic = 0;

    const outputLines = [];

    snap.forEach(doc => {
        total++;
        const data = doc.data();
        const issues = [];

        if (!data.tenantId) issues.push("Missing tenantId");
        if (data.tenantId === "unknown") issues.push("tenantId is 'unknown'");
        if (data.roleLevel === undefined) issues.push("Missing roleLevel");

        // Check if roleLevel matches role? 
        // Not strictly required for login, but good for consistency.

        if (issues.length > 0) {
            problematic++;
            outputLines.push(`[PROBLEM] User ${doc.id} (${data.email}): ${issues.join(', ')}`);
        } else {
            // console.log(`[OK] User ${doc.id} (${data.email}) - Tenant: ${data.tenantId}, Role: ${data.roleLevel}`);
        }
    });

    outputLines.push(`Checked ${total} users.`);
    outputLines.push(`Found ${problematic} potentially problematic users.`);
    fs.writeFileSync('debug_users_result.txt', outputLines.join('\n'), 'utf8');
    console.log("Check complete. Results written to debug_users_result.txt");
}

checkUsers().catch(console.error);
