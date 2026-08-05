const xlsx = require('xlsx');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Tarifas\\Tarifas\\Costos\\Master Custos_Modelos.xlsx';
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['ER'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log("=========================================");
console.log("ANALYSIS OF MERIDA (ER) COST SHEET");
console.log("=========================================");

let currentVal = null;
let rangeStart = null;
let uniqueBrackets = [];

// Skip headers: row 0, 1, 2 are metadata/headers
for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || row[0] === undefined || row[1] === undefined) continue;
    const kg = row[0];
    const val = row[1];
    
    if (val !== currentVal) {
        if (currentVal !== null) {
            uniqueBrackets.push({
                start: rangeStart,
                end: data[i - 1][0],
                value: currentVal
            });
        }
        currentVal = val;
        rangeStart = kg;
    }
}

// Add last bracket
if (currentVal !== null) {
    uniqueBrackets.push({
        start: rangeStart,
        end: data[data.length - 1][0],
        value: currentVal
    });
}

console.log("Detected brackets in Mérida (ER) Cost Sheet:");
uniqueBrackets.forEach((b, idx) => {
    // Check if it's flat or per-kg
    const isPerKg = b.value < 0.5; // price-per-kg is small decimals
    console.log(`Bracket ${idx + 1}: ${b.start} kg to ${b.end} kg -> Value: ${b.value} (${isPerKg ? 'Per Kg' : 'Flat rate'})`);
});
