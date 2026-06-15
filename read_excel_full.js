const fs = require('fs');
const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Fichero pedidos intermodal. CAmpos obligatorios.xlsx';

if (fs.existsSync(excelPath)) {
    const workbook = xlsx.readFile(excelPath);
    
    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n=========================================`);
        console.log(`SHEET: ${sheetName}`);
        console.log(`=========================================`);
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        // Print first 40 rows
        rows.slice(0, 40).forEach((row, idx) => {
            if (row && row.length > 0) {
                // filter empty columns at the end to keep output readable
                let lastIdx = row.length - 1;
                while (lastIdx >= 0 && (row[lastIdx] === undefined || row[lastIdx] === null || String(row[lastIdx]).trim() === '')) {
                    lastIdx--;
                }
                const cleanRow = row.slice(0, lastIdx + 1);
                if (cleanRow.length > 0) {
                    console.log(`Row ${idx + 1}:`, cleanRow);
                }
            }
        });
    });
} else {
    console.error("Excel file does not exist:", excelPath);
}
