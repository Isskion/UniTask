const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\contexto_unigis\\Proyectos\\LS\\Programacion TMS.xlsx';

try {
    const workbook = XLSX.readFile(excelPath);
    console.log('Sheet Names:', workbook.SheetNames);
    
    let output = '# Excel Sheets Structure & Data\n\n';
    
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        output += `## Sheet: ${sheetName}\n`;
        output += `Total Rows: ${rows.length}\n\n`;
        
        if (rows.length === 0) {
            output += '_Empty sheet_\n\n';
            return;
        }
        
        // Render first 15 rows as a markdown table
        output += '### Sample Data (First 15 Rows):\n\n';
        
        // Find max columns in the sample to make a uniform table
        const sampleRows = rows.slice(0, 15);
        let maxCols = 0;
        sampleRows.forEach(r => {
            if (r.length > maxCols) maxCols = r.length;
        });
        
        // Table headers (using Row 0)
        const headers = Array.from({ length: maxCols }, (_, i) => {
            const val = sampleRows[0]?.[i];
            return val !== undefined && val !== null ? String(val).trim() : `Col ${i}`;
        });
        
        output += '| ' + headers.join(' | ') + ' |\n';
        output += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
        
        sampleRows.slice(1).forEach(row => {
            const cols = Array.from({ length: maxCols }, (_, i) => {
                const val = row[i];
                return val !== undefined && val !== null ? String(val).replace(/\r?\n/g, ' ').trim() : '';
            });
            output += '| ' + cols.join(' | ') + ' |\n';
        });
        
        output += '\n---\n\n';
    });
    
    fs.writeFileSync('C:\\Users\\daniel.delamo\\.gemini\\antigravity\\scratch\\UniTask\\scratch\\excel_dump.md', output);
    console.log('Successfully wrote dump to scratch/excel_dump.md');
} catch (e) {
    console.error('Error dumping excel:', e);
}
