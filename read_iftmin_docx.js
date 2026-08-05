const fs = require('fs');
const mammoth = require('mammoth');
const path = require('path');

const docxPath = path.join(__dirname, 'Mapeo_IFTMIN_UNIGIS.docx');

mammoth.extractRawText({ path: docxPath })
    .then(function(result) {
        fs.writeFileSync(path.join(__dirname, 'Mapeo_IFTMIN_UNIGIS_extracted.txt'), result.value, 'utf8');
        console.log("Successfully extracted text to Mapeo_IFTMIN_UNIGIS_extracted.txt");
    })
    .catch(function(err) {
        console.error("Error reading docx:", err);
    });
