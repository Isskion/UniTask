export const APP_VERSION = "13.1.11";

export const CHANGELOG = [
    {
        version: "13.1.11",
        title: "Strict Sprint Controls",
        date: "2026-02-02",
        features: [
            "**Completed Tasks Locked**: Tasks marked 'Completed' can no longer be dragged on the Sprint Board.",
            "**ABM Controls**: Completed tasks can only change sprint (not remove), and require Admin + Active Sprint confirmation.",
            "**Localization**: Updated all 6 languages with new sprint control messages."
        ]
    },
    {
        version: "13.1.10",
        title: "Sprint Board Perfection",
        date: "2026-01-31",
        features: [
            "**Auto-Open**: Board now intelligently opens the active sprint for today.",
            "**Data Safety**: Safe Sprint Deletion ensures tasks are returned to backlog before sprint removal.",
            "**Burndown Chart**: Added visual progress tracking to sprint dashboard."
        ]
    },
    {
        version: "13.1.9",
        title: "Sprint Intelligence",
        date: "2026-01-31",
        features: [
            "**Smart Defaults**: New Sprint button now proposes logical dates (Next Monday start, 2-week duration) and auto-names based on week number.",
            "**Overlap Protection**: System now prevents saving sprints with overlapping dates to ensure clean 2-week cycles."
        ]
    },
    {
        version: "13.1.8",
        title: "Sprint Lifecycle Automation",
        date: "2026-01-31",
        features: [
            "**Auto-Status**: Dragging tasks to Sprint sets 'In Progress'; removing sets 'Pending'.",
            "**Sprint Rollover**: Tasks from expired sprints are automatically flagged and moved to the next created sprint."
        ]
    },
    {
        version: "13.1.7",
        title: "Sprint Resource Filtering",
        date: "2026-01-31",
        features: [
            "**Resource Filters**: Clickable workload cards to filter tasks by assignee in Sprint Planning.",
            "**Documentation**: Updated User Manual with 'Simplified Guide' (Step 4.5)."
        ]
    },
    {
        version: "13.1.6",
        title: "Sprint Planning Enhancements",
        date: "2026-01-31",
        features: [
            "**Sprint Filters**: Improved visibility and layout robustness.",
            "**Workload View**: Added resource workload distribution (effort by user).",
            "**Task Highlights**: Completed tasks in active sprint now highlighted in green."
        ]
    },
    {
        version: "13.1.5",
        title: "Fix Sprint Filters",
        date: "2026-01-31",
        features: [
            "**UI Fix**: Resolved issue where sprint filters were invisible in some theme configurations."
        ]
    },
    {
        version: "13.1.4",
        title: "Dependency Fix",
        date: "2026-01-31",
        features: [
            "**Build Pipeline**: Fixed Vercel deployment conflict in `functions/`.",
            "**Dependencies**: Resolved `firebase` version mismatch."
        ]
    },
    {
        version: "13.1.3",
        title: "Promise Simulation Filters & Smart IDs",
        date: "2026-01-30",
        features: [
            "**Sprint Planner Filters**: Added text search and project filtering to the Promise Simulation board.",
            "**Smart IDs**: Implemented [Project]-[YYMM][SEQ] task ID format and migration tools.",
            "**EUP Pickup Flow**: Updated SQL database schema for pickup transitions (Pending Validation)."
        ]
    },
    {
        version: "13.1.2",
        title: "Production Release & Static Export",
        date: "2026-01-29",
        features: [
            "**Static Export**: Migrated frontend to fully static output for Firebase Hosting.",
            "**Cloud Functions**: API routes migrated to serverless Firebase Cloud Functions.",
            "**Performance**: Optimized initial load via static pre-rendering.",
            "**Bug Fixes**: Resolved deployment sync issues and static build blockers."
        ]
    },
    {
        version: "13.1.0",
        title: "Security Refactor",
        date: "2026-01-20",
        features: [
            "**Permissions**: Token-based claim verification.",
            "**Firestore Rules**: Tightened security policies."
        ]
    }
];

export const DOCUMENTATION_LINKS = [
    {
        label: "Manual de Usuario",
        url: "/manual"
    },
    {
        label: "Soporte Técnico",
        url: "mailto:support@unitask.app"
    }
];
