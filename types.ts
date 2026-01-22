export interface Project {
    id: string; // Firestore ID
    code: string; // Business Code (e.g. "PRJ-001")
    name: string; // Internal Project Name ("InnovateX Alpha")
    clientName: string; // New: External Client Name

    // Status & Health
    status: 'active' | 'on_hold' | 'archived'; // New: Formal Status
    health: 'healthy' | 'risk' | 'critical'; // New: Health Signal

    // Contact Info
    color?: string; // Hex color for UI badges
    email?: string;
    phone?: string;
    address?: string;

    // Security & Metadata
    tenantId: string; // Multi-tenant isolation
    teamIds: string[]; // New: UIDs of allowed consultants
    isActive: boolean; // Legacy flag (keep for backward compat, sync with status)
    createdAt?: any;
    lastUpdate?: any; // New: Timestamp of last activity
}

export interface Tenant {
    id: string; // "client-code" or auto-generated
    name: string; // "Empresa Cliente A"
    code?: string; // Optional short code
    logoUrl?: string; // Optional branding
    isActive: boolean;
    createdAt?: any;
    updatedAt?: any;
}

// New: Timeline Event (Event Stream)
export interface TimelineEvent {
    id?: string; // Optional on local creation
    projectId: string; // Parent Project
    tenantId?: string; // New: Denormalized for security rules
    date: any; // Timestamp of the entry

    // Context
    weekId?: string; // Optional legacy link
    authorId: string;
    authorName?: string; // Snapshot for UI speed

    // Content
    type: 'weekly' | 'daily' | 'alert' | 'decision'; // Event Type
    content: {
        notes: string;
        nextSteps?: string[]; // Extracted tasks
        blockers?: string;
        flags?: string[]; // "Important", "Client Request"
    };

    tags?: string[];
    createdAt?: any;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: 'superadmin' | 'app_admin' | 'global_pm' | 'consultant' | 'team_member' | 'client';
    tenantId: string; // Multi-tenant: Required for all users
    isActive: boolean;
    roleLevel?: number; // Added for caching/performance
    lastLogin?: any;
    // Extended fields
    company?: string;
    jobTitle?: string;
    address?: string;
    phone?: string;
    language?: string;
    // New: Assigned Projects
    assignedProjectIds?: string[];
    // New: Permission Group
    permissionGroupId?: string; // Reference to permission_groups collection
    customPermissions?: Partial<PermissionGroup>; // Optional override
}

// Permission Group System
export interface PermissionGroup {
    id: string;
    name: string;
    description: string;
    color: string;

    // Project Permissions
    projectAccess: {
        viewAll: boolean;
        assignedOnly: boolean;
        create: boolean;
        edit: boolean;
        archive: boolean;
    };

    // Task Permissions
    taskAccess: {
        viewAll: boolean;
        assignedProjectsOnly: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
    };

    // View Access
    viewAccess: {
        dashboard: boolean;
        taskManager: boolean;
        taskDashboard: boolean;
        projectManagement: boolean;
        userManagement: boolean;
        weeklyEditor: boolean;
        dailyFollowUp: boolean;
    };

    // Export Permissions
    exportAccess: {
        tasks: boolean;
        projects: boolean;
        reports: boolean;
    };

    // Special Permissions
    specialPermissions: {
        viewAllUserProfiles: boolean;
        managePermissions: boolean;
        accessTrash: boolean;
        useCommandMenu: boolean;
    };

    tenantId: string; // Multi-tenant isolation
    createdAt: any;
    updatedAt: any;
    createdBy: string;
}

export interface ContentBlock {
    id: string; // "block-1"
    title?: string;
    content: string;
    type?: 'notes' | 'task';
    isCollapsed?: boolean;
}

export interface ProjectEntry {
    projectId?: string; // Link to global project
    name: string; // Fallback or snapshotted name
    pmNotes: string;
    conclusions: string;
    blocks?: ContentBlock[]; // New: Supports multiple note blocks
    nextSteps: string;
    status?: 'active' | 'trash';
}

// [NEW] Daily Log (Daily Status Entry)
export interface DailyStatus {
    id: string; // Format: YYYY-MM-DD
    date: string; // ISO Date String "2025-01-06"
    tenantId: string; // Multi-tenant isolation

    // Content
    generalNotes?: string; // Daily global context
    projects: ProjectEntry[]; // Updates per project for this day

    createdAt: any;
    updatedAt: any;
}

