export interface ExportTemplate {
    id: string;
    name: string;
    tenantId: string;
    entity: "task" | "project";
    columns: string[]; // Ordered list of keys
    version: number;
    createdBy: string;
    createdAt: any; // Firestore Timestamp
}

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

    // [SAM Architecture] Scoped Resource Fields
    regionId?: string;
    divisionId?: string;
    _accessKey?: string;       // "REGION:DIVISION"
    _tenantAccessKey?: string; // "TENANT:REGION:DIVISION"
    _migrated?: boolean;

    // Security & Metadata
    tenantId: string; // Multi-tenant isolation
    teamIds: string[]; // New: UIDs of allowed consultants
    isActive: boolean; // Legacy flag (keep for backward compat, sync with status)
    createdAt?: any;
    lastUpdate?: any; // New: Timestamp of last activity
}

export interface TenantLogo {
    id: string;
    label: string;      // e.g., "Logo Principal", "Logo Secundario", "ISO"
    url: string;         // Firebase Storage URL
    storagePath: string; // Firebase Storage path for deletion
    uploadedAt: any;
}

export interface Tenant {
    id: string; // "client-code" or auto-generated
    name: string; // "Empresa Cliente A"
    code?: string; // Optional short code
    logoUrl?: string; // Optional branding (legacy, kept for backward compat)
    logos?: TenantLogo[]; // Multiple logos with labels
    isActive: boolean;
    aiEnabled?: boolean; // New: Superadmin auth for AI billing
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
        attachments?: string[]; // New: Screenshot URLs
    };

    tags?: string[];
    createdAt?: any;

    // Trash / Soft Delete
    isTrashed?: boolean;
    deletedAt?: any;
    deletedBy?: string;
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

    // [SAM Architecture] Access Scopes
    accessScopes: {
        regionIds: string[];   // e.g. ["CL", "ES"] or ["*"]
        divisionIds: string[]; // e.g. ["DEV", "CONS"] or ["*"]
    };
    activeContext?: {
        regionIds: string[];
        divisionIds: string[];
    };
    authVersion?: number;
    lastUpdatedBy?: string;
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
    isConsultant?: boolean; // New: If true, count as resource for sprint capacity
    worksOnWeekends?: boolean; // New: If true, weekends are considered working days in DispoPlan
    aiEnabled?: boolean; // New: Tenant Admin auth for User AI usage
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
        knowledgeBase: boolean;
        sprintManagement: boolean;
        dispoPlan: boolean;
        unavailabilityRegistry: boolean;
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
    attachments?: string[]; // New: Screenshot URLs
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
    attachments?: string[]; // New: Legacy/General Attachments
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
    type?: string; // Classification type for filtering (e.g. 'cycles', 'planning')
}

// [NEW] Sprint System
export interface Sprint {
    id: string;
    name: string;        // e.g. "Sprint Week 42"
    startDate: any;      // Firestore Timestamp
    endDate: any;        // Firestore Timestamp
    status: 'planning' | 'active' | 'closed';
    tenantId: string;

    // Metadata
    goal?: string;
    capacity?: number; // Legacy total points (aggregated from tasks)

    // Capacity & Effort [NEW]
    pointsPerUserPerDay?: number;
    resourceCount?: number;
    includeWeekends?: boolean;
    plannedCapacity?: number; // Target capacity based on resources/days

    createdAt?: any;
    updatedAt?: any;
}

export type TaskCreationSource = 'manual_main' | 'manual_daily' | 'ai_daily' | 'ai_weekly' | 'import' | 'system';

// [V3] Task Types
export type TaskType = 'root_epic' | 'epic' | 'task' | 'subtask' | 'milestone';

export interface Task {
    id: string;
    friendlyId?: string; // e.g. "EUP-1"
    taskNumber?: number;
    needsRollover?: boolean; // [AUTOMATION] Flag for sprint expiry rollover

    // Core Links
    weekId: string;        // Legacy link (Date string)
    relatedDailyStatusId?: string; // Link to specific Daily Status Document
    projectId?: string;    // Parent Project
    projectCode?: string;  // Project Code (e.g. "VMS")
    tenantId: string;      // Multi-tenant isolation

    // [SAM Architecture] Scoped Resource Fields (Denormalized)
    regionId?: string;
    divisionId?: string;
    _accessKey?: string;
    _tenantAccessKey?: string;
    _migrated?: boolean;

    // [V3] Hierarchy & Navigation (Shadow / Hybrid)
    type?: TaskType;       // Optional during migration
    parentId?: string;     // Direct parent
    ancestorIds?: string[]; // Ordered list of parents [Root, Epic, Task] EXCLUDING self
    planId?: string;       // Context of the Master Plan

    // [V3] Visual Order
    order?: number;         // Float for drag & drop normalization

    // [V3] Operational Link (Semantic)
    contributesToTaskId?: string;

    // Header Info
    title: string;         // Main "Headline" of the task
    description?: string;  // Detailed description (Optional now if title is main)
    status: 'pending' | 'in_progress' | 'review' | 'completed';
    isBlocking?: boolean; // New: Condition flag

    // [V3] Dual Progress (Shadow Strategy)
    // Legacy: number (0-100)
    // V13: { actual, planned }
    // During migration, we prioritize progressV13 if exists.
    progress?: number | { actual: number; planned?: number; aggregated?: number };

