const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local not found!");
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split(/\r?\n/);
let cleanContent = "";

lines.forEach(line => {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // Split by first equals sign
    const parts = trimmed.split('=');
    if (parts.length < 2) return;

    const key = parts[0].trim();
    let value = parts.slice(1).join('=').trim();

    // Remove quotes if present
    value = value.replace(/^["'](.*)["']$/, '$1');

    cleanContent += `${key}=${value}\n`;
});

fs.writeFileSync(envPath, cleanContent, 'utf8');
console.log("✅ .env.local cleaned and repaired!");
console.log("--- New Content Preview ---");
console.log(cleanContent);
