const xlsx = require('xlsx');

const excelPath = 'C:\\Users\\daniel.delamo\\Downloads\\AGENDA SEMANAL 2026 tercera semana de julio.xlsx';
const wb = xlsx.readFile(excelPath, { cellDates: false, cellFormula: true });

for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const c2 = ws['C2'];
    const c4 = ws['C4'];
    console.log(sheetName.padEnd(20),
        'C2=', c2 ? JSON.stringify({v:c2.v,t:c2.t,f:c2.f}) : '(vacío)',
        '| C4=', c4 ? JSON.stringify({v:c4.v,t:c4.t,f:c4.f,w:c4.w}) : '(vacío)');
}
