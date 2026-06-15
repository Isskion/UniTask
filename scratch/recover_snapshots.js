const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    const flowsSnapshot = await db.collection('uniflux_flows').get();
    console.log(`Checking snapshots for ${flowsSnapshot.size} flows...`);

    const allSnapshots = [];

    for (const flowDoc of flowsSnapshot.docs) {
      const snapshotsRef = flowDoc.ref.collection('snapshots');
      const snapshotsSnap = await snapshotsRef.get();
      if (snapshotsSnap.size > 0) {
        console.log(`Flow ${flowDoc.id} ("${flowDoc.data().name}") has ${snapshotsSnap.size} snapshots!`);
        snapshotsSnap.forEach(snapDoc => {
          allSnapshots.push({
            flowId: flowDoc.id,
            flowName: flowDoc.data().name,
            snapshotId: snapDoc.id,
            data: snapDoc.data()
          });
        });
      }
    }

    if (allSnapshots.length > 0) {
      const outputPath = path.join(__dirname, 'uniflux_snapshots_dump.json');
      fs.writeFileSync(outputPath, JSON.stringify(allSnapshots, null, 2), 'utf-8');
      console.log(`Successfully dumped ${allSnapshots.length} snapshots to ${outputPath}`);
    } else {
      console.log('No snapshots found under any flow.');
    }
  } catch (error) {
    console.error('Error fetching snapshots:', error);
  } finally {
    process.exit(0);
  }
}

run();
