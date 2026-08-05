const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 tercera semana de julio.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: false });

const sheetName = 'S3 Julio 26';
const ws = wb.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log("Total filas:", rows.length);
console.log("\n--- Fila 2 (headers) col 0-39 ---");
console.log(rows[2]?.slice(0, 40));

console.log("\n--- Fila 3 (primera fila de datos) col 0-39 ---");
console.log(rows[3]?.slice(0, 40));

console.log("\n--- Fila 4 col 0-39 ---");
console.log(rows[4]?.slice(0, 40));

// Find any row in 3..10 where some Actividad-like cell is non-empty
console.log("\n--- Buscando primeras celdas no vacías en columnas 3,8,13,18,23,28,33 (Actividad) para filas 3-15 ---");
const DAY_OFFSETS = [2, 7, 12, 17, 22, 27, 32];
for (let ri = 3; ri <= 15; ri++) {
    const row = rows[ri];
    const consultantName = String(row?.[1] || '').trim();
    const nonEmpty = [];
    DAY_OFFSETS.forEach((base, dayIdx) => {
        for (let off = 0; off < 5; off++) {
            const v = row?.[base + off];
            if (v !== '' && v !== undefined) nonEmpty.push({ dayIdx, off, col: base + off, v });
        }
    });
    console.log(`Fila ${ri} (consultor="${consultantName}"):`, nonEmpty.length ? nonEmpty : '(todo vacío en bloques de dia)');
}
