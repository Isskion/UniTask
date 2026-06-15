const fs = require('fs');
const path = require('path');

const logFile = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\brain\\b0ad25bc-fd27-482e-9960-c14380368298\\.system_generated\\logs\\overview.txt';

if (fs.existsSync(logFile)) {
  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('flujo') || lowerLine.includes('domicilio') || lowerLine.includes('nodes') || lowerLine.includes('edges')) {
      if (lowerLine.includes('domicilio') || lowerLine.includes('simoes')) {
        console.log(`Line ${index + 1}: ${line.trim().substring(0, 300)}`);
      }
    }
  });
} else {
  console.log('Log file not found.');
}