// Legacy support (to be deprecated or migrated)
export interface WeeklyEntry {
    id: string; // "YYYY-WW" or "tenant_YYYY-WW"
    weekNumber: number;
    year: number;
    tenantId: string; // [FIX] Required for Multi-tenancy
    pmNotes: string; // General PM comments for the week
    conclusions: string; // Aggregated findings
    nextSteps: string; // Global pending items (Legacy)
    projects: ProjectEntry[];
    createdAt: string;
}

// Action Item / Task Definition
// 11. Dynamic Attribute Definition (Meta-Master Data)
export interface AttributeDefinition {
    id: string;
    name: string;
    color: string;
    tenantId: string;
    isActive: boolean;
    mappedField?: string; // If set, maps to a root property (e.g. 'priority') instead of attributes[]
}

export interface Task {
    id: string;
    friendlyId?: string; // e.g. "EUP-1"
    taskNumber?: number;

    // Core Links
    weekId: string;        // Legacy link (Date string)
    relatedDailyStatusId?: string; // [NEW] Link to specific Daily Status Document
    projectId?: string;    // Parent Project
    tenantId: string;      // Multi-tenant isolation

    // Header Info
    title: string;         // Main "Headline" of the task
    description?: string;  // Detailed description (Optional now if title is main)
    status: 'pending' | 'in_progress' | 'review' | 'completed';
    isBlocking?: boolean; // New: Condition flag

    // Section 1: Classification [NEW]
    priority?: 'high' | 'medium' | 'low';
    scope?: string; // "Alcance"
    area?: string; // "Area" (Master Data)
    module?: string; // "Modulo" (Master Data)

    // Dynamic Attributes (User Defined)
    attributes?: Record<string, string>; // { "attr_id": "option_id" }

    // Section 1: Requirements
    okrLink?: string;

    // Section 2: RACI Matrix
    raci?: {
        responsible: string[]; // UIDs or Names
        accountable: string[];
        consulted: string[];
        informed: string[];
    };

    // Section 3: Technical
    techDescription?: string; // SOP or technical details

    // Section 4: Execution & Timeline
    startDate?: any;
    endDate?: any;
    progress?: number; // 0-100
    acceptanceCriteria?: {
        id: string;
        text: string;
        completed: boolean;
    }[];

    // Section 5: Traceability
    rtmId?: string; // "RTM-CORE-005"

    // Section 6: Dependencies
    dependencies?: string[]; // IDs of blocking tasks
    customIdFields?: Record<string, string>; // Deprecated: Migration to attributes pending

    isActive: boolean;
    createdBy: string;
    createdAt: any;
    updatedAt?: any;
    assignedTo?: string;
    closedAt?: any;
    closedBy?: string;
    blockedBy?: string[];
}

// Role Weight System
export enum RoleLevel {
    CLIENT = 10,
    TEAM_MEMBER = 20,
    CONSULTANT = 40,
    PM = 60,
    ADMIN = 80,
    SUPERADMIN = 100
}

export const ROLE_LEVEL_MAP: Record<string, number> = {
    'client': RoleLevel.CLIENT,
    'team_member': RoleLevel.TEAM_MEMBER,
    'consultant': RoleLevel.CONSULTANT,
    'global_pm': RoleLevel.PM,
    'app_admin': RoleLevel.ADMIN,
    'superadmin': RoleLevel.SUPERADMIN,
    // Legacy fallbacks (to be removed after migration)
    'usuario_externo': RoleLevel.CLIENT,
    'usuario_base': RoleLevel.TEAM_MEMBER,
    'consultor': RoleLevel.CONSULTANT
};

export function getRoleLevel(role: string | number | null | undefined): number {
    if (!role) return 0;
    if (typeof role === 'number') return role;
    return ROLE_LEVEL_MAP[role.toLowerCase()] || 0;
}

export interface Notification {
    id: string;
    userId: string; // Recipient UID
    type: 'assignment' | 'system' | 'mention';
    title: string;
    message: string;
    link?: string; // internal route, e.g. "/tasks?id=123"
    taskId?: string; // Optional: direct link to data
    read: boolean;
    createdAt: any;
}

export interface MasterDataItem {
    id: string;
    name: string;
    color: string;
    type: string;
    tenantId?: string;
    isActive?: boolean;
}

export interface SupportTicket {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    tenantId: string;
    message: string;
    context: string; // The list/view from which support was requested
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    createdAt: any;
    updatedAt: any;
}
