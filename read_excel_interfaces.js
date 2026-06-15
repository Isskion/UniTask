const fs = require('fs');
const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Interfaces\\Documento de interfaces.xlsx';

if (fs.existsSync(excelPath)) {
    const workbook = xlsx.readFile(excelPath);
    console.log("Sheet Names:", workbook.SheetNames);
    
    let allText = '';
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csv = xlsx.utils.sheet_to_csv(sheet);
        allText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
    });
    
    fs.writeFileSync('Documento_de_interfaces.txt', allText, 'utf8');
    console.log("Successfully dumped Excel to Documento_de_interfaces.txt");
} else {
    console.error("Excel file does not exist at:", excelPath);
}
