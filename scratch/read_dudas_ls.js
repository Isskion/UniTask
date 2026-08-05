const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Ventas\\Ventas\\Ejemplos de tabla de tarifas.xlsx';
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Dudas LS'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log("=========================================");
console.log("DUDAS LS SHEET CONTENT");
console.log("=========================================");
data.forEach((row, idx) => {
    // Check if row has at least one non-empty value
    const hasValue = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== "");
    if (hasValue) {
        console.log(`Row ${idx}:`, row);
    }
});
