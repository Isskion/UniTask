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
    console.log('Fetching all documents from uniflux_flows...');
    const snapshot = await db.collection('uniflux_flows').get();
    console.log(`Found ${snapshot.size} documents.`);

    const flows = [];
    snapshot.forEach(doc => {
      flows.push({
        id: doc.id,
        data: doc.data()
      });
    });

    const outputPath = path.join(__dirname, 'uniflux_flows_dump.json');
    fs.writeFileSync(outputPath, JSON.stringify(flows, null, 2), 'utf-8');
    console.log(`Successfully dumped all flows to: ${outputPath}`);

    // Search for Luis Simoes, Simoes, or domicilio in the flows
    console.log('\n--- SEARCH RESULTS ---');
    let found = false;
    for (const flow of flows) {
      const dataStr = JSON.stringify(flow.data).toLowerCase();
      const name = (flow.data.name || '').toLowerCase();
      
      if (name.includes('luis') || name.includes('simoes') || name.includes('domicilio') || dataStr.includes('luis') || dataStr.includes('simoes')) {
        console.log(`Match found! ID: ${flow.id}, Name: "${flow.data.name}", ProjectId: ${flow.data.projectId}`);
        // Let's print some details:
        console.log(`Number of nodes: ${flow.data.nodes ? flow.data.nodes.length : 0}`);
        console.log(`Number of edges: ${flow.data.edges ? flow.data.edges.length : 0}`);
        console.log(`Created By: ${flow.data.createdBy}, TenantId: ${flow.data.tenantId}`);
        console.log('----------------------');
        found = true;
      }
    }
    if (!found) {
      console.log('No direct matches found in current documents.');
    }
  } catch (error) {
    console.error('Error fetching flows:', error);
  } finally {
    process.exit(0);
  }
}

run();
