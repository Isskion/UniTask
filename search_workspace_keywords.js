const fs = require('fs');
const path = require('path');

const dirToSearch = 'c:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\UniTask';

const keywords = [/univiso/i, /uniflux/i, /unileaks/i, /visualmapper/i, /unigestion/i, /unilink/i, /unitask/i, /unipost/i];

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
console.log(`Total files to search: ${files.length}`);
files.forEach(file => {
    const ext = path.extname(file);
    if (ext === '.md' || ext === '.txt' || ext === '.json' || ext === '.js' || ext === '.ts' || ext === '.tsx') {
        try {
            const content = fs.readFileSync(file, 'utf8');
            keywords.forEach(kw => {
                if (kw.test(content) && !file.includes('search_web_docs.js') && !file.includes('search_logs.js')) {
                    console.log(`Found match for ${kw} in ${path.relative(dirToSearch, file)}`);
                }
            });
        } catch (e) {
            // ignore binary/read errors
        }
    }
});
