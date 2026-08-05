const xlsx = require('xlsx');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Tarifas\\Tarifas\\Costos\\Master Custos_Modelos.xlsx';
const workbook = xlsx.readFile(filePath);

console.log("=========================================");
console.log("MASTER CUSTOS DEEP DIVE");
console.log("=========================================");

// 1. Inspect 'ER' sheet columns and size
const erSheet = workbook.Sheets['ER'];
const erData = xlsx.utils.sheet_to_json(erSheet, { header: 1 });
console.log(`ER Sheet: Total rows = ${erData.length}`);
console.log("ER Headers (Row 0):", erData[0]);
console.log("ER Sub-headers (Row 1):", erData[1]);
console.log("ER Row 2:", erData[2]);
console.log("ER Row 3:", erData[3]);
console.log("ER Row 4:", erData[4]);
console.log("ER Row 1000:", erData[1000]);
console.log("ER Row 5000:", erData[5000]);
console.log("ER Row 10000:", erData[10000]);

// 2. Inspect 'Tarifa_Madrid' sheet columns and size
const tmSheet = workbook.Sheets['Tarifa_Madrid'];
const tmData = xlsx.utils.sheet_to_json(tmSheet, { header: 1 });
console.log(`\nTarifa_Madrid Sheet: Total rows = ${tmData.length}`);
tmData.slice(0, 10).forEach((row, i) => {
    console.log(`  [Row ${i}]:`, row);
});

// 3. Inspect 'Informação sobre Faturação' sheet columns and size
const infSheet = workbook.Sheets['Informação sobre Faturação'];
const infData = xlsx.utils.sheet_to_json(infSheet, { header: 1 });
console.log(`\nInformação sobre Faturação Sheet: Total rows = ${infData.length}`);
infData.slice(0, 15).forEach((row, i) => {
    console.log(`  [Row ${i}]:`, row);
});
