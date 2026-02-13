
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function restoreConsultant() {
    console.log("--- RESTORING CONSULTANT GROUP IN TENANT 3 ---");

    // Standard Consultant Permissions (based on lib/permissionGroups.ts)
    const newGroup = {
        name: 'Consultor',
        description: 'Consultor externo. Puede ver y trabajar en proyectos asignados con permisos de edición limitada.',
        color: '#f59e0b', // amber
        tenantId: "3",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: 'system_restore',
        projectAccess: {
            viewAll: false,
            assignedOnly: true,
            create: false,
            edit: false,
            archive: false
        },
        taskAccess: {
            viewAll: false,
            assignedProjectsOnly: true,
            create: true,
            edit: true,
            delete: false
        },
        viewAccess: {
            dashboard: true,
            taskManager: true, // Typically true for consultants working on tasks
            taskDashboard: true,
            projectManagement: false,
            userManagement: false,
            weeklyEditor: true,
            dailyFollowUp: true,
            knowledgeBase: true,
            sprintManagement: false,
            dispoPlan: true,
            unavailabilityRegistry: true // KEY FIX
        },
        exportAccess: {
            tasks: true,
            projects: false,
            reports: false
        },
        specialPermissions: {
            viewAllUserProfiles: false,
            managePermissions: false,
            accessTrash: false,
            useCommandMenu: true
        }
    };

    const res = await db.collection('permission_groups').add(newGroup);
    console.log(`Created 'Consultor' group with ID: ${res.id}`);
}

restoreConsultant();
