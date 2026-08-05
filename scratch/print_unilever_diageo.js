const xlsx = require('xlsx');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Ventas\\Ventas\\Master Ventas_Modelos v.0.xlsx';
const workbook = xlsx.readFile(filePath);

function printFirstRows(sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n=========================================`);
    console.log(`FIRST 25 ROWS OF ${sheetName}`);
    console.log(`=========================================`);
    data.slice(0, 25).forEach((row, i) => {
        console.log(`Row ${i}:`, row);
    });
}

printFirstRows('Unilever ES');
printFirstRows('Diageo ES');
