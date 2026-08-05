const xlsx = require('xlsx');
const fs = require('fs');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Ventas\\Ventas\\Master Ventas_Modelos v.0.xlsx';
const workbook = xlsx.readFile(filePath);

const clientSheets = [
  'Essity PT',
  'Prime PT',
  'Bacardi PT',
  'LG PT',
  'Unilever PT',
  'Bacardi ES',
  'Spectrum ES',
  'Unilever ES',
  'Ferroli ES',
  'Diageo ES',
  'Procter PLV ES'
];

console.log("=========================================");
console.log("EXTRACTING DETAILED CLIENT RULES");
console.log("=========================================");

const clientRules = {};

clientSheets.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let baan = '';
    let cif = '';
    let contracts = [];
    let services = [];
    let specialNotes = [];
    
    // Parse metadata from top-left rows
    for (let i = 0; i < Math.min(data.length, 15); i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        // BAAN
        if (typeof row[0] === 'string' && row[0].toLowerCase().trim() === 'baan') {
            baan = row[1] || '';
        }
        // CIF
        if (typeof row[0] === 'string' && row[0].toLowerCase().trim() === 'cif') {
            cif = row[1] || '';
        }
        
        // Contratos
        if (typeof row[0] === 'string' && row[0].toLowerCase().trim() === 'contratos') {
            // Read subsequent rows until empty row[1] or similar
            for (let j = i; j < i + 10; j++) {
                const cRow = data[j];
                if (cRow && cRow[1] !== undefined && cRow[1] !== null && String(cRow[1]).trim() !== '' && String(cRow[1]).trim() !== 'Código cliente') {
                    const cCode = String(cRow[1]).trim();
                    const cDesc = cRow[2] ? String(cRow[2]).trim() : '';
                    if (cCode !== baan && !contracts.some(c => c.code === cCode)) {
                        contracts.push({ code: cCode, desc: cDesc });
                    }
                }
            }
        }
        
        // Tipos de servicio
        if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('tipos de serv'))) {
            // Find which column has the service codes. Usually it's in the middle
            const colIdx = row.findIndex(cell => typeof cell === 'string' && cell.toLowerCase().includes('tipos de serv'));
            for (let j = i + 1; j < i + 25; j++) {
                const sRow = data[j];
                if (sRow && sRow[colIdx] !== undefined && sRow[colIdx] !== null && String(sRow[colIdx]).trim() !== '') {
                    const sCode = String(sRow[colIdx]).trim();
                    const sDesc = sRow[colIdx + 1] ? String(sRow[colIdx + 1]).trim() : '';
                    if (!services.some(s => s.code === sCode)) {
                        services.push({ code: sCode, desc: sDesc });
                    }
                }
            }
        }
    }
    
    // Look for special headers or grids
    // E.g., if there's a row with "0 to 50 kg" or similar
    data.forEach((row, idx) => {
        if (!row) return;
        if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('to') && cell.toLowerCase().includes('kg'))) {
            specialNotes.push(`Encontrado grid de pesos en fila ${idx}: ${row.filter(c => c !== null && c !== '').slice(0, 8).join(', ')}...`);
        }
        if (row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('tarifa') && (cell.toLowerCase().includes('kg') || cell.toLowerCase().includes('pal')))) {
            specialNotes.push(`Encontrada columna de tarifa en fila ${idx}: ${row.filter(c => c !== null && c !== '').slice(0, 5).join(', ')}`);
        }
    });

    clientRules[sheetName] = {
        sheetName,
        baan,
        cif,
        contracts,
        services,
        specialNotes
    };
});

console.log(JSON.stringify(clientRules, null, 2));
