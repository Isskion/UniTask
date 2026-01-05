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
    teamIds: string[]; // New: UIDs of allowed consultants
    isActive: boolean; // Legacy flag (keep for backward compat, sync with status)
    createdAt?: any;
    lastUpdate?: any; // New: Timestamp of last activity
}

export interface ProjectUpdate {
    id: string;
    weekId: string; // Link to "time"
    date: any;
    content: any; // Rich content or basic string
    authorId: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: 'app_admin' | 'global_pm' | 'consultor' | 'usuario_base' | 'usuario_externo';
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
}

export interface ProjectEntry {
    projectId?: string; // Link to global project
    name: string; // Fallback or snapshotted name
    pmNotes: string;
    conclusions: string;
    nextWeekTasks: string;
    status?: 'active' | 'trash';
}

export interface WeeklyEntry {
    id: string; // YYYYMMDD
    weekNumber: number;
    year: number;

    // General / Global notes
    pmNotes: string;
    conclusions: string;
    nextWeekTasks: string;

    // Specific Projects
    projects: ProjectEntry[];

    createdAt: string;
}

// Action Item / Task Definition
export interface Task {
    id: string;
    friendlyId?: string; // e.g. "EUP-1"
    taskNumber?: number; // e.g. 1
    weekId: string;        // ID of the weekly entry (YYYYMMDD)
    projectId?: string;    // ID of the global project
    description: string;

    status: 'pending' | 'completed' | 'blocked';
    isActive: boolean;     // Soft delete

    createdBy: string;     // User UID
    createdAt: any;        // ServerTimestamp or ISO string

    assignedTo?: string;   // User UID
    closedAt?: any;
    closedBy?: string;

    // Dependencies
    blockedBy?: string[]; // IDs of tasks blocking this one
}
