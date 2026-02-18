const fs = require('fs');
const path = require('path');

function findTypes(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        const s = fs.statSync(full);
        if (s.isDirectory()) {
            if (f.startsWith('UniTask_BROKEN_STATE')) {
                console.log(`Checking broken state: ${full}`);
                const corePath = path.join(full, 'app', 'uniflux', 'core');
                if (fs.existsSync(corePath)) {
                    console.log(`FOUND CORE IN BROKEN STATE: ${corePath}`);
                    console.log('Files:', fs.readdirSync(corePath));
                }
            }
            if (!f.includes('node_modules') && !f.startsWith('.')) {
                findTypes(full);
            }
        } else if (f === 'types.ts' && full.includes('uniflux')) {
            console.log(`MATCH: ${full}`);
        }
    }
}

try {
    findTypes('..');
} catch (e) {
    console.error(e);
}
