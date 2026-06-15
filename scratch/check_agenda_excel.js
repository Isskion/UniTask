const fs = require('fs');
const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 tercera semana de julio.xlsx';

if (!fs.existsSync(excelPath)) {
    console.error("No existe:", excelPath);
    process.exit(1);
}

const wb = xlsx.readFile(excelPath, { cellDates: false });
console.log("Hojas:", wb.SheetNames);

const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log("Total filas:", rows.length);
console.log("Total columnas fila 0:", rows[0]?.length);

// Print first 6 rows, columns 0-34
for (let r = 0; r < Math.min(6, rows.length); r++) {
    console.log(`\n--- Fila ${r} ---`);
    console.log(rows[r].slice(0, 35));
}

// Print row 3 (first data row) in detail with column index
console.log("\n--- Fila 3 detallada (col: valor) ---");
(rows[3] || []).forEach((v, i) => {
    if (v !== '') console.log(`  [${i}]`, JSON.stringify(v));
});

const stats = fs.statSync(excelPath);
console.log("\nTamaño archivo (bytes):", stats.size, "=>", (stats.size / 1024).toFixed(1), "KB");
