import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PermissionGroup, UserProfile } from '@/types';

// Default permissions for legacy roles (fallback)
const LEGACY_ROLE_PERMISSIONS: Record<string, Partial<PermissionGroup>> = {
    app_admin: {
        projectAccess: { viewAll: true, assignedOnly: false, create: true, edit: true, archive: true },
        taskAccess: { viewAll: true, assignedProjectsOnly: false, create: true, edit: true, delete: true },
        viewAccess: { dashboard: true, taskManager: true, taskDashboard: true, projectManagement: true, userManagement: true, weeklyEditor: true, dailyFollowUp: true },
        exportAccess: { tasks: true, projects: true, reports: true },
        specialPermissions: { viewAllUserProfiles: true, managePermissions: true, accessTrash: true, useCommandMenu: true }
    },
    global_pm: {
        projectAccess: { viewAll: true, assignedOnly: false, create: true, edit: true, archive: true },
        taskAccess: { viewAll: true, assignedProjectsOnly: false, create: true, edit: true, delete: true },
        viewAccess: { dashboard: true, taskManager: true, taskDashboard: true, projectManagement: true, userManagement: true, weeklyEditor: true, dailyFollowUp: true },
        exportAccess: { tasks: true, projects: true, reports: true },
        specialPermissions: { viewAllUserProfiles: true, managePermissions: true, accessTrash: true, useCommandMenu: true }
    },
    usuario_base: {
        projectAccess: { viewAll: false, assignedOnly: true, create: false, edit: false, archive: false },
        taskAccess: { viewAll: false, assignedProjectsOnly: true, create: true, edit: true, delete: false },
        viewAccess: { dashboard: true, taskManager: true, taskDashboard: true, projectManagement: false, userManagement: false, weeklyEditor: true, dailyFollowUp: true },
        exportAccess: { tasks: true, projects: false, reports: false },
        specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: true }
    }
};

export function usePermissions() {
    const { user, userRole } = useAuth();
    const [permissions, setPermissions] = useState<PermissionGroup | null>(null);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const loadPermissions = async () => {
            try {
                // 1. Load user profile
                const userDoc = await getDoc(doc(db, 'user', user.uid));
                if (!userDoc.exists()) {
                    console.warn('[usePermissions] User profile not found');
                    setLoading(false);
                    return;
                }

                const profile = userDoc.data() as UserProfile;
                setUserProfile(profile);

                // 2. Check if user has a permission group assigned
                if (profile.permissionGroupId) {
                    const groupDoc = await getDoc(doc(db, 'permission_groups', profile.permissionGroupId));
                    if (groupDoc.exists()) {
                        let groupPerms = groupDoc.data() as PermissionGroup;

                        // 3. Apply custom overrides if they exist
                        if (profile.customPermissions) {
                            groupPerms = {
                                ...groupPerms,
                                ...profile.customPermissions
                            };
                        }

                        setPermissions(groupPerms);
                        setLoading(false);
                        return;
                    }
                }

                // 4. Fallback to legacy role system
                console.log('[usePermissions] Using legacy role permissions for:', userRole);
                const legacyPerms = LEGACY_ROLE_PERMISSIONS[userRole || 'usuario_base'];
                if (legacyPerms) {
                    setPermissions(legacyPerms as PermissionGroup);
                }
            } catch (error) {
                console.error('[usePermissions] Error loading permissions:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPermissions();
    }, [user, userRole]);

    // Helper: Check if user can perform an action on a resource
    const can = (action: string, resource: string): boolean => {
        if (!permissions) return false;

        const resourceKey = `${resource}Access` as keyof PermissionGroup;
        const resourcePerms = permissions[resourceKey];

        if (!resourcePerms || typeof resourcePerms !== 'object') return false;

        return (resourcePerms as any)[action] === true;
    };

    // Helper: Check if user can view a specific view
    const canView = (view: string): boolean => {
        if (!permissions?.viewAccess) return false;
        return (permissions.viewAccess as any)[view] === true;
    };

    // Helper: Check if user can access a specific project
    const canAccess = (projectId: string): boolean => {
        if (!permissions) return false;

        // If user can view all projects, grant access
        if (permissions.projectAccess?.viewAll) return true;

        // Otherwise check if project is in assigned list
        if (permissions.projectAccess?.assignedOnly && userProfile?.assignedProjectIds) {
            return userProfile.assignedProjectIds.includes(projectId);
        }

        return false;
    };

    // Helper: Get list of allowed project IDs
    const getAllowedProjectIds = (): string[] => {
        if (!permissions) return [];

        // If user can view all, return empty array (meaning "all")
        if (permissions.projectAccess?.viewAll) return [];

        // Otherwise return assigned projects
        return userProfile?.assignedProjectIds || [];
    };

    // Helper: Check if user is admin (for backwards compatibility)
    const isAdmin = (): boolean => {
        return permissions?.projectAccess?.viewAll === true &&
            permissions?.specialPermissions?.managePermissions === true;
    };

    return {
        permissions,
        userProfile,
        loading,
        can,
        canView,
        canAccess,
        getAllowedProjectIds,
        isAdmin
    };
}
