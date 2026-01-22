const fs = require('fs');
const backupPath = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\UniTask\\scripts\\backups\\latest_backup.json';
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
console.log('Sample User:', JSON.stringify(backup.users[0], null, 2));
console.log('Sample Invite:', JSON.stringify(backup.invites[0], null, 2));
