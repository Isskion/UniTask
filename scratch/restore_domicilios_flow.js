const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  try {
    const sourceId = 'draft-1777298024225'; // FLUJO TRACKING
    const targetId = 'draft-1779122154540'; // FLUJO DOMICILIOS

    console.log(`Fetching source flow: ${sourceId}...`);
    const sourceDoc = await db.collection('uniflux_flows').doc(sourceId).get();
    if (!sourceDoc.exists) {
      console.error(`Source flow ${sourceId} not found!`);
      process.exit(1);
    }

    const sourceData = sourceDoc.data();
    console.log(`Successfully fetched source flow "${sourceData.name}".`);
    console.log(`Nodes count: ${sourceData.nodes ? sourceData.nodes.length : 0}`);
    console.log(`Edges count: ${sourceData.edges ? sourceData.edges.length : 0}`);

    console.log(`Fetching target flow: ${targetId}...`);
    const targetDoc = await db.collection('uniflux_flows').doc(targetId).get();
    if (!targetDoc.exists) {
      console.error(`Target flow ${targetId} not found!`);
      process.exit(1);
    }

    const targetData = targetDoc.data();
    console.log(`Target flow is currently named "${targetData.name}".`);

    // Prepare restored graph data
    const restoredData = {
      ...sourceData,
      id: targetId,
      name: 'FLUJO DOMICILIOS', // Explicitly keep the correct name
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log(`Restoring flow data into ${targetId}...`);
    await db.collection('uniflux_flows').doc(targetId).set(restoredData);
    console.log(`✅ Flow restored successfully!`);
    
  } catch (error) {
    console.error('Error during flow restoration:', error);
  } finally {
    process.exit(0);
  }
}

run();
