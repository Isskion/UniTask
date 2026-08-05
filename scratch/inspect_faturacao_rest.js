const xlsx = require('xlsx');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Tarifas\\Tarifas\\Costos\\Master Custos_Modelos.xlsx';
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Informação sobre Faturação'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log("=========================================");
console.log("INFORMAÇÃO SOBRE FATURAÇÃO SHEET ROWS 15-37");
console.log("=========================================");
data.slice(15, 37).forEach((row, i) => {
    console.log(`  [Row ${15 + i}]:`, row);
});
