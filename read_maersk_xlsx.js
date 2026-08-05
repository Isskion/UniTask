const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'maersk_order.xlsx');

if (fs.existsSync(excelPath)) {
    const workbook = xlsx.readFile(excelPath);
    console.log("Sheets available in maersk_order.xlsx:", workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        rows.slice(0, 10).forEach((row, idx) => {
            console.log(`Row ${idx + 1}:`, row);
        });
    });
} else {
    console.error("maersk_order.xlsx does not exist");
}
