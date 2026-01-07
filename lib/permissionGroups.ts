import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { PermissionGroup } from '@/types';

// Default Permission Groups
const DEFAULT_GROUPS: Omit<PermissionGroup, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
    {
        name: 'Administradores',
        description: 'Acceso total al sistema. Pueden gestionar usuarios, proyectos, tareas y permisos.',
        color: '#ef4444', // red
        projectAccess: {
            viewAll: true,
            assignedOnly: false,
            create: true,
            edit: true,
            archive: true
        },
        taskAccess: {
            viewAll: true,
            assignedProjectsOnly: false,
            create: true,
            edit: true,
            delete: true
        },
        viewAccess: {
            dashboard: true,
            taskManager: true,
            taskDashboard: true,
            projectManagement: true,
            userManagement: true,
            weeklyEditor: true,
            dailyFollowUp: true
        },
        exportAccess: {
            tasks: true,
            projects: true,
            reports: true
        },
        specialPermissions: {
            viewAllUserProfiles: true,
            managePermissions: true,
            accessTrash: true,
            useCommandMenu: true
        }
    },
    {
        name: 'Project Managers',
        description: 'Gestores de proyecto. Pueden crear y administrar proyectos y tareas, pero no gestionar usuarios ni permisos.',
        color: '#3b82f6', // blue
        projectAccess: {
            viewAll: true,
            assignedOnly: false,
            create: true,
            edit: true,
            archive: false
        },
        taskAccess: {
            viewAll: true,
            assignedProjectsOnly: false,
            create: true,
            edit: true,
            delete: true
        },
        viewAccess: {
            dashboard: true,
            taskManager: true,
            taskDashboard: true,
            projectManagement: true,
            userManagement: false,
            weeklyEditor: true,
            dailyFollowUp: true
        },
        exportAccess: {
            tasks: true,
            projects: true,
            reports: true
        },
        specialPermissions: {
            viewAllUserProfiles: false,
            managePermissions: false,
            accessTrash: false,
            useCommandMenu: true
        }
    },
    {
        name: 'Equipo',
        description: 'Miembros del equipo. Solo pueden ver y trabajar en proyectos asignados. No pueden eliminar tareas ni gestionar proyectos.',
        color: '#10b981', // green
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
            taskManager: true,
            taskDashboard: true,
            projectManagement: false,
            userManagement: false,
            weeklyEditor: true,
            dailyFollowUp: true
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
    },
    {
        name: 'Consultor',
        description: 'Consultores externos. Pueden ver y trabajar en proyectos asignados con permisos de edición limitados.',
        color: '#f59e0b', // amber
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
            taskManager: true,
            taskDashboard: true,
            projectManagement: false,
            userManagement: false,
            weeklyEditor: true,
            dailyFollowUp: true
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
    },
    {
        name: 'Usuario Externo',
        description: 'Usuarios externos con acceso muy limitado. Solo pueden ver información de proyectos específicos asignados.',
        color: '#6b7280', // gray
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
            create: false,
            edit: false,
            delete: false
        },
        viewAccess: {
            dashboard: true,
            taskManager: false,
            taskDashboard: true,
            projectManagement: false,
            userManagement: false,
            weeklyEditor: false,
            dailyFollowUp: false
        },
        exportAccess: {
            tasks: false,
            projects: false,
            reports: false
        },
        specialPermissions: {
            viewAllUserProfiles: false,
            managePermissions: false,
            accessTrash: false,
            useCommandMenu: false
        }
    }
];

/**
 * Seeds default permission groups into Firestore
 * Only creates groups that don't already exist (checks by name)
 */
export async function seedPermissionGroups(createdBy: string = 'system'): Promise<void> {
    try {
        console.log('[seedPermissionGroups] Starting seed process...');

        const groupsCollection = collection(db, 'permission_groups');

        for (const groupData of DEFAULT_GROUPS) {
            // Check if group already exists
            const existingQuery = query(groupsCollection, where('name', '==', groupData.name));
            const existingDocs = await getDocs(existingQuery);

            if (existingDocs.empty) {
                // Create new group
                const newGroup = {
                    ...groupData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy
                };

                const docRef = await addDoc(groupsCollection, newGroup);
                console.log(`[seedPermissionGroups] Created group "${groupData.name}" with ID: ${docRef.id}`);
            } else {
                console.log(`[seedPermissionGroups] Group "${groupData.name}" already exists, skipping...`);
            }
        }

        console.log('[seedPermissionGroups] Seed process completed successfully!');
    } catch (error) {
        console.error('[seedPermissionGroups] Error seeding permission groups:', error);
        throw error;
    }
}

/**
 * Utility to call from browser console for initial setup
 * Usage: Open browser console and run:
 * 
 * import { seedPermissionGroups } from '@/lib/permissionGroups';
 * seedPermissionGroups('your-user-id');
 * 
 * Or add a button in UserRoleManagement to seed if empty
 */
export async function initializePermissionGroups(): Promise<boolean> {
    try {
        const groupsCollection = collection(db, 'permission_groups');
        const snapshot = await getDocs(groupsCollection);

        if (snapshot.empty) {
            console.log('[initializePermissionGroups] No groups found, seeding defaults...');
            await seedPermissionGroups();
            return true;
        } else {
            console.log(`[initializePermissionGroups] Found ${snapshot.size} existing groups, no seed needed.`);
            return false;
        }
    } catch (error) {
        console.error('[initializePermissionGroups] Error:', error);
        return false;
    }
}
