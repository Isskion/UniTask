const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
const fs = require('fs');

if (!admin.apps.length) {
    try {
        const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        }
    } catch (e) {
        process.exit(1);
    }
}

const db = admin.firestore();

async function listAllIncomplete() {
    const logFile = path.join(__dirname, "incomplete_tasks.txt");
    fs.writeFileSync(logFile, `All Incomplete Tasks by Sprint:\n\n`);

    const tasksRef = db.collection('tasks');
    const snapshot = await tasksRef.where('status', '!=', 'completed').get();

    if (snapshot.empty) {
        fs.appendFileSync(logFile, "No incomplete tasks found anywhere.\n");
        return;
    }

    const bySprint = {};

    snapshot.forEach(doc => {
        const t = doc.data();
        const sId = t.sprintId || "BACKLOG";
        if (!bySprint[sId]) bySprint[sId] = [];
        bySprint[sId].push({ id: doc.id, title: t.title, status: t.status });
    });

    const sprintIds = Object.keys(bySprint);

    // Enrich with Sprint Names
    for (const sId of sprintIds) {
        let sprintName = "Backlog";
        let endDate = "";
        if (sId !== "BACKLOG") {
            const sDoc = await db.collection('sprints').doc(sId).get();
            if (sDoc.exists) {
                const sData = sDoc.data();
                sprintName = sData.name;
                if (sData.endDate) {
                    endDate = sData.endDate.toDate ? sData.endDate.toDate().toISOString() : new Date(sData.endDate).toISOString();
                }
            } else {
                sprintName = "Unknown Sprint " + sId;
            }
        }

        fs.appendFileSync(logFile, `SPRINT: ${sprintName} (${sId}) - Ends: ${endDate}\n`);
        const tasks = bySprint[sId];
        tasks.forEach(t => {
            fs.appendFileSync(logFile, `    [${t.status}] ${t.title} (${t.id})\n`);
        });
        fs.appendFileSync(logFile, "\n");
    }
}

listAllIncomplete().catch(console.error);
