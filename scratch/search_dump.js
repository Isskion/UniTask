const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, 'uniflux_flows_dump.json');
const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

console.log(`Analyzing ${dump.length} flows in dump...`);

dump.forEach(flow => {
  const data = flow.data;
  const name = data.name || '';
  const nodeLabels = (data.nodes || []).map(n => n.label || '');
  const edgeLabels = (data.edges || []).map(e => e.label || '');
  
  console.log(`Flow ID: ${flow.id}`);
  console.log(`Name: "${name}"`);
  console.log(`Project ID: ${data.projectId}`);
  console.log(`Tenant ID: ${data.tenantId}`);
  console.log(`Nodes count: ${nodeLabels.length}`);
  console.log(`Nodes: ${nodeLabels.join(', ')}`);
  console.log(`Edges: ${edgeLabels.join(', ')}`);
  console.log(`UpdatedAt: ${JSON.stringify(data.updatedAt)}`);
  console.log('----------------------------------------------------');
});
