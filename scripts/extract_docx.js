const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");

const docxPath = "C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\contexto_unigis\\formación\\Proyecto_Generacion_Digital_Completado.docx";

mammoth.extractRawText({ path: docxPath })
    .then(function (result) {
        const text = result.value; // The raw text
        const messages = result.messages; // Any messages, such as warnings during conversion
        fs.writeFileSync("C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\contexto_unigis\\formación\\docx_extracted.txt", text);
        console.log("Extraction complete. Check docx_extracted.txt");
    })
    .done();
