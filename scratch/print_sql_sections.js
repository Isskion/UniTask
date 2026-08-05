const fs = require('fs');

const mdPath = "scratch/extracted_doc_structure.md";
const lines = fs.readFileSync(mdPath, 'utf8').split('\n');

function printLinesAround(lineNum, count = 25) {
    console.log(`\n--- LINES AROUND ${lineNum} ---`);
    lines.slice(Math.max(0, lineNum - 5), lineNum + count).forEach((l, i) => {
        console.log(`  [${Math.max(0, lineNum - 5) + i}]: ${l}`);
    });
}

printLinesAround(1150);
printLinesAround(1220);
printLinesAround(1285);
printLinesAround(1345);
printLinesAround(1415);
printLinesAround(1460);
