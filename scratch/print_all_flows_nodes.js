const fs = require('fs');
const path = require('path');

const dump = JSON.parse(fs.readFileSync(path.join(__dirname, 'uniflux_flows_dump.json'), 'utf-8'));

['draft-1775823048921', 'draft-1776435106494'].forEach(id => {
  const flow = dump.find(f => f.id === id);
  if (flow) {
    console.log(`Flow ID: ${flow.id}, Name: "${flow.data.name}"`);
    console.log(`Raw Nodes: ${JSON.stringify(flow.data.nodes)}`);
    console.log(`Raw Edges: ${JSON.stringify(flow.data.edges)}`);
    console.log('------------------------------------------------');
  } else {
    console.log(`Flow ${id} not found.`);
  }
});
