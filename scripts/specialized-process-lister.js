
const { execSync } = require('child_process');
const pid = process.argv[2];

if (!pid) {
    console.log('Usage: node specialized-process-lister.js <pid>');
    process.exit(1);
}

try {
    const output = execSync(`powershell "(Get-CimInstance Win32_Process -Filter \\"ProcessId = ${pid}\\").CommandLine"`, { encoding: 'utf8' });
    console.log(`\n--- PID ${pid} COMMAND LINE ---`);
    console.log(output);
} catch (err) {
    console.error('❌ Error:', err.message);
}
