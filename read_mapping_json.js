const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'mapping.json');
try {
    const content = fs.readFileSync(filePath, 'utf16le');
    console.log("UTF-16LE CONTENT:");
    console.log(content);
    // Write as UTF-8
    fs.writeFileSync(path.join(__dirname, 'mapping_utf8.json'), content, 'utf8');
} catch (e) {
    console.log("Error reading with UTF-16LE:", e);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log("UTF-8 CONTENT:");
        console.log(content);
    } catch (e2) {
        console.log("Error reading with UTF-8:", e2);
    }
}
