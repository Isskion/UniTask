const fs = require('fs');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');

const excelPath = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Fichero pedidos intermodal. CAmpos obligatorios.xlsx';
const pdfPath1 = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Diseño de solución\\Diseño de solución I.pdf';
const pdfPath2 = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Relevamientos\\20251013 Inicio de diseño - Definir operaciones y tipos.pdf';

async function extractExcel() {
    if (fs.existsSync(excelPath)) {
        const workbook = xlsx.readFile(excelPath);
        const sheet = workbook.Sheets['Iñaki'];
        const csv = xlsx.utils.sheet_to_csv(sheet);
        console.log("=== EXCEL CONTENT (Fichero pedidos intermodal) ===");
        const lines = csv.split('\n');
        lines.forEach((line, idx) => {
            if (line.includes('TipoPedido') || line.includes('Tipo de Pedido') || line.includes('IdTipoPedido') || line.includes('Carga')) {
                console.log(`  Row ${idx}: ${line}`);
            }
        });
    }
}

async function extractPdf(pdfPath, title) {
    if (fs.existsSync(pdfPath)) {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);
        const text = data.text;
        console.log(`=== PDF CONTENT (${title}) ===`);
        const lines = text.split('\n');
        lines.forEach((line, idx) => {
            if (/tipo/i.test(line) && /pedido/i.test(line) || /tipo/i.test(line) && /orden/i.test(line) || /tipopedido/i.test(line) || /carga/i.test(line) || /intermodal/i.test(line)) {
                // Print the line and the next 2 lines for context
                console.log(`  Line ${idx}: ${line.trim()}`);
                if (lines[idx+1]) console.log(`    +1: ${lines[idx+1].trim()}`);
                if (lines[idx+2]) console.log(`    +2: ${lines[idx+2].trim()}`);
            }
        });
    }
}

async function main() {
    await extractExcel();
    await extractPdf(pdfPath1, "Diseño de solución I");
    await extractPdf(pdfPath2, "Definir operaciones y tipos");
}

main().catch(err => console.error(err));
