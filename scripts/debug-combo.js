console.log('Start debug-combo');
try {
    const admin = require('firebase-admin');
    console.log('Admin loaded');
    const dotenv = require('dotenv');
    console.log('Dotenv loaded');
    const path = require('path');
    const p = path.join(__dirname, '..', '.env.local');
    console.log('Configuring dotenv from', p);
    dotenv.config({ path: p });
    console.log('Dotenv configured');
} catch (e) {
    console.error('Crash:', e);
}
console.log('End debug-combo');
