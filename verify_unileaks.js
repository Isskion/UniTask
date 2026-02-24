const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

const PROJECTS = {
    'EUROPASTRY': '9iqygviz3AGJnbJOLc8E',
    'DELGADO': 'Au1xfXgivgl6VYj2zscs',
    'LUIS SIMOES': 'OH4sjML9byhLuzMXSTss',
    'SMSA': 'c0HRtaCkKXxeiQf897sY',
    'SPAR': 'WcF8wTccm1LkaFBfWvug',
    'TRANSPAIS': 'aAb2HIajQVhXnLAzmVo8'
};

async function verify() {
    for (const [name, id] of Object.entries(PROJECTS)) {
        const foldersSnap = await db.collection('unileaks_folders')
            .where('projectId', '==', id)
            .get();

        const notesSnap = await db.collection('unileaks_notes')
            .where('projectId', '==', id)
            .get();

        console.log(`[${name}] Folders: ${foldersSnap.size}, Notes: ${notesSnap.size}`);
    }
}

verify().catch(console.error);
