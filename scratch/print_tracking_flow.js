const fs = require('fs');
const path = require('path');

const dump = JSON.parse(fs.readFileSync(path.join(__dirname, 'uniflux_flows_dump.json'), 'utf-8'));
const flow = dump.find(f => f.id === 'draft-1777298024225');

if (flow) {
  console.log(`Flow ID: ${flow.id}`);
  console.log(`Name: ${flow.data.name}`);
  console.log('Nodes:');
  flow.data.nodes.forEach(n => {
    console.log(`  - ID: ${n.id}, Label: "${n.label}", Type: ${n.type}`);
  });
  console.log('Edges:');
  flow.data.edges.forEach(e => {
    console.log(`  - Source: ${e.source}, Target: ${e.target}, Label: "${e.label || ''}"`);
  });
} else {
  console.log('Flow not found.');
}
