const fs = require('fs');
const path = require('path');

function searchInFile(filePath, query) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
            if (line.includes(query)) {
                console.log(`[${path.basename(filePath)}:${idx + 1}]: ${line.trim()}`);
            }
        });
    }
}

const files = [
    'Integracion_UNIGIS_Maersk.txt',
    'Documento_de_interfaces.txt',
    'unigis-order-creator-web/src/data/schema.ts'
];

files.forEach(f => searchInFile(f, 'V6'));
files.forEach(f => searchInFile(f, 'TipoPedido'));
files.forEach(f => searchInFile(f, 'CodigoOperacion'));
