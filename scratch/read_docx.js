const mammoth = require('mammoth');
const fs = require('fs');

const docxPath = "C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Diseño de solución\\Tarifas\\Documento_360_Transpais_TSP_v4.docx";

if (!fs.existsSync(docxPath)) {
    console.error(`File not found: ${docxPath}`);
    process.exit(1);
}

mammoth.convertToMarkdown({ path: docxPath })
    .then(result => {
        const text = result.value;
        const messages = result.messages;
        console.log("Extraction messages:", messages);
        
        // Write to a temporary file
        const outputPath = "scratch/extracted_doc_structure.md";
        fs.writeFileSync(outputPath, text);
        console.log(`Successfully extracted docx to ${outputPath}`);
        console.log("Length of text:", text.length);
        
        // Print first 1000 characters to show the beginning of the structure
        console.log("\n--- Preview ---");
        console.log(text.slice(0, 1500));
    })
    .catch(err => {
        console.error("Error converting docx:", err.message);
    });
