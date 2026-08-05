const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const inputFile = 'C:\\Users\\daniel.delamo\\Downloads\\LUIS SIMOES - Fase 2 - Documento de Alcance - Borrador incompleto v1.docx';
const outputFile = path.join(__dirname, 'Luis_Simoes_Borrador.txt');

async function run() {
    if (fs.existsSync(inputFile)) {
        console.log(`Extracting: ${inputFile} -> ${outputFile}`);
        try {
            const result = await mammoth.extractRawText({ path: inputFile });
            fs.writeFileSync(outputFile, result.value, 'utf8');
            console.log(`Successfully extracted text to ${outputFile}`);
        } catch (err) {
            console.error("Error extracting document:", err);
        }
    } else {
        console.error(`File does not exist: ${inputFile}`);
    }
}

run().catch(err => console.error(err));
