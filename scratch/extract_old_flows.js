const fs = require('fs');
const path = require('path');

const logFile = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\brain\\b0ad25bc-fd27-482e-9960-c14380368298\\.system_generated\\logs\\overview.txt';

if (fs.existsSync(logFile)) {
  const content = fs.readFileSync(logFile, 'utf-8');
  const regex = /draft-1779122154540/g;
  let match;
  console.log('Searching for draft-1779122154540 in overview.txt...');
  
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('draft-1779122154540') || line.includes('FLUJO DOMICILIOS')) {
      console.log(`\nLine ${index + 1}:`);
      // Print the line, up to 1000 characters
      console.log(line.trim().substring(0, 1000));
    }
  });
} else {
  console.log('Log file not found.');
}
