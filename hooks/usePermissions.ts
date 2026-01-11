import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PermissionGroup } from '@/types';

// Default Fallback Permissions based on Legacy Roles
const LEGACY_ROLE_MAP: Record<string, Partial<PermissionGroup>> = {
    'app_admin': {
        name: 'Admin Legacy',
        projectAccess: { viewAll: true, assignedOnly: false, create: true, edit: true, archive: true },
        taskAccess: { viewAll: true, assignedProjectsOnly: false, create: true, edit: true, delete: true },
        viewAccess: { dashboard: true, taskManager: true, taskDashboard: true, projectManagement: true, userManagement: true, weeklyEditor: true, dailyFollowUp: true },
        exportAccess: { tasks: true, projects: true, reports: true },
        specialPermissions: { viewAllUserProfiles: true, managePermissions: true, accessTrash: true, useCommandMenu: true }
    },
    'global_pm': {
        name: 'PM Legacy',
        projectAccess: { viewAll: true, assignedOnly: false, create: true, edit: true, archive: false },
        taskAccess: { viewAll: true, assignedProjectsOnly: false, create: true, edit: true, delete: true },
        viewAccess: { dashboard: true, taskManager: true, taskDashboard: true, projectManagement: true, userManagement: false, weeklyEditor: true, dailyFollowUp: true },
        exportAccess: { tasks: true, projects: true, reports: true },
        specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: true }
    },
    'usuario_base': {
        name: 'Usuario Legacy',
        projectAccess: { viewAll: false, assignedOnly: true, create: false, edit: false, archive: false },
        taskAccess: { viewAll: false, assignedProjectsOnly: true, create: true, edit: true, delete: false },
        viewAccess: { dashboard: true, taskManager: true, taskDashboard: true, projectManagement: false, userManagement: false, weeklyEditor: true, dailyFollowUp: true },
        exportAccess: { tasks: true, projects: false, reports: false },
        specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: true }
    },
    // Add other legacy roles if needed
    'consultor': {
        name: 'Consultor Legacy',
        projectAccess: { viewAll: false, assignedOnly: true, create: false, edit: false, archive: false },
        taskAccess: { viewAll: false, assignedProjectsOnly: true, create: true, edit: true, delete: false },
        viewAccess: { dashboard: true, taskManager: true, taskDashboard: true, projectManagement: false, userManagement: false, weeklyEditor: true, dailyFollowUp: true },
        exportAccess: { tasks: true, projects: false, reports: false },
        specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: true }
    },
};

const DEFAULT_PERMISSIONS: PermissionGroup = {
    id: 'default',
    name: 'Default',
    tenantId: '1',
    color: '#000000',
    description: 'Default restricted access',
    projectAccess: { viewAll: false, assignedOnly: true, create: false, edit: false, archive: false },
    taskAccess: { viewAll: false, assignedProjectsOnly: true, create: false, edit: false, delete: false },
    viewAccess: { dashboard: false, taskManager: false, taskDashboard: false, projectManagement: false, userManagement: false, weeklyEditor: false, dailyFollowUp: false },
    exportAccess: { tasks: false, projects: false, reports: false },
    specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
};

export function usePermissions() {
    const { user, userRole, loading: authLoading } = useAuth();
    const [permissions, setPermissions] = useState<PermissionGroup>(DEFAULT_PERMISSIONS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const loadPermissions = async () => {
            let permissionGroupId = null;

            // 0. Fetch User Profile to get Group ID
            try {
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    permissionGroupId = userSnap.data().permissionGroupId;
                }
            } catch (err) {
                console.error("Error fetching user profile for permissions", err);
            }

            // 1. If user has a specific Permission Group assigned, fetch it
            if (permissionGroupId) {
                try {
                    const groupRef = doc(db, 'permission_groups', permissionGroupId);
                    const groupSnap = await getDoc(groupRef);

                    if (groupSnap.exists()) {
                        setPermissions({ id: groupSnap.id, ...groupSnap.data() } as PermissionGroup);
                        setLoading(false);
                        return;
                    }
                    console.warn(`Permission Group ${permissionGroupId} not found. Falling back to role.`);
                } catch (error) {
                    console.error("Error loading permission group:", error);
                }
            }

            // 2. Fallback to Legacy Role Mapping
            if (userRole && LEGACY_ROLE_MAP[userRole]) {
                setPermissions({ ...DEFAULT_PERMISSIONS, ...LEGACY_ROLE_MAP[userRole] } as PermissionGroup);
            } else {
                // 3. Absolute fallback
                setPermissions(DEFAULT_PERMISSIONS);
            }
            setLoading(false);
        };

        loadPermissions();
    }, [user, userRole, authLoading]);

    const can = (action: string, context: string): boolean => {
        if (loading) return false;
        // Super Admin Bypass
        if (userRole === 'app_admin' || userRole === 'superadmin') return true;

        if (context === 'tasks') {
            if (action === 'delete') return permissions.taskAccess?.delete || false;
            if (action === 'create') return permissions.taskAccess?.create || false;
            if (action === 'edit') return permissions.taskAccess?.edit || false;
            if (action === 'view') return permissions.taskAccess?.viewAll || permissions.taskAccess?.assignedProjectsOnly || false;
        }
        if (context === 'projects') {
            // Add project logic
        }

        return false;
    };

    const isAdmin = () => {
        return userRole === 'app_admin' || permissions.specialPermissions?.managePermissions || false;
    };

    const getAllowedProjectIds = () => {
        if (permissions.projectAccess?.viewAll) return 'ALL';
        return 'ASSIGNED_ONLY';
    };

    return { permissions, loading, can, isAdmin, getAllowedProjectIds };
}
