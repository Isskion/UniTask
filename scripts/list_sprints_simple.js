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

async function findSprint() {
    const sprintsRef = db.collection('sprints');
    const snapshot = await sprintsRef.get();

    // Target Feb 6th 2026
    const targetMonth = 1; // Feb
    const targetDay = 6;

    let matchId = "";

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.endDate) {
            let endDate = null;
            try {
                endDate = data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate);
            } catch (e) { }

            if (endDate && endDate.getMonth() === targetMonth) {
                const diff = Math.abs(endDate.getDate() - targetDay);
                if (diff <= 3) {
                    matchId = doc.id;
                }
            }
        }
    });

    if (matchId) {
        fs.writeFileSync(path.join(__dirname, "sprint_id.txt"), matchId);
        console.log("MATCH:" + matchId);
    } else {
        console.log("NO_MATCH");
    }
}

findSprint().catch(console.error);
