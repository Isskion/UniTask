// Simula la logica de executeImport (lib/agenda-import.ts) sin Firestore real,
// para verificar que un cambio de Resultado entre dos importaciones se cuenta
// como "updated" y no como "written" (nuevo) ni "skipped" (sin cambios).

function normalizeSchedule(raw) {
    if (!raw) return { scheduleRaw: '' };
    const n = raw.toUpperCase().trim().replace(/\s+/g, ' ');
    return { scheduleRaw: n };
}

function buildKey(e) {
    const normComment = e.comment.trim().toUpperCase();
    const { scheduleRaw } = normalizeSchedule(e.scheduleRaw);
    return `${e.consultantId}::${e.dateISO}::${e.activityType}::${scheduleRaw}::${normComment}`;
}

// Estado "antes" (lo que ya hay en Firestore, importado la semana pasada)
const existingDocs = [
    { id: 'doc1', consultantId: 'jesus', dateISO: '2026-06-22', activityType: 'Tareas a Realizar', scheduleRaw: '', comment: 'LOGIFRIO / RESOLUCION DE EPS', result: 'Por Hacer' },
    { id: 'doc2', consultantId: 'jesus', dateISO: '2026-06-22', activityType: 'Tareas a Realizar', scheduleRaw: '', comment: 'UNIGIS / CONSULTA Y APOYO A SOPORTE', result: 'Por Hacer' },
    { id: 'doc3', consultantId: 'jesus', dateISO: '2026-06-22', activityType: 'Reunion UNIGIS', scheduleRaw: '10:00 A 11:00', comment: 'UNIGIS / WEEKLY', result: 'Hecho' },
];

// Nueva pasada del Excel: doc1 ahora "Hecho", doc2 ahora "Cancelado", doc3 sin cambios,
// + una fila nueva que no existia antes.
const incomingEntries = [
    { consultantId: 'jesus', dateISO: '2026-06-22', activityType: 'Tareas a Realizar', scheduleRaw: '', comment: 'LOGIFRIO / RESOLUCION DE EPS', result: 'Hecho' },
    { consultantId: 'jesus', dateISO: '2026-06-22', activityType: 'Tareas a Realizar', scheduleRaw: '', comment: 'UNIGIS / CONSULTA Y APOYO A SOPORTE', result: 'Cancelado' },
    { consultantId: 'jesus', dateISO: '2026-06-22', activityType: 'Reunion UNIGIS', scheduleRaw: '10:00 A 11:00', comment: 'UNIGIS / WEEKLY', result: 'Hecho' },
    { consultantId: 'jesus', dateISO: '2026-06-22', activityType: 'Comercial', scheduleRaw: '', comment: 'PROGELCONE / PRUEBA DE CONCEPTO', result: 'Por Hacer' },
];

const existingByKey = new Map();
existingDocs.forEach(d => existingByKey.set(buildKey(d), { id: d.id, result: d.result }));

let written = 0, updated = 0, skipped = 0;
const updates = [];
for (const entry of incomingEntries) {
    const key = buildKey(entry);
    const existing = existingByKey.get(key);
    if (existing) {
        if (existing.id && existing.result !== entry.result) {
            updates.push({ id: existing.id, from: existing.result, to: entry.result });
            updated++;
        } else {
            skipped++;
        }
        continue;
    }
    existingByKey.set(key, { id: '', result: entry.result });
    written++;
}

console.log('written:', written, '(esperado 1, la fila Comercial nueva)');
console.log('updated:', updated, '(esperado 2: doc1 Por Hacer->Hecho, doc2 Por Hacer->Cancelado)');
console.log('skipped:', skipped, '(esperado 1: doc3 sin cambios)');
console.log('updates:', updates);
