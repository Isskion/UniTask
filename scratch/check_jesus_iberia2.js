const xlsx = require('xlsx');
const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 - IBERIA (2).xlsb';
const wb = xlsx.readFile(excelPath, { cellDates: false });

console.log('Sheets:', wb.SheetNames);

const DAY_OFFSETS = [2, 7, 12, 17, 22, 27, 32];
const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

function dump(sheetName) {
    const ws = wb.Sheets[sheetName];
    if (!ws) { console.log(`Hoja "${sheetName}" no existe`); return; }
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log(`\n=== ${sheetName} (rows=${rows.length}) ===`);
    for (let ri = 3; ri < rows.length; ri++) {
        const row = rows[ri];
        const consultantName = String(row[1] || '').trim();
        if (!consultantName || !/jesus|jesús/i.test(consultantName)) continue;
        DAY_OFFSETS.forEach((base, dayIdx) => {
            const fechaT = String(row[base] || '').trim();
            const actividad = String(row[base + 1] || '').trim();
            const comentario = String(row[base + 2] || '').trim();
            const horario = String(row[base + 3] || '').trim();
            const resultado = String(row[base + 4] || '').trim();
            if (!actividad && !comentario && !horario) return;
            console.log(`row${ri} ${consultantName} | ${DAY_NAMES[dayIdx]} Fecha_T="${fechaT}" Actividad="${actividad}" Comentario="${comentario}" Horario="${horario}" Resultado="${resultado}"`);
        });
    }
}

const targetSheets = wb.SheetNames.filter(n => /junio/i.test(n) && /4|cuarta/i.test(n));
console.log('Hojas candidatas semana 4 junio:', targetSheets);
targetSheets.forEach(dump);
