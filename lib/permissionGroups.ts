import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { PermissionGroup } from '@/types';

// Default Permission Groups
const DEFAULT_GROUPS: Omit<PermissionGroup, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
    {
        name: 'Administradores',
        description: 'Acceso total al sistema. Pueden gestionar usuarios, proyectos, tareas y permisos.',
        color: '#ef4444', // red
        tenantId: "1",
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
        tenantId: "1",
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
        tenantId: "1",
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
        tenantId: "1",
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
        tenantId: "1",
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

/**
 * [NEW] Populate Tenant with Template Groups & Link Users
 * 1. Clones groups from Tenant "1" (Template) to targetTenantId
 * 2. Links existing users in targetTenantId to these new groups based on legacy role
 */
import { writeBatch } from 'firebase/firestore'; // Import batch

export async function startTenantPopulation(targetTenantId: string, createdBy: string = 'system'): Promise<string> {
    console.log(`[Population] Starting for Tenant: ${targetTenantId}`);
    const logs: string[] = [];

    try {
        // 1. Fetch Template Groups (Tenant 1)
        const qTemplate = query(collection(db, 'permission_groups'), where('tenantId', '==', '1'));
        const templateSnap = await getDocs(qTemplate);

        let groupsToClone: any[] = [];

        if (templateSnap.empty) {
            logs.push("⚠️ No template groups in Tenant 1. Using Hardcoded Defaults.");
            groupsToClone = DEFAULT_GROUPS;
        } else {
            groupsToClone = templateSnap.docs.map(d => {
                const data = d.data();
                // Clean system fields to create fresh copies
                const { id, createdAt, updatedAt, ...rest } = data as any;
                return rest;
            });
        }

        // 2. Create Groups in Target Tenant
        const createdGroupsMap: Record<string, string> = {}; // Name -> NewID (for user linking)

        for (const group of groupsToClone) {
            // Check existence to avoid dupes
            const qExists = query(
                collection(db, 'permission_groups'),
                where('tenantId', '==', targetTenantId),
                where('name', '==', group.name)
            );
            const existsSnap = await getDocs(qExists);

            let groupId = "";
            if (existsSnap.empty) {
                const newGroup = {
                    ...group,
                    tenantId: targetTenantId,
                    createdBy,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };
                const ref = await addDoc(collection(db, 'permission_groups'), newGroup);
                groupId = ref.id;
                logs.push(`✅ Created group: ${group.name}`);
            } else {
                groupId = existsSnap.docs[0].id;
                logs.push(`ℹ️ Group already exists: ${group.name}`);
            }
            createdGroupsMap[group.name] = groupId;
        }

        // 3. Link Existing Users (Auto-Correction)
        const qUsers = query(collection(db, 'users'), where('tenantId', '==', targetTenantId));
        const usersSnap = await getDocs(qUsers);

        if (!usersSnap.empty) {
            const batch = writeBatch(db);
            let batchCount = 0;

            // Map Legacy Roles to Group Names
            // Ensure these match DEFAULT_GROUPS names exactly
            const ROLE_TO_GROUP_NAME: Record<string, string> = {
                'superadmin': 'Administradores',
                'app_admin': 'Administradores',
                'global_pm': 'Project Managers',
                'usuario_base': 'Equipo',
                'consultor': 'Consultor',
                'usuario_externo': 'Usuario Externo'
            };

            usersSnap.docs.forEach(userDoc => {
                const uData = userDoc.data();
                const role = uData.role as string;
                const targetGroupName = ROLE_TO_GROUP_NAME[role];

                if (targetGroupName && createdGroupsMap[targetGroupName]) {
                    const newGroupId = createdGroupsMap[targetGroupName];

                    // Update if missing or different
                    if (uData.permissionGroupId !== newGroupId) {
                        batch.update(userDoc.ref, { permissionGroupId: newGroupId });
                        batchCount++;
                        logs.push(`🔗 Linked user ${uData.email} (${role}) -> Group: ${targetGroupName}`);
                    }
                } else if (!targetGroupName) {
                    logs.push(`⚠️ Unknown role '${role}' for user ${uData.email}, skipped.`);
                }
            });

            if (batchCount > 0) {
                await batch.commit();
                logs.push(`🎉 Successfully updated ${batchCount} users.`);
            } else {
                logs.push("No users needed linking.");
            }
        } else {
            logs.push("No users found in this tenant.");
        }

        return logs.join('\n');

    } catch (error: any) {
        console.error("Population Error:", error);
        throw new Error("Failed to populate: " + error.message);
    }
}
