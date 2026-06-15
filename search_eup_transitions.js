const fs = require('fs');
const path = require('path');

const basePath = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\contexto_unigis\\Unileaks\\Proyectos\\Europastry';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const terms = [/transic/i, /estado/i, /SDNXTR/i, /SDLTTR/i];

walkDir(basePath, (filePath) => {
    if (filePath.endsWith('.md') || filePath.endsWith('.txt')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            terms.forEach(term => {
                if (term.test(line)) {
                    console.log(`[${path.relative(basePath, filePath)}:${idx+1}]: ${line.trim()}`);
                }
            });
        });
    }
});
