const fs = require('fs');
const path = require('path');

const tempDir = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\brain\\b0ad25bc-fd27-482e-9960-c14380368298\\.tempmediaStorage';

if (fs.existsSync(tempDir)) {
  const files = fs.readdirSync(tempDir);
  files.forEach(file => {
    if (file.startsWith('dom_') && file.endsWith('.txt')) {
      const filePath = path.join(tempDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.toLowerCase().includes('domicilio')) {
        console.log(`Found mention in DOM snapshot file ${file}!`);
      }
    }
  });
} else {
  console.log('Temp media storage directory not found.');
}
