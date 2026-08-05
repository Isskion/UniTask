const xlsx = require('xlsx');
const wb = xlsx.readFile('C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 - 15 julio.xlsb', { cellDates: false });

for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    rows.forEach((row, ri) => {
        row.forEach((cell, ci) => {
            if (typeof cell === 'string' && /jesus|jesús/i.test(cell)) {
                console.log(`${sheetName} | row ${ri} col ${ci}: "${cell}"`);
            }
        });
    });
}
