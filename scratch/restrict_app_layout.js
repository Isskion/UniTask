const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, '../components/AppLayout.tsx');

if (!fs.existsSync(layoutPath)) {
    console.error(`File not found: ${layoutPath}`);
    process.exit(1);
}

let content = fs.readFileSync(layoutPath, 'utf8');

// Find and replace the desktop/sidebar link
const desktopTarget = `<NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />`;
const desktopReplacement = `{getRoleLevel(userRole) >= RoleLevel.ADMIN && (\n                                <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />\n                            )}`;

// Wait, the spacing in the replacement:
// If it is in the desktop menu (under line 364), the indentation is 28 spaces or similar.
// Let's verify how many spaces there are before the navlink at line 364.
// Line 364 is: "                            <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />"
// It has 28 spaces.
// Let's make sure the replacement has matching indentation.

// Let's check mobile menu indentation:
// Line 590: "                                 <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />"
// It has 33 spaces.

// To be safe and precise, we can match and replace by split/join or custom regex.
// Let's do it using exact lines.

content = content.replace(
    `                            <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />`,
    `                            {getRoleLevel(userRole) >= RoleLevel.ADMIN && (\n                                <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />\n                            )}`
);

content = content.replace(
    `                                 <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />`,
    `                                 {getRoleLevel(userRole) >= RoleLevel.ADMIN && (\n                                     <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />\n                                 )}`
);

fs.writeFileSync(layoutPath, content, 'utf8');
console.log("Successfully restricted UniHumanize in AppLayout.tsx!");
