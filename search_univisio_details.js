const fs = require('fs');
const path = require('path');

const dirToSearch = 'c:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\UniTask';

const keywords = [/univisio/i];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules' && file !== '.git' && file !== '.next') {
                results = results.concat(walk(filePath));
            }
        } else {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk(dirToSearch);
files.forEach(file => {
    const ext = path.extname(file);
    if (ext === '.md' || ext === '.txt' || ext === '.json' || ext === '.js' || ext === '.ts' || ext === '.tsx') {
        try {
            const content = fs.readFileSync(file, 'utf8');
            keywords.forEach(kw => {
                if (kw.test(content)) {
                    console.log(`Found univisio in ${path.relative(dirToSearch, file)}`);
                    const lines = content.split('\n');
                    lines.forEach((line, idx) => {
                        if (kw.test(line)) {
                            console.log(`  L${idx + 1}: ${line.trim()}`);
                        }
                    });
                }
            });
        } catch (e) {
            // ignore
        }
    }
});
