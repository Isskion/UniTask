const ExcelJS = require('exceljs');
const path = require('path');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\transpais_plantilla_integracion.xlsx';

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    console.log("Sheets in workbook:");
    workbook.worksheets.forEach((sheet, idx) => {
        console.log(`- Index ${idx}: "${sheet.name}"`);
        // Print first 5 rows and columns of each sheet to see template structure
        console.log("  First 3 rows:");
        for (let r = 1; r <= Math.min(3, sheet.rowCount); r++) {
            const row = sheet.getRow(r);
            const vals = [];
            row.eachCell({ includeEmpty: true }, (cell) => {
                vals.push(cell.value);
            });
            console.log(`    Row ${r}:`, vals.slice(0, 15));
        }
    });
}

main().catch(console.error);
