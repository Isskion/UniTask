const fs = require('fs');
const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 tercera semana de julio.xlsx';

const wb = xlsx.readFile(excelPath, { cellDates: false, cellFormula: true });

const sheetName = 'S3 Julio 26';
const ws = wb.Sheets[sheetName];
console.log("Sheet ref:", ws['!ref']);

const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
console.log("Total filas:", rows.length);

console.log("\n--- Fila 0 (primeras 10 cols) ---", rows[0]?.slice(0, 10));
console.log("--- Fila 1 (primeras 10 cols) ---", rows[1]?.slice(0, 10));
console.log("--- Fila 2 (primeras 10 cols) ---", rows[2]?.slice(0, 10));

// Inspect raw cell objects for Fecha_T columns (col index 2, 7, 12...) in data rows 3-6
const DAY_OFFSETS = [2, 7, 12, 17, 22, 27, 32];
for (let r = 3; r <= 6; r++) {
    console.log(`\n--- Fila ${r}, consultor=${rows[r]?.[1]} ---`);
    for (const base of DAY_OFFSETS) {
        const colLetter = xlsx.utils.encode_col(base);
        const cellAddr = `${colLetter}${r + 1}`; // 1-indexed row
        const cell = ws[cellAddr];
        console.log(`  ${cellAddr} (Fecha_T):`, cell ? JSON.stringify({ v: cell.v, t: cell.t, f: cell.f, w: cell.w }) : '(vacía/no existe)');
    }
}
