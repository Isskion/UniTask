const fs = require('fs');
const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 - 15 julio.xlsb';

console.log("xlsx version:", require('xlsx/package.json').version);

const stats = fs.statSync(excelPath);
console.log("Tamaño:", (stats.size / 1024 / 1024).toFixed(2), "MB");

try {
    const wb = xlsx.readFile(excelPath, { cellDates: false, cellFormula: true });
    console.log("\nHojas:", wb.SheetNames);

    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    console.log("\n--- Primera hoja:", sheetName, "ref:", ws['!ref']);

    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log("Total filas:", rows.length);
    console.log("\n--- Fila 0 (primeras 10 cols) ---", rows[0]?.slice(0, 10));
    console.log("--- Fila 1 (primeras 10 cols) ---", rows[1]?.slice(0, 10));
    console.log("--- Fila 2 (primeras 10 cols) ---", rows[2]?.slice(0, 10));
    console.log("--- Fila 3 (primeras 10 cols) ---", rows[3]?.slice(0, 10));
} catch (err) {
    console.error("ERROR leyendo .xlsb:", err.message);
    console.error(err.stack);
}
