const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Tarifas\\Tarifas\\Costos\\Master Custos_Modelos.xlsx';

if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    process.exit(1);
}

try {
    const workbook = xlsx.readFile(filePath);
    console.log("=========================================");
    console.log("MASTER CUSTOS SHEETS");
    console.log("=========================================");
    console.log("Sheets:", workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- Sheet "${sheetName}" (${data.length} rows) ---`);
        
        // Print first 8 rows
        data.slice(0, 8).forEach((row, i) => {
            console.log(`  [Row ${i}]:`, row ? row.slice(0, 12) : []);
        });
    });
} catch (err) {
    console.error("Error reading file:", err.message);
}
