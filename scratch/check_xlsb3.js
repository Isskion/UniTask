const fs = require('fs');
const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 - 15 julio.xlsb';
const buf = fs.readFileSync(excelPath);
const u8 = new Uint8Array(buf);

const wb = xlsx.read(u8, { type: 'array' });
console.log("Hojas:", wb.SheetNames.length);
console.log("Primera hoja:", wb.SheetNames[0]);

const ws = wb.Sheets['S3 Junio 26'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
console.log("S3 Junio 26 fila3:", rows[3]?.slice(0, 8));
