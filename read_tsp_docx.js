const fs = require('fs');
const mammoth = require('mammoth');
const path = require('path');

const docxPath = path.join(__dirname, 'Mapeo_Cobros_Liquidaciones_TSP.docx');

mammoth.extractRawText({ path: docxPath })
    .then(function(result) {
        fs.writeFileSync(path.join(__dirname, 'Mapeo_Cobros_Liquidaciones_TSP_extracted.txt'), result.value, 'utf8');
        console.log("Successfully extracted text to Mapeo_Cobros_Liquidaciones_TSP_extracted.txt");
    })
    .catch(function(err) {
        console.error("Error reading docx:", err);
    });
