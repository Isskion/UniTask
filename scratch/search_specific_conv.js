const fs = require('fs');
const path = require('path');

const logFile = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\brain\\adea45b8-a844-4f7e-940c-249dce96a9d7\\.system_generated\\logs\\overview.txt';

if (fs.existsSync(logFile)) {
  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('domicilio') || line.toLowerCase().includes('simoes')) {
      console.log(`Line ${index + 1}: ${line.trim().substring(0, 300)}`);
    }
  });
} else {
  console.log('Log file not found.');
}
