console.log('Start test-admin');
try {
    const admin = require('firebase-admin');
    console.log('firebase-admin loaded successfully');
} catch (e) {
    console.error('Failed to load firebase-admin:', e);
}
console.log('End test-admin');
