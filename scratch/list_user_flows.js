const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, 'uniflux_flows_dump.json');
const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

console.log('Flows for Tenant 3:');
dump.forEach(flow => {
  if (flow.data.tenantId == '3') {
    console.log(`ID: ${flow.id}`);
    console.log(`  Name: "${flow.data.name}"`);
    console.log(`  ProjectId: ${flow.data.projectId}`);
    console.log(`  Nodes count: ${flow.data.nodes ? flow.data.nodes.length : 0}`);
    console.log(`  Edges count: ${flow.data.edges ? flow.data.edges.length : 0}`);
    console.log(`  UpdatedAt: ${new Date(flow.data.updatedAt._seconds * 1000).toISOString()}`);
    console.log('---');
  }
});
