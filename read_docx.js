const fs = require('fs');
const mammoth = require('mammoth');

const docxPath = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Interfaces\\Integracion_UNIGIS_Maersk.docx';

mammoth.extractRawText({ path: docxPath })
    .then(function(result) {
        var text = result.value; // The raw text
        var messages = result.messages; // Any messages, such as warnings during conversion
        fs.writeFileSync('Integracion_UNIGIS_Maersk.txt', text, 'utf8');
        console.log("Successfully extracted text to Integracion_UNIGIS_Maersk.txt");
    })
    .catch(function(err) {
        console.error("Error reading docx:", err);
    });
