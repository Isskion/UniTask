const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, '../components/AppLayout.tsx');

if (!fs.existsSync(layoutPath)) {
    console.error(`File not found: ${layoutPath}`);
    process.exit(1);
}

let content = fs.readFileSync(layoutPath, 'utf8');

const targetStr = `<NavLink href="/UniTrace" target="_blank" icon={Radar} label={t('nav.unitrace') || 'UniTrace'} />`;
const replacementStr = `<NavLink href="/UniTrace" target="_blank" icon={Radar} label={t('nav.unitrace') || 'UniTrace'} />\n                            <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />`;

if (!content.includes(targetStr)) {
    console.error("Target string not found in AppLayout.tsx!");
    process.exit(1);
}

// Replace all occurrences
content = content.split(targetStr).join(replacementStr);

fs.writeFileSync(layoutPath, content, 'utf8');
console.log("Successfully patched AppLayout.tsx with UniHumanize links!");
