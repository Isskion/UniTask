const fs = require('fs');
const path = require('path');

const dirToSearch = 'c:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\UniTask\\unigis-order-creator-web';

const keywords = [/univiso/i, /uniflux/i, /unileaks/i, /visualmapper/i, /unigestion/i, /unilink/i, /unitask/i, /unipost/i];

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules') {
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
        const content = fs.readFileSync(file, 'utf8');
        keywords.forEach(kw => {
            if (kw.test(content)) {
                console.log(`Found match for ${kw} in ${path.relative(dirToSearch, file)}`);
                // Print lines with the match
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (kw.test(line)) {
                        console.log(`  Line ${idx + 1}: ${line.trim()}`);
                    }
                });
            }
        });
    }
});
