const fs = require('fs');
const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Fichero pedidos intermodal. CAmpos obligatorios.xlsx';

if (fs.existsSync(excelPath)) {
    const workbook = xlsx.readFile(excelPath);
    console.log("Sheets available:", workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        // Print first 5 rows to understand the structure
        rows.slice(0, 5).forEach((row, idx) => {
            console.log(`Row ${idx + 1}:`, row.slice(0, 30));
        });
    });
} else {
    console.error("Excel file does not exist:", excelPath);
}
