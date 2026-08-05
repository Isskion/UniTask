const fs = require('fs');

const mdPath = "scratch/extracted_doc_structure.md";
const lines = fs.readFileSync(mdPath, 'utf8').split('\n');

function printSection(headerText, maxLines = 40) {
    const startIdx = lines.findIndex(l => l.includes(headerText));
    if (startIdx === -1) {
        console.log(`Header not found: ${headerText}`);
        return;
    }
    console.log(`\n--- SECTION PREVIEW: ${headerText} (Start line ${startIdx}) ---`);
    lines.slice(startIdx, startIdx + maxLines).forEach((l, i) => {
        console.log(`  [${startIdx + i}]: ${l}`);
    });
}

printSection("1\\. Perfil de Transpais");
printSection("2\\. Condiciones y Reglas de Negocio");
printSection("3\\. Mapeo de Base de Datos");
printSection("4\\. Distribución de Tarifas por Operación");
printSection("6\\. Paso a Paso:");
