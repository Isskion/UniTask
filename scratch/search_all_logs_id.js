const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\brain';
const searchStr = '1779122154540';

if (!fs.existsSync(brainDir)) {
  console.log('Brain directory does not exist.');
  process.exit(1);
}

const folders = fs.readdirSync(brainDir);
folders.forEach(folder => {
  const logFile = path.join(brainDir, folder, '.system_generated', 'logs', 'overview.txt');
  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, 'utf-8');
    if (content.includes(searchStr)) {
      console.log(`Found ID in ${folder}/overview.txt!`);
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(searchStr)) {
          console.log(`  Line ${index + 1}: ${line.trim().substring(0, 500)}`);
        }
      });
    }
  }
});
