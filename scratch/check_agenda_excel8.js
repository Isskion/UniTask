const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 tercera semana de julio.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: false, cellFormula: true });

const DAY_OFFSETS = [2, 7, 12, 17, 22, 27, 32];

function parseExcelDate(raw) {
    if (!raw) return null;
    const parts = raw.toString().trim().split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    return new Date(2000 + y, m - 1, d);
}

const ACTIVIDAD_MAP = new Set([
    'Reunión Cliente', 'Reunion Cliente', 'Reunión UNIGIS', 'Reunion UNIGIS',
    'Reunión Presencial', 'Reunion Presencial', 'Reunión Interna', 'Reunion Interna',
    'Tareas a Realizar', 'Comercial', 'Vacaciones', 'Viaje', 'Especial',
]);

for (const sheetName of ['S3 Junio 26', 'S1 Junio 26', 'S2 Junio 26']) {
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let candidateCells = 0, invalidDateCells = 0, unknownActivity = 0, ok = 0;
    const sample = [];
    for (let ri = 3; ri < rows.length; ri++) {
        const row = rows[ri];
        const consultantName = String(row[1] || '').trim();
        if (!consultantName) continue;
        DAY_OFFSETS.forEach((base, dayIdx) => {
            const actividad = String(row[base + 1] || '').trim();
            const horario = String(row[base + 3] || '').trim();
            if (!actividad || !horario) return;
            candidateCells++;
            const rawDate = String(row[base] || '');
            const date = parseExcelDate(rawDate);
            if (!date) {
                invalidDateCells++;
                if (sample.length < 5) sample.push({ ri, dayIdx, rawDate, actividad, horario, issue: 'invalidDate' });
                return;
            }
            if (!ACTIVIDAD_MAP.has(actividad)) {
                unknownActivity++;
                if (sample.length < 5) sample.push({ ri, dayIdx, rawDate, actividad, horario, issue: 'unknownActivity' });
                return;
            }
            ok++;
        });
    }
    console.log(`\n=== ${sheetName} ===`);
    console.log({ candidateCells, invalidDateCells, unknownActivity, ok });
    console.log('sample issues:', sample);
}
