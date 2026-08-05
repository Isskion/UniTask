const xlsx = require('xlsx');

const filePath = 'C:\\Users\\daniel.delamo\\Downloads\\Tarifas\\Tarifas\\Costos\\Master Custos_Modelos.xlsx';
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['ER'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log("=========================================");
console.log("ER TARIFF TRANSITION POINTS");
console.log("=========================================");

// Print some rows around transitions
function printRange(start, count) {
    console.log(`\nRange ${start} to ${start + count - 1}:`);
    data.slice(start, start + count).forEach((row, i) => {
        console.log(`  [Row ${start + i}]:`, row);
    });
}

printRange(2, 6);      // Start (1 kg to 4 kg)
printRange(10, 5);     // 8 kg to 12 kg
printRange(100, 5);    // 98 kg to 102 kg
printRange(500, 5);    // 498 kg to 502 kg
printRange(1000, 5);   // 998 kg to 1002 kg
printRange(2000, 5);   // 1998 kg to 2002 kg
printRange(5000, 5);   // 4998 kg to 5002 kg
printRange(9995, 8);   // End

// Let's analyze the formula or relationship:
// Up to what weight is it flat, and when does it become per-kg?
// Let's check if the value is flat or per-kilo by doing value * weight or just value.
console.log("\nMathematical analysis of values:");
[3, 10, 100, 500, 1000, 2000, 5000, 9999].forEach(idx => {
    const row = data[idx];
    if (row) {
        const kg = row[0];
        const val = row[1];
        console.log(`Weight: ${kg} kg, Value in sheet: ${val}, val * kg = ${typeof val === 'number' ? (val * kg).toFixed(4) : val}`);
    }
});
