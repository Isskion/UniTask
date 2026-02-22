
const fs = require('fs');
const path = require('path');

const root = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\UniTask';
const now = Date.now();
const oneHour = 60 * 60 * 1000;

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        if (file.includes('node_modules') || file.includes('.next') || file.includes('.git')) return;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (now - stat.mtimeMs < oneHour) {
                results.push({ file, mtime: stat.mtime });
            }
        }
    });
    return results;
}

console.log('--- RECENTLY MODIFIED FILES (Last 60m) ---');
const modified = walk(root);
modified.sort((a, b) => b.mtime - a.mtime).forEach(m => {
    console.log(`${m.mtime.toISOString()} - ${m.file}`);
});
