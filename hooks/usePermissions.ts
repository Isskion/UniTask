import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, DocumentSnapshot, FirestoreError } from 'firebase/firestore';
import { PermissionGroup, getRoleLevel } from '@/types';

// Default Fallback Permissions based on Legacy Roles
const LEGACY_ROLE_MAP: Record<string, Partial<PermissionGroup>> = {
    'app_admin': {
        name: 'Admin Legacy',
        projectAccess: { viewAll: true, assignedOnly: false, create: true, edit: true, archive: true },
        taskAccess: { viewAll: true, assignedProjectsOnly: false, create: true, edit: true, delete: true },
        viewAccess: { 
            dashboard: true, taskManager: true, taskDashboard: true, projectManagement: true, userManagement: true, weeklyEditor: true, dailyFollowUp: true, knowledgeBase: true, sprintManagement: true, dispoPlan: true, unavailabilityRegistry: true,
            unileaks: true, uniordercreator: true, swagger: true, soap: true, unidocs: true, uniflux: true, inbox: true
        },
        exportAccess: { tasks: true, projects: true, reports: true },
        specialPermissions: { viewAllUserProfiles: true, managePermissions: true, accessTrash: true, useCommandMenu: true, viewAllProjectNotes: true }
    },
    'global_pm': {
        name: 'PM Legacy',
        projectAccess: { viewAll: true, assignedOnly: false, create: true, edit: true, archive: false },
        taskAccess: { viewAll: true, assignedProjectsOnly: false, create: true, edit: true, delete: true },
        viewAccess: { 
            dashboard: true, taskManager: true, taskDashboard: true, projectManagement: true, userManagement: false, weeklyEditor: true, dailyFollowUp: true, knowledgeBase: true, sprintManagement: true, dispoPlan: true, unavailabilityRegistry: true,
            unileaks: true, uniordercreator: true, swagger: true, soap: true, unidocs: true, uniflux: true, inbox: true
        },
        exportAccess: { tasks: true, projects: true, reports: true },
        specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: true, viewAllProjectNotes: true }
    },
    'usuario_base': {
        name: 'Usuario Legacy',
        projectAccess: { viewAll: false, assignedOnly: true, create: false, edit: false, archive: false },
        taskAccess: { viewAll: false, assignedProjectsOnly: true, create: true, edit: true, delete: false },
        viewAccess: { 
            dashboard: true, taskManager: true, taskDashboard: true, projectManagement: false, userManagement: false, weeklyEditor: true, dailyFollowUp: true, knowledgeBase: false, sprintManagement: false, dispoPlan: false, unavailabilityRegistry: false,
            unileaks: false, uniordercreator: false, swagger: false, soap: false, unidocs: false, uniflux: false, inbox: false
        },
        exportAccess: { tasks: true, projects: false, reports: false },
        specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: true, viewAllProjectNotes: true }
    },
    // Add other legacy roles if needed
    'consultor': {
        name: 'Consultor Legacy',
        projectAccess: { viewAll: false, assignedOnly: true, create: false, edit: false, archive: false },
        taskAccess: { viewAll: false, assignedProjectsOnly: true, create: true, edit: true, delete: false },
        viewAccess: { 
            dashboard: true, taskManager: true, taskDashboard: true, projectManagement: false, userManagement: false, weeklyEditor: true, dailyFollowUp: true, knowledgeBase: false, sprintManagement: false, dispoPlan: false, unavailabilityRegistry: false,
            unileaks: false, uniordercreator: false, swagger: false, soap: false, unidocs: false, uniflux: false, inbox: false
        },
        exportAccess: { tasks: true, projects: false, reports: false },
        specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: true, viewAllProjectNotes: true }
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
    viewAccess: { 
        dashboard: false, taskManager: false, taskDashboard: false, projectManagement: false, userManagement: false, weeklyEditor: false, dailyFollowUp: false, knowledgeBase: false, sprintManagement: false, dispoPlan: false, unavailabilityRegistry: false,
        unileaks: false, uniordercreator: false, swagger: false, soap: false, unidocs: false, uniflux: false, inbox: false
    },
    exportAccess: { tasks: false, projects: false, reports: false },
    specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: false, viewAllProjectNotes: false },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
};

