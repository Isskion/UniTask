const fs = require('fs');
const path = require('path');
const dotEnvPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(dotEnvPath, 'utf8');
const lines = envContent.split(/\r?\n/);
const saLine = lines.find(l => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
console.log('RAW LINE START:', saLine.substring(0, 100));
console.log('RAW LINE END:', saLine.substring(saLine.length - 100));

let val = saLine.split('=')[1].trim();
console.log('TRIMMED VAL START:', val.substring(0, 50));
if (val.startsWith('"')) console.log('Starts with double quote');
if (val.endsWith('"')) console.log('Ends with double quote');

let sub = val;
if (sub.startsWith('"') && sub.endsWith('"')) sub = sub.substring(1, sub.length - 1);
console.log('SUBSTRING START:', sub.substring(0, 50));

let replaced = sub.replace(/\\n/g, '\n').replace(/\\"/g, '"');
console.log('REPLACED START:', replaced.substring(0, 100));

try {
    JSON.parse(replaced);
    console.log('✅ JSON.parse(replaced) SUCCESS');
} catch (e) {
    console.log('❌ JSON.parse(replaced) FAILED:', e.message);
    const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
    console.log('Context at error:', replaced.substring(Math.max(0, pos - 20), pos + 20));
}

try {
    JSON.parse(sub);
    console.log('✅ JSON.parse(sub) SUCCESS');
} catch (e) {
    console.log('❌ JSON.parse(sub) FAILED:', e.message);
}
