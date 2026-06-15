const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'components', 'uniflux', 'UnifluxWorkspace.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('handleSave')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
