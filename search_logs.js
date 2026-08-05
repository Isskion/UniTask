const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\daniel.delamo\\.gemini\\antigravity\\brain\\535a01bf-98af-42a3-aab1-d7a69b245000\\.system_generated\\logs\\transcript.jsonl';

const keywords = [/univiso/i, /uniflux/i, /unileaks/i, /visualmapper/i, /visual/i, /validator/i, /mapeo/i];

async function search() {
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        let matched = false;
        let matchedWord = '';
        for (const kw of keywords) {
            if (kw.test(line)) {
                matched = true;
                matchedWord = kw.toString();
                break;
            }
        }
        if (matched) {
            try {
                const obj = JSON.parse(line);
                console.log(`Line ${lineNum} matches ${matchedWord}:`);
                console.log(`  Type: ${obj.type}, Source: ${obj.source}`);
                if (obj.content) {
                    console.log(`  Content: ${obj.content.substring(0, 300)}...`);
                }
            } catch (e) {
                console.log(`Line ${lineNum} (failed to parse JSON) matches ${matchedWord}:`);
                console.log(`  Text: ${line.substring(0, 300)}...`);
            }
        }
    }
}

search().catch(console.error);
