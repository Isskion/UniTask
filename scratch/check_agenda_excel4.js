const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 tercera semana de julio.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: false, cellFormula: true, cellStyles: false });

console.log("=== Defined Names ===");
const names = wb.Workbook?.Names || [];
names.forEach(n => console.log(`  ${n.Sheet ?? ''} ${n.Name} = ${n.Ref}`));
if (names.length === 0) console.log("  (ninguno)");

const sheetName = 'S3 Julio 26';
const ws = wb.Sheets[sheetName];

console.log("\n=== Merges en", sheetName, "===");
console.log(ws['!merges']?.slice(0, 20));

console.log("\n=== Fila 0 completa (todas las columnas con valor) ===");
Object.keys(ws).filter(k => /^[A-Z]+1$/.test(k)).forEach(k => {
    console.log(`  ${k}:`, JSON.stringify({v: ws[k].v, t: ws[k].t, f: ws[k].f, w: ws[k].w}));
});

console.log("\n=== Fila 1 (índice 0->row2) completa ===");
Object.keys(ws).filter(k => /^[A-Z]+2$/.test(k)).forEach(k => {
    console.log(`  ${k}:`, JSON.stringify({v: ws[k].v, t: ws[k].t, f: ws[k].f, w: ws[k].w}));
});

console.log("\n=== Fila 2 (índice2->row3, cabeceras Fecha_T...) primeras 12 cols ===");
['A','B','C','D','E','F','G','H','I','J','K','L'].forEach(col => {
    const addr = col + '3';
    const cell = ws[addr];
    console.log(`  ${addr}:`, cell ? JSON.stringify({v: cell.v, t: cell.t, f: cell.f, w: cell.w}) : '(vacío)');
});

// LISTAS-NO TOCAR sheet
console.log("\n=== LISTAS-NO TOCAR: primeras filas/cols ===");
const wsL = wb.Sheets['LISTAS-NO TOCAR'];
const rowsL = xlsx.utils.sheet_to_json(wsL, { header: 1, defval: '' });
console.log("ref:", wsL['!ref']);
for (let r = 0; r < Math.min(6, rowsL.length); r++) {
    console.log(`Fila ${r}:`, rowsL[r].slice(0, 10));
}
