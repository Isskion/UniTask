const fs = require('fs');
const backupPath = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\UniTask\\scripts\\backups\\latest_backup.json';
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
console.log('Top-level keys:', Object.keys(backup));
