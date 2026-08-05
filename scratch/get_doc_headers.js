const fs = require('fs');

const mdPath = "scratch/extracted_doc_structure.md";
if (!fs.existsSync(mdPath)) {
    console.error(`File not found: ${mdPath}`);
    process.exit(1);
}

const lines = fs.readFileSync(mdPath, 'utf8').split('\n');
console.log("=========================================");
console.log("DOCUMENT HEADERS STRUCTURE");
console.log("=========================================");

lines.forEach((line, idx) => {
    if (line.startsWith('#') || line.trim().startsWith('**') && line.trim().endsWith('**') && line.length < 100) {
        console.log(`Line ${idx}: ${line}`);
    }
});
