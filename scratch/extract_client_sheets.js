const xlsx = require('xlsx');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Ventas\\Ventas\\Master Ventas_Modelos v.0.xlsx';
const workbook = xlsx.readFile(filePath);

const clientSheets = [
  'Essity PT',
  'Prime PT',
  'Bacardi PT',
  'LG PT',
  'Unilever PT',
  'Bacardi ES',
  'Spectrum ES',
  'Unilever ES',
  'Ferroli ES',
  'Diageo ES',
  'Procter PLV ES'
];

console.log("=========================================");
console.log("CLIENT SHEETS SCHEMAS & PREVIEWS");
console.log("=========================================");

clientSheets.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n--- Sheet "${sheetName}" (${data.length} rows) ---`);
    
    // Find first non-empty row that looks like headers
    let headerIdx = -1;
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row.length > 3 && row.some(cell => typeof cell === 'string' && (cell.toLowerCase().includes('tarifa') || cell.toLowerCase().includes('código') || cell.toLowerCase().includes('precio')))) {
            headerIdx = i;
            break;
        }
    }
    
    if (headerIdx === -1) {
        // Fallback to first non-empty row
        for (let i = 0; i < data.length; i++) {
            if (data[i] && data[i].length > 1) {
                headerIdx = i;
                break;
            }
        }
    }
    
    console.log(`Detected header row index: ${headerIdx}`);
    if (headerIdx !== -1) {
        console.log("Headers:", data[headerIdx]);
        console.log("Sample Data Rows:");
        let count = 0;
        for (let i = headerIdx + 1; i < data.length; i++) {
            if (data[i] && data[i].length > 0 && data[i].some(c => c !== null && c !== undefined)) {
                console.log(`  Row ${i}:`, data[i].slice(0, 12));
                count++;
                if (count >= 5) break;
            }
        }
    }
});
