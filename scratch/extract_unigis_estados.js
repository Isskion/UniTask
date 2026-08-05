const fs = require('fs');
const mammoth = require('mammoth');

const docxPath = 'c:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\UniTask\\scratch\\estados_entidades_unigis.docx';
const outputPath = 'c:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\UniTask\\scratch\\estados_entidades_unigis.txt';

mammoth.extractRawText({ path: docxPath })
    .then(function(result) {
        fs.writeFileSync(outputPath, result.value, 'utf8');
        console.log("Successfully extracted text to " + outputPath);
    })
    .catch(function(err) {
        console.error("Error reading docx:", err);
    });