    // [V3] Shadow Field for Migration (Source of Truth for V13 logic)
    progressV13?: {
        actual: number;
        planned: number;
        aggregated?: number;
    };

    // [V3] Audit & Import Control
    planVersion?: number;    // Version of the plan import that touched this
    planStatus?: 'linked' | 'detached' | 'overridden' | 'archived';
    externalSource?: {
        system: 'ms_planner' | 'jira';
        id: string;          // Immutable Source ID
        etag?: string;       // Change detection hash
    };

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
    // progress?: number; // [Hybrid Definition Above]
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

    creationSource?: TaskCreationSource;
    isActive: boolean;
    createdBy: string;
    createdAt: any;
    updatedAt?: any;
    assignedTo?: string;
    closedAt?: any;
    closedBy?: string;
    blockedBy?: string[];

    // [V13.2] Sprint System & Strategic Planning
    sprintId?: string;          // Link to execution period
    clientDeadline?: any;       // Hard constraint from client (distinct from internal endDate/sprint end)
    assignmentLocked?: boolean; // If true, requires PM/Admin to unassign

    // [V13.3] Effort Tracking & T-Shirt Sizing
    estimatedEffortSize?: 'XS' | 'S' | 'M' | 'L' | 'XL';  // T-Shirt sizing for estimation
    estimatedEffort?: number;   // Days calculated from size (auto-populated)
    actualEffort?: number;      // Real days invested (REQUIRED on close)
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

// Knowledge Area Types
export interface ChangeLogEntry {
    userId: string;
    userName: string;
    timestamp: any;
    action: 'created' | 'updated' | 'deleted';
    changes?: string;
}

export interface KnowledgeEntry {
    id: string;
    type: 'lesson_learned' | 'solution_record' | 'product_proposal';
    title: string;
    content: string;              // Large text field
    projectId?: string | null;    // Optional project link
    tags: string[];               // Categorization with autocomplete
    attachments?: string[];       // New: Screenshot URLs

    // Audit trail
    createdBy: string;
    createdByName?: string;
    createdAt: any;
    updatedBy?: string;
    updatedByName?: string;
    updatedAt?: any;

    // Change log (embedded)
    changelog: ChangeLogEntry[];

    // Multi-tenant
    tenantId: string;
    isActive: boolean;
}

// Knowledge Tag (for autocomplete)
export interface KnowledgeTag {
    id: string;
    name: string;
    tenantId: string;
    usageCount: number;
    createdAt: any;
}

// Master Data: Document Types
export interface DocumentType {
    id: string;             // Firestore ID
    code: string;           // e.g. "SCOPE"
    name: string;           // e.g. "Definición de Alcance"
    description?: string;   // Memo
    isProjectChecklist: boolean; // "Cheq Proyecto"
    isImage: boolean;          // "Información es Imagen"
    tenantId: string;
    order?: number;         // For sorting
    isActive: boolean;
    createdAt: any;
}

// --- UniLeaks: Interfaces & Versioning ---

export interface InterfaceVersion {
    id: string;
    versionName: string;      // e.g. "v1.0.2", "Initial Draft"
    fileUrl: string;          // Link to Firebase Storage
    fileName: string;
    fileType: string;         // "json", "xml", "txt"
    isProduction: boolean;    // Green highlight indicator
    uploadedBy: string;       // User UID
    uploadedAt: any;          // Timestamp
    notes?: string;           // Optional changelog for this version
}

export interface InterfaceEntry {
    id: string;
    name: string;             // e.g. "SAP Inventory Sync", "Client XML Feed"
    description: string;      // Breve descripción del flujo
    url?: string;             // NEW: Interface URL
    clientId?: string;        // NEW: Client Identifier
    clientSecret?: string;    // NEW: Authentication Secret
    formatContent: string;    // Contenido de código/configuración (JSON, XML)
    formatType: 'json' | 'xml' | 'txt' | 'other';
    projectId: string;        // Parent project link
    tenantId: string;
    versions: InterfaceVersion[];
    isActive: boolean;
    createdAt: any;
    updatedAt: any;
}

export interface UniLeakFolder {
    id: string;
    name: string;
    parentId: string | null; // null if it's a root folder
    projectId: string;
    tenantId: string;
    createdAt: any;
    updatedAt: any;
}

export interface UniLeakNote {
    id: string;
    title: string;
    content: string;
    projectId: string;
    tenantId: string;
    userId: string;
    isPublic: boolean;
    folderId?: string | null; // null if it's in the root
    createdAt: any;
    updatedAt: any;
}

export interface TenantWord {
    id: string;
    word: string;
    tenantId: string;
    addedBy: string;
    createdAt: any;
}

// --- MoSCoW Requirements ---

export type MoscowPriority = 'must' | 'should' | 'could' | 'wont';
export type MoscowStatus = 'open' | 'in_progress' | 'implemented' | 'discarded';

export interface MoscowRequirement {
    id: string;
    moscowId: string;           // "01-00001"
    moduleCode: string;         // "01"
    sequentialNumber: number;   // 1
    title: string;              // Descripción del requisito
    priority: MoscowPriority;
    status: MoscowStatus;
    requesterName: string;      // Solicitante (texto libre)
    observations: string;       // Observaciones
    projectId: string;
    tenantId: string;
    createdBy: string;          // UID
    createdByName: string;      // Snapshot nombre
    createdAt: any;             // Firestore Timestamp
    updatedAt: any;
    treated?: boolean;          // Marcado como "Tratado"
}
