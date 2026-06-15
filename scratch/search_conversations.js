const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\brain';

if (!fs.existsSync(brainDir)) {
  console.log('Brain directory does not exist.');
  process.exit(1);
}

const conversations = fs.readdirSync(brainDir);
console.log(`Found ${conversations.length} conversation folders.`);

conversations.forEach(convId => {
  const logFile = path.join(brainDir, convId, '.system_generated', 'logs', 'overview.txt');
  if (fs.existsSync(logFile)) {
    console.log(`Searching in ${convId}/overview.txt...`);
    const content = fs.readFileSync(logFile, 'utf-8');
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('domicilio') || lowerContent.includes('simoes')) {
      console.log(`  MATCH FOUND in conversation ${convId}!`);
      // Find the first few lines around the match
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('domicilio') || lowerLine.includes('simoes') || lowerLine.includes('luis')) {
          console.log(`    Line ${index + 1}: ${line.trim().substring(0, 150)}`);
        }
      });
    }
  }
});
