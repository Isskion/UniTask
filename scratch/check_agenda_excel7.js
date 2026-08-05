const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 tercera semana de julio.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: false });

const DAY_OFFSETS = [2, 7, 12, 17, 22, 27, 32];

for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let consultantRows = 0;
    let filledCells = 0;
    let candidateCells = 0;
    for (let ri = 3; ri < rows.length; ri++) {
        const row = rows[ri];
        const consultantName = String(row[1] || '').trim();
        if (!consultantName) continue;
        consultantRows++;
        DAY_OFFSETS.forEach(base => {
            const actividad = String(row[base + 1] || '').trim();
            const horario = String(row[base + 3] || '').trim();
            if (actividad || horario) filledCells++;
            if (actividad && horario) candidateCells++;
        });
    }
    console.log(`${sheetName}: filas=${rows.length}, consultantRows=${consultantRows}, filledCells=${filledCells}, candidateCells=${candidateCells}`);
}
