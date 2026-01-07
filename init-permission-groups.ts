// Temporary script to seed permission groups
// Run this once to initialize the default permission groups in Firestore

import { seedPermissionGroups } from './lib/permissionGroups';

async function initGroups() {
    try {
        console.log('Starting permission groups initialization...');
        await seedPermissionGroups('system');
        console.log('✅ Permission groups initialized successfully!');
        console.log('You can now delete this file.');
    } catch (error) {
        console.error('❌ Error initializing permission groups:', error);
    }
}

initGroups();
