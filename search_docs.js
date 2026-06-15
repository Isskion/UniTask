const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const searchDir = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais';
const keywords = [/tipo\s*de?\s*pedido/i, /tipo\s*de?\s*orden/i, /tipopedido/i, /tipo_pedido/i, /tipoorden/i];

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

async function searchWord(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;
        keywords.forEach(kw => {
            if (kw.test(text)) {
                console.log(`[MATCH] Word file: ${filePath} matches ${kw}`);
                // Print surrounding context
                const lines = text.split('\n');
                lines.forEach((line, idx) => {
                    if (kw.test(line)) {
                        console.log(`  Line ${idx}: ${line.trim()}`);
                    }
                });
            }
        });
    } catch (err) {
        // ignore errors
    }
}

async function searchExcel(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const csv = xlsx.utils.sheet_to_csv(sheet);
            keywords.forEach(kw => {
                if (kw.test(csv)) {
                    console.log(`[MATCH] Excel file: ${filePath} (Sheet: ${sheetName}) matches ${kw}`);
                    const lines = csv.split('\n');
                    lines.forEach((line, idx) => {
                        if (kw.test(line)) {
                            console.log(`  Row ${idx}: ${line.trim()}`);
                        }
                    });
                }
            });
        });
    } catch (err) {
        // ignore
    }
}

async function searchPdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        const text = data.text;
        keywords.forEach(kw => {
            if (kw.test(text)) {
                console.log(`[MATCH] PDF file: ${filePath} matches ${kw}`);
                const lines = text.split('\n');
                lines.forEach((line, idx) => {
                    if (kw.test(line)) {
                        console.log(`  Line ${idx}: ${line.trim()}`);
                    }
                });
            }
        });
    } catch (err) {
        // ignore
    }
}

async function main() {
    console.log("Starting search in:", searchDir);
    walkDir(searchDir, async (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.docx') {
            await searchWord(filePath);
        } else if (ext === '.xlsx') {
            await searchExcel(filePath);
        } else if (ext === '.pdf') {
            await searchPdf(filePath);
        }
    });
}

main().catch(err => console.error(err));
