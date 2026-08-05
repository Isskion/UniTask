const xlsx = require('xlsx');
const fs = require('fs');

const folderPath = 'C:\\Users\\daniel.delamo\\Downloads\\Ventas\\Ventas';

function analyzeFile(fileName, sheetName, numRows = 30) {
    const filePath = `${folderPath}/${fileName}`;
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    console.log(`\n=========================================`);
    console.log(`ANALYSIS OF ${fileName} -> Sheet "${sheetName}"`);
    console.log(`=========================================`);
    try {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            console.log(`Sheet "${sheetName}" not found in ${fileName}. Available:`, workbook.SheetNames);
            return;
        }
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`Total rows: ${data.length}`);
        
        // Print first numRows
        data.slice(0, numRows).forEach((row, idx) => {
            console.log(`Row ${idx}:`, row);
        });
    } catch (err) {
        console.error(`Error:`, err.message);
    }
}

// 1. Analyze 'Tarifa' in 'Ejemplos de tabla de tarifas.xlsx'
analyzeFile('Ejemplos de tabla de tarifas.xlsx', 'Tarifa', 40);

// 2. Analyze 'Dudas LS' in 'Ejemplos de tabla de tarifas.xlsx'
analyzeFile('Ejemplos de tabla de tarifas.xlsx', 'Dudas LS', 25);

// 3. Analyze some columns of 'Levantamiento clientes ' in 'Master Ventas_Modelos v.0.xlsx'
analyzeFile('Master Ventas_Modelos v.0.xlsx', 'Levantamiento clientes ', 20);

// 4. Analyze 'Modelos' in 'Master Ventas_Modelos v.0.xlsx'
analyzeFile('Master Ventas_Modelos v.0.xlsx', 'Modelos', 30);
