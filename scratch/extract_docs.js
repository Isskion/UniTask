const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const files = [
    {
        input: 'C:\\Users\\daniel.delamo\\Downloads\\As Is Europastry (1).docx',
        output: path.join(__dirname, 'As_Is_Europastry.txt')
    },
    {
        input: 'C:\\Users\\daniel.delamo\\Downloads\\As Is Transpais (1).docx',
        output: path.join(__dirname, 'As_Is_Transpais.txt')
    }
];

async function run() {
    for (const file of files) {
        if (fs.existsSync(file.input)) {
            console.log(`Extracting: ${file.input} -> ${file.output}`);
            try {
                const result = await mammoth.extractRawText({ path: file.input });
                fs.writeFileSync(file.output, result.value, 'utf8');
                console.log(`Successfully extracted ${file.input} text to ${file.output}`);
            } catch (err) {
                console.error(`Error extracting ${file.input}:`, err);
            }
        } else {
            console.error(`File does not exist: ${file.input}`);
        }
    }
}

run().catch(err => console.error(err));
