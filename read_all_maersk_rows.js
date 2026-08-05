const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'maersk_order.xlsx');

if (fs.existsSync(excelPath)) {
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets['Datos de Integracion'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Total rows: ${rows.length}`);
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        console.log(`Row ${i + 1}:`, rows[i]);
    }
} else {
    console.error("maersk_order.xlsx does not exist");
}
