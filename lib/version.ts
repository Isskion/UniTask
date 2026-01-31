export const APP_VERSION = "13.1.8";

export const CHANGELOG = [
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
