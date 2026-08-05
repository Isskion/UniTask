const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const folderPath = 'C:\\Users\\daniel.delamo\\Downloads\\Ventas\\Ventas';
const files = fs.readdirSync(folderPath);

console.log("Analyzing files in folder:", folderPath);
files.forEach(file => {
    if (!file.endsWith('.xlsx')) return;
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);
    console.log(`\nFile: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    try {
        const workbook = xlsx.readFile(filePath);
        console.log("Sheets:", workbook.SheetNames);
        
        // Print first 5 rows of each sheet
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            console.log(`  Sheet "${sheetName}": ${data.length} rows`);
            console.log("  Headers/First rows:");
            data.slice(0, 5).forEach((row, i) => {
                console.log(`    [Row ${i}]:`, row ? row.slice(0, 10) : []); // Limit to first 10 columns
            });
        });
    } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
    }
});
