const fs = require('fs');
const mammoth = require('mammoth');

const docPath = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Diseño de solución\\Presentación Intermodal\\TSP_Alcance_Funcional_Intermodal_20260528.docx';

async function main() {
    if (fs.existsSync(docPath)) {
        const result = await mammoth.extractRawText({ path: docPath });
        const text = result.value;
        const lines = text.split('\n');
        
        console.log("=== TSP_Alcance_Funcional_Intermodal Context ===");
        lines.forEach((line, idx) => {
            if (line.includes("Tipo de pedido") || line.includes("TipoPedido") || line.includes("import") || line.includes("export")) {
                // Print a range of lines for context
                console.log(`Line ${idx}: ${line.trim()}`);
                for (let i = 1; i <= 8; i++) {
                    if (lines[idx + i] && lines[idx + i].trim()) {
                        console.log(`  +${i}: ${lines[idx + i].trim()}`);
                    }
                }
                console.log("------------------------");
            }
        });
    } else {
        console.error("File does not exist:", docPath);
    }
}

main().catch(err => console.error(err));
