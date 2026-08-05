const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 tercera semana de julio.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: false });

const sheetName = 'S3 Julio 26';
const ws = wb.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log("weekLabel (row0 col2):", JSON.stringify(rows[0]?.[2]));
console.log("row1:", rows[1]?.slice(0, 6));
console.log("row2 (headers):", rows[2]?.slice(0, 8));

// ACTIVIDAD_MAP keys (mirroring lib/agenda-import.ts)
const ACTIVIDAD_MAP = {
    'Reunión Cliente': 1, 'Reunion Cliente': 1,
    'Reunión UNIGIS': 1, 'Reunion UNIGIS': 1,
    'Reunión Presencial': 1, 'Reunion Presencial': 1,
    'Reunión Interna': 1, 'Reunion Interna': 1,
    'Tareas a Realizar': 1, 'Comercial': 1,
    'Vacaciones': 1, 'Viaje': 1, 'Especial': 1,
};

const DAY_OFFSETS = [2, 7, 12, 17, 22, 27, 32];

let consultantRows = 0, candidateCells = 0, unknownActivity = 0;
const sampleEntries = [];
for (let ri = 3; ri < rows.length; ri++) {
    const row = rows[ri];
    const consultantName = String(row[1] || '').trim();
    if (!consultantName) continue;
    consultantRows++;

    for (let dayIdx = 0; dayIdx < DAY_OFFSETS.length; dayIdx++) {
        const base = DAY_OFFSETS[dayIdx];
        const actividad  = String(row[base + 1] || '').trim();
        const horario    = String(row[base + 3] || '').trim();
        if (!actividad || !horario) continue;
        candidateCells++;
        if (!ACTIVIDAD_MAP[actividad]) {
            unknownActivity++;
            if (sampleEntries.length < 5) sampleEntries.push({ consultantName, dayIdx, actividad: '(UNKNOWN: ' + actividad + ')', horario });
            continue;
        }
        if (sampleEntries.length < 8) sampleEntries.push({ consultantName, dayIdx, actividad, horario });
    }
}

console.log("\nconsultantRows:", consultantRows);
console.log("candidateCells:", candidateCells);
console.log("unknownActivity:", unknownActivity);
console.log("\nSample entries (consultantName, dayIdx[0=lunes], actividad, horario):");
sampleEntries.forEach(e => console.log(" ", e));
