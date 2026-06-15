const fs = require('fs');
const path = require('path');

const files = [
  'latest_10_flows.json',
  'recent_flows_diagnostic.json',
  'pre_recovery_backup.json',
  'pre_recovery_disaster_backup_1778587139399.json',
  'matching_flows_scan.json'
];

const workspaceDir = path.join(__dirname, '..');

files.forEach(file => {
  const filePath = path.join(workspaceDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`Checking ${file}...`);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes('domicilio') || lowerContent.includes('simoes')) {
        console.log(`FOUND matches in ${file}!`);
        // Let's parse it and find the specific flows
        const data = JSON.parse(content);
        // It could be an array or object
        const flows = Array.isArray(data) ? data : (data.flows || Object.values(data));
        flows.forEach(flow => {
          const flowName = (flow.name || flow.flowName || '').toLowerCase();
          if (flowName.includes('domicilio') || JSON.stringify(flow).toLowerCase().includes('domicilio')) {
            console.log(`- Flow ID: ${flow.id || flow.flowId}, Name: "${flow.name || flow.flowName}"`);
            console.log(`  Nodes: ${(flow.nodes || []).map(n => n.label || '').join(', ')}`);
          }
        });
      }
    } catch (e) {
      console.log(`Error reading/parsing ${file}:`, e.message);
    }
  } else {
    console.log(`${file} does not exist.`);
  }
});
