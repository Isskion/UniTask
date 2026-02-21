export const APP_VERSION = "13.5.0";

export const CHANGELOG = [
    {
        version: "13.5.0",
        title: "UniLeaks MVP & Folders",
        date: "2026-02-21",
        features: [
            "**UniLeaks Editor**: New Obsidian-style editor with Markdown support.",
            "**Organized Folders**: Hierarchical folder system for organizing project notes.",
            "**Formatting Controls**: Contextual menus for headings, tables, code blocks, and highlighting.",
            "**Table Parametrization**: Specify rows and columns when inserting tables.",
            "**Color Highlighting**: Text background highlighting with a custom color picker."
        ]
    },
    {
        version: "13.4.6",
        title: "Effort Tracking & Mock Data",
        date: "2026-02-13",
        features: [
            "**Decimal Effort**: Fixed bug in Task Management allowing decimal inputs (0.1, 0.5) in 'Esfuerzo Real'.",
            "**Excel Generator**: New script to generate 2,000 mock orders in UniGIS-compatible XLSX format.",
            "**UI Resilience**: Added support for comma decimal separators in effort tracking."
        ]
    },
    {
        version: "13.4.5",
        title: "Madrid Public Holidays",
        date: "2026-02-11",
        features: [
            "**Holiday Integration**: Madrid public holidays (2025-2026) are now automatically excluded from sprint capacity.",
            "**Smart Capacity**: Holidays falling on weekdays are treated as non-working days for planning purposes."
        ]
    },
    {
        version: "13.4.4",
        title: "Dynamic Capacity Planning",
        date: "2026-02-11",
        features: [
            "**Real-time Availability**: Sprint capacity now automatically adjusts based on Dispoplan absences.",
            "**Teletrabajo Exclusion**: Remote work entries do not reduce capacity, while vacations and sick leaves do."
        ]
    },
    {
        version: "13.4.3",
        title: "Dispoplan Enhancements",
        date: "2026-02-11",
        features: [
            "**Consumed Days**: Added field to track used vacation/sick leave days for yearly statistics.",
            "**UI Refinement**: Registry table now displays consumed days per entry."
        ]
    },
    {
        version: "13.4.2",
        title: "Availability Registry",
        date: "2026-02-11",
        features: [
            "**Registry View**: New list view for managing all unavailability entries.",
            "**Advanced Filters**: Filter by resource, type, and date range.",
            "**Permissions**: Role-based access control for entry management.",
            "**Localization**: Full 6-language support for the new module."
        ]
    },
    {
        version: "13.4.1",
        title: "Sprint Capacity Planning",
        date: "2026-02-11",
        features: [
            "**Capacity Engine**: Define team capacity by resources and points/day.",
            "**Visual Feedback**: Real-time capacity vs. commitment bars on the dashboard.",
            "**Smart Validation**: Alerts when assigning tasks exceeding sprint limits.",
            "**Legacy Support**: Auto-calculation for existing sprints upon edit."
        ]
    },
    {
        version: "13.4.0",
        title: "Robust Invite & Registration",
        date: "2026-02-10",
        features: [
            "**Invite Flow V3**: Fixed argument passing issue in invitations.",
            "**Registration Security**: Resolved race condition in tenant assignment.",
            "**Deployment**: Standardized Vercel/Firebase synchronization."
        ]
    },
    {
        version: "13.3.3",
        title: "Sprint Burndown Precision",
        date: "2026-02-08",
        features: [
            "**Burndown Chart Fix**: Resolved data precision issue where completed tasks were not registering in the chart.",
            "**Single Active Sprint**: Enforced strict 'One Active Sprint' rule to prevent data conflicts."
        ]
    },
    {
        version: "13.3.2",
        title: "UI/UX Brand Refresh",
        date: "2026-02-07",
        features: [
            "**New Branding**: Implemented new application logos with premium aesthetic effects.",
            "**Login Screen**: Enhanced login screen with large, integrated logo.",
            "**Sidebar**: Standardized sidebar branding with high-contrast header and proper text alignment."
        ]
    },
    {
        version: "13.3.1",
        title: "Invite Management",
        date: "2026-02-07",
        features: [
            "**Invite Deactivation**: Admins can now manually deactivate invitations.",
            "**Expiration Policy**: Invitations now automatically expire after 10 days.",
            "**Invite List**: New tab in User Management to view and manage active invitations."
        ]
    },
    {
        version: "13.3.0",
        title: "Security & Clean Export",
        date: "2026-02-05",
        features: [
            "**Knowledge Base**: Implemented high-security sanitization for content export.",
            "**URL Protection**: Prevented exposure of sensitive Firestore Storage URLs.",
            "**Editor Security**: Disabled image dragging to avoid accidental URL leaking."
        ]
    },
    {
        version: "13.2.2",
        title: "Filters Fix",
        date: "2026-02-04",
        features: [
            "**Sprint Filters**: Fixed issue where 'Planning' status sprints were not selectable.",
            "**Data Integrity**: Reverted user filter restrictions to ensure visibility of all assigned tasks."
        ]
    },
    {
        version: "13.2.1",
        title: "Task Navigation Fix",
        date: "2026-02-04",
        features: [
            "**Task Dashboard**: Fixed issue where clicking the task status circle did not open the detail view.",
            "**Micro-Interactions**: Added visual feedback (pencil icon) when hovering over task status to indicate editability."
        ]
    },
    {
        version: "13.2.0",
        title: "Knowledge Area Module",
        date: "2026-02-02",
        features: [
            "**New Module**: Added 'Lessons Learned' and 'Solution Records' for internal knowledge management.",
            "**Bulk Export**: New 'Copy Filtered' button to extract multiple entries to clipboard.",
            "**Localization**: Full support for 6 languages (EN, ES, CA, FR, PT, DE).",
            "**Security**: Team-wide read access with role-based write permissions."
        ]
    },
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