export function usePermissions() {
    const { user, userRole, loading: authLoading, tenantId, userProfile } = useAuth();
    const [permissions, setPermissions] = useState<PermissionGroup>(DEFAULT_PERMISSIONS);
    const [loading, setLoading] = useState(true);
    const [globalAIEnabled, setGlobalAIEnabled] = useState<boolean>(false);
    const [tenantAIEnabled, setTenantAIEnabled] = useState<boolean>(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        let unsubscribe: (() => void) | undefined;

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

            // 1. If user has a specific Permission Group assigned, listen to it
            if (permissionGroupId) {
                try {
                    const groupRef = doc(db, 'permission_groups', permissionGroupId);

                    // Real-time listener
                    unsubscribe = onSnapshot(groupRef, (groupSnap: DocumentSnapshot) => {
                        if (groupSnap.exists()) {
                            setPermissions({ id: groupSnap.id, ...groupSnap.data() } as PermissionGroup);
                        } else {
                            console.warn(`Permission Group ${permissionGroupId} not found. Falling back to role.`);
                            // Fallback if group deleted
                            if (userRole && LEGACY_ROLE_MAP[userRole]) {
                                setPermissions({ ...DEFAULT_PERMISSIONS, ...LEGACY_ROLE_MAP[userRole] } as PermissionGroup);
                            } else {
                                setPermissions(DEFAULT_PERMISSIONS);
                            }
                        }
                        setLoading(false);
                    }, (error: FirestoreError) => {
                        if (error.code === 'permission-denied') {
                            // Expected race condition during logout
                            console.log("Permission denied for permission group listener (expected during logout).");
                        } else {
                            console.error("Error listening to permission group:", error);
                        }
                        setLoading(false);
                    });

                    return; // Exit, letting the listener handle updates
                } catch (error) {
                    console.error("Error setting up permission group listener:", error);
                }
            }

            // 2. Fallback to Legacy Role Mapping (if no group ID or error)
            if (userRole && LEGACY_ROLE_MAP[userRole]) {
                setPermissions({ ...DEFAULT_PERMISSIONS, ...LEGACY_ROLE_MAP[userRole] } as PermissionGroup);
            } else {
                // 3. Absolute fallback
                setPermissions(DEFAULT_PERMISSIONS);
            }
            setLoading(false);
        };

        loadPermissions();

        // 4. Listen to Global AI Config
        const unsubGlobal = onSnapshot(doc(db, "app_config", "global"), (snap) => {
            if (snap.exists()) {
                setGlobalAIEnabled(snap.data().aiGlobalEnabled !== false);
            }
        });

        // 5. Listen to Tenant AI Config
        let unsubTenant: (() => void) | undefined;
        if (tenantId) {
            unsubTenant = onSnapshot(doc(db, "tenants", tenantId), (snap) => {
                if (snap.exists()) {
                    setTenantAIEnabled(snap.data().aiEnabled !== false);
                }
            });
        }

        return () => {
            if (unsubscribe) unsubscribe();
            unsubGlobal();
            if (unsubTenant) unsubTenant();
        };
    }, [user, userRole, authLoading, tenantId]);

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
        if (context === 'project') {
            if (action === 'create') return permissions.projectAccess?.create || false;
            if (action === 'edit') return permissions.projectAccess?.edit || false;
            if (action === 'view') return permissions.projectAccess?.viewAll || permissions.projectAccess?.assignedOnly || false;
            if (action === 'archive') return permissions.projectAccess?.archive || false;
            if (action === 'viewAll') return permissions.projectAccess?.viewAll || false;
        }
        if (context === 'projects') {
            if (action === 'create') return permissions.projectAccess?.create || false;
            if (action === 'edit') return permissions.projectAccess?.edit || false;
            if (action === 'view') return permissions.projectAccess?.viewAll || permissions.projectAccess?.assignedOnly || false;
            if (action === 'archive') return permissions.projectAccess?.archive || false;
            if (action === 'viewAll') return permissions.projectAccess?.viewAll || false;
        }

        if (context === 'views') {
            const hasAccess = permissions.viewAccess?.[action as keyof typeof permissions.viewAccess] || false;
            return hasAccess;
        }

        if (context === 'special') {
            return permissions.specialPermissions?.[action as keyof typeof permissions.specialPermissions] || false;
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

    const canUseAI = () => {
        if (loading || authLoading) return false;

        // Tier 1: Global Lock
        if (!globalAIEnabled) return false;

        // Tier 2: Tenant Lock
        if (!tenantAIEnabled) return false;

        // Tier 3: User Level
        // Superadmins bypass individual user toggle but still respect Global/Tenant
        const roleLevel = getRoleLevel(userRole);
        if (roleLevel >= 100) return true;

        // Regular users must have AI enabled and be at least level 80 (Admin)
        if (roleLevel < 80) return false;

        return userProfile?.aiEnabled === true;
    };

    return { permissions, loading, can, isAdmin, getAllowedProjectIds, canUseAI };
}
