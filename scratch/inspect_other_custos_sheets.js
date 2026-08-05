const xlsx = require('xlsx');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Tarifas\\Tarifas\\Costos\\Master Custos_Modelos.xlsx';
const workbook = xlsx.readFile(filePath);

const sheetsToInspect = [
  'MARS',
  'Estamos atentos',
  'Tomadica Alcacer',
  'Logislink',
  'TF Trasme',
  'IS Trasme',
  'Islas Grupamar',
  'VL Carmar Schweppes Baleares'
];

console.log("=========================================");
console.log("INSPECTING OTHER CUSTOS SHEETS");
console.log("=========================================");

sheetsToInspect.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        console.log(`Sheet "${sheetName}" not found.`);
        return;
    }
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n--- Sheet "${sheetName}" (${data.length} rows) ---`);
    
    // Dump first 15 rows with actual contents (filtering completely empty rows)
    let count = 0;
    data.forEach((row, idx) => {
        if (count >= 15) return;
        const hasVal = row && row.some(c => c !== null && c !== undefined && String(c).trim() !== "");
        if (hasVal) {
            console.log(`  [Row ${idx}]:`, row.slice(0, 10));
            count++;
        }
    });
});
