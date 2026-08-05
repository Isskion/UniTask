const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 - 15 julio.xlsb';
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

for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 4) continue;

    let consultantRows = 0, candidateCells = 0, invalidDateCells = 0, unknownActivity = 0, ok = 0;
    for (let ri = 3; ri < rows.length; ri++) {
        const row = rows[ri];
        const consultantName = String(row[1] || '').trim();
        if (!consultantName) continue;
        consultantRows++;
        DAY_OFFSETS.forEach((base, dayIdx) => {
            const actividad = String(row[base + 1] || '').trim();
            const horario = String(row[base + 3] || '').trim();
            if (!actividad || !horario) return;
            candidateCells++;
            const date = parseExcelDate(String(row[base] || ''));
            if (!date) { invalidDateCells++; return; }
            if (!ACTIVIDAD_MAP.has(actividad)) { unknownActivity++; return; }
            ok++;
        });
    }
    console.log(`${sheetName}: consultantRows=${consultantRows}, candidateCells=${candidateCells}, invalidDateCells=${invalidDateCells}, unknownActivity=${unknownActivity}, ok=${ok}`);
}
