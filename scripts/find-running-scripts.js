
const { execSync } = require('child_process');
const fs = require('fs');

try {
    const output = execSync('wmic process where "name=\'node.exe\'" get commandline,processid /format:list', { encoding: 'utf8' });
    fs.writeFileSync('scripts/running_node_details.txt', output);
    console.log('✅ List saved to scripts/running_node_details.txt');
} catch (err) {
    // Try PowerShell alternative if wmic fails
    try {
        const psOutput = execSync('powershell "Get-CimInstance Win32_Process -Filter \\"name = \'node.exe\'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json"', { encoding: 'utf8' });
        fs.writeFileSync('scripts/running_node_details.json', psOutput);
        console.log('✅ List saved to scripts/running_node_details.json');
    } catch (err2) {
        console.error('❌ Failed to get process list:', err2.message);
    }
}
