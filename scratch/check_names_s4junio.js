const xlsx = require('xlsx');
const wb = xlsx.readFile('C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 - 15 julio.xlsb', { cellDates: false });
const ws = wb.Sheets['S4 Junio 26'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
const names = new Set();
for (let ri = 3; ri < rows.length; ri++) {
    const n = String(rows[ri][1] || '').trim();
    if (n) names.add(n);
}
console.log([...names]);
