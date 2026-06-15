const XLSX = require('xlsx');
const path = require('path');

const excelPath = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\contexto_unigis\\Proyectos\\LS\\Programacion TMS.xlsx';

try {
    const workbook = XLSX.readFile(excelPath);
    console.log('Sheet Names:', workbook.SheetNames);
    
    // Dump some info for each sheet
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\nSheet: ${sheetName}`);
        console.log(`Total rows: ${data.length}`);
        
        // Print first 5 rows
        console.log('Sample rows:');
        data.slice(0, 8).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });
    });
} catch (e) {
    console.error('Error reading excel file:', e);
}
