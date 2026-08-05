const xlsx = require('xlsx');
const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 - IBERIA (2).xlsb';
const wb = xlsx.readFile(excelPath, { cellDates: false });
const ws = wb.Sheets['S4 Junio 26'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

const DAY_OFFSETS = [2, 7, 12, 17, 22, 27, 32];

function parseExcelDate(raw) {
    if (!raw) return null;
    const parts = raw.toString().trim().split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    return new Date(2000 + y, m - 1, d);
}

const entries = [];
for (let ri = 3; ri < rows.length; ri++) {
    const row = rows[ri];
    const consultantName = String(row[1] || '').trim();
    if (!/jesus/i.test(consultantName)) continue;
    DAY_OFFSETS.forEach((base, dayIdx) => {
        const actividad = String(row[base + 1] || '').trim();
        if (!actividad) return;
        const comentario = String(row[base + 2] || '').trim();
        const horario = String(row[base + 3] || '').trim();
        const date = parseExcelDate(String(row[base] || ''));
        entries.push({ date: date ? date.toISOString().slice(0,10) : null, actividad, comentario, horario });
    });
}

// Old dedup key (sin comment) vs new dedup key (con comment)
const oldKeys = new Set();
const newKeys = new Set();
let oldImported = 0, newImported = 0;
for (const e of entries) {
    const oldKey = `${e.date}::${e.actividad}::${e.horario}`;
    const newKey = `${e.date}::${e.actividad}::${e.horario}::${e.comentario.toUpperCase()}`;
    if (!oldKeys.has(oldKey)) { oldKeys.add(oldKey); oldImported++; }
    if (!newKeys.has(newKey)) { newKeys.add(newKey); newImported++; }
}

console.log(`Total filas candidatas: ${entries.length}`);
console.log(`Importadas con dedup ANTIGUO (sin comentario): ${oldImported}`);
console.log(`Importadas con dedup NUEVO (con comentario): ${newImported}`);

console.log('\nEntradas UNIGIS de tipo Tareas a Realizar:');
entries.filter(e => e.actividad === 'Tareas a Realizar' && /unigis/i.test(e.comentario))
    .forEach(e => console.log(`  ${e.date} | ${e.comentario} | horario="${e.horario}"`));
