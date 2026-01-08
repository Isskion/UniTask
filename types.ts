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

// New: Project Update (Event Stream)
export interface ProjectUpdate {
    id?: string; // Optional on local creation
    projectId: string; // Parent Project
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
    role: 'superadmin' | 'app_admin' | 'global_pm' | 'consultor' | 'usuario_base' | 'usuario_externo';
    tenantId: string; // Multi-tenant: Required for all users
    isActive: boolean;
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

export interface NoteBlock {
    id: string; // "block-1"
    title?: string;
    content: string;
}

export interface ProjectEntry {
    projectId?: string; // Link to global project
    name: string; // Fallback or snapshotted name
    pmNotes: string;
    conclusions: string;
    blocks?: NoteBlock[]; // New: Supports multiple note blocks
    nextSteps: string;
    status?: 'active' | 'trash';
}

// [NEW] Daily Journal Entry (Replaces WeeklyEntry)
export interface JournalEntry {
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
    id: string; // YYYYMMDD
    weekNumber: number;
    year: number;
    tenantId: string; // Multi-tenant isolation

    // General / Global notes
    pmNotes: string;
    conclusions: string;
    nextSteps: string;

    // Specific Projects
    projects: ProjectEntry[];

    createdAt: string;
}

// Action Item / Task Definition
export interface Task {
    id: string;
    friendlyId?: string; // e.g. "EUP-1"
    taskNumber?: number;

    // Core Links
    weekId: string;        // Legacy link
    projectId?: string;    // Parent Project
    tenantId: string;      // Multi-tenant isolation

    // Header Info
    title: string;         // Main "Headline" of the task
    description?: string;  // Detailed description (Optional now if title is main)
    status: 'pending' | 'in_progress' | 'review' | 'completed';
    isBlocking?: boolean; // New: Condition flag

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

    isActive: boolean;
    createdBy: string;
    createdAt: any;
    updatedAt?: any;
    assignedTo?: string;
    closedAt?: any;
    closedBy?: string;
    blockedBy?: string[];
}
