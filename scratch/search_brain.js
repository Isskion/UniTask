const fs = require('fs');
const path = require('path');

const brainPath = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\brain';

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

console.log('Searching in brain directory for SQL inserts...');
try {
    walkDir(brainPath, (filePath) => {
        if (filePath.endsWith('.jsonl') || filePath.endsWith('.json') || filePath.endsWith('.txt') || filePath.endsWith('.sql')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('EstadoPedidoTransicion') || content.includes('IdOperacion') || content.includes('Idoperacion')) {
                // Find lines with INSERT or transitions
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (line.toLowerCase().includes('insert into') && (line.toLowerCase().includes('transi') || line.includes('Estado'))) {
                        console.log(`Found in file: ${filePath} (line ${idx + 1}):`);
                        console.log(line.substring(0, 300));
                        console.log('---');
                    }
                });
            }
        }
    });
    console.log('Search finished.');
} catch (e) {
    console.error('Error reading brain:', e.message);
}
