const fs = require('fs');
const path = require('path');

const brainPath = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\brain';

try {
    const folders = fs.readdirSync(brainPath).map(name => {
        const fullPath = path.join(brainPath, name);
        const stat = fs.statSync(fullPath);
        return { name, fullPath, mtime: stat.mtime };
    }).filter(f => f.mtime > new Date('2026-07-01')); // Only conversations since July 1st, 2026

    folders.sort((a, b) => b.mtime - a.mtime); // Sort newest first

    console.log(`Found ${folders.length} recent conversation folders. Scanning...`);

    folders.forEach(folder => {
        console.log(`Scanning folder: ${folder.name} (modified: ${folder.mtime.toISOString()})`);
        const logsDir = path.join(folder.fullPath, '.system_generated', 'logs');
        if (fs.existsSync(logsDir)) {
            const files = fs.readdirSync(logsDir);
            files.forEach(file => {
                if (file.endsWith('.jsonl') || file.endsWith('.json')) {
                    const filePath = path.join(logsDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('EstadoPedidoTransicion') || content.includes('IdOperacion') || content.includes('Idoperacion') || content.includes('transicion')) {
                        const lines = content.split('\n');
                        lines.forEach((line, idx) => {
                            if (line.toLowerCase().includes('insert into') && (line.toLowerCase().includes('transi') || line.includes('Estado'))) {
                                console.log(`  MATCH in ${file} (line ${idx + 1}):`);
                                console.log(`  ${line.substring(0, 500)}`);
                                console.log('  ---');
                            }
                        });
                    }
                }
            });
        }
    });

    console.log('Fast search finished.');
} catch (e) {
    console.error('Error during search:', e);
}
