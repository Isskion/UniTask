export const APP_VERSION = "13.1.2";

export const CHANGELOG = [
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
