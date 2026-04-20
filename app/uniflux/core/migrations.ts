/**
 * UNIFLUX SCHEMA MIGRATION ENGINE
 *
 * Applies incremental migrations so old Firestore documents are always
 * upgraded to the current schema before being used.
 *
 * Invariant: every migration must be a pure function (no side-effects).
 * Adding a new version = add a new entry to MIGRATIONS and bump CURRENT_SCHEMA_VERSION.
 */

export const CURRENT_SCHEMA_VERSION = 4;

type MigrationFn = (graph: any) => any;

const MIGRATIONS: Record<number, MigrationFn> = {
    /**
     * v1 → v2: add docType discriminator.
     * Docs created before V2 had no docType — they are visual flows.
     */
    1: (g) => ({
        ...g,
        docType: g.docType ?? 'visual',
        schemaVersion: 2,
    }),

    /**
     * v2 → v3: add typed edges + c4Level on nodes + schemaVersion.
     * Existing edges get no c4RelType (undefined = treated as 'sync' by UI).
     * Existing C4 nodes without c4Level get their natural level inferred from type.
     */
    2: (g) => {
        const C4_NATURAL_LEVEL: Record<string, number> = {
            C4_PERSON: 1, C4_SYSTEM: 1, C4_SYSTEM_EXT: 1,
            C4_CONTAINER_WEB: 2, C4_CONTAINER_API: 2, C4_CONTAINER_DB: 2, C4_CONTAINER_QUEUE: 2,
            C4_COMPONENT: 3,
            C4_BOUNDARY: 1,
        };
        return {
            ...g,
            nodes: (g.nodes ?? []).map((n: any) => ({
                ...n,
                c4Level: n.c4Level ?? (C4_NATURAL_LEVEL[n.type] ?? undefined),
            })),
            schemaVersion: 3,
        };
    },

    /**
     * v3 → v4: ModeId type alignment + edge contracts.
     * Edges get no dataShape/payload/sla — they are new optional fields.
     * docType is already a string; this migration ensures it matches ModeId literals.
     */
    3: (g) => ({
        ...g,
        // Normalise any legacy docType values to the canonical ModeId set
        docType: (['visual', 'c4', 'mermaid'] as const).includes(g.docType) ? g.docType : 'visual',
        schemaVersion: 4,
    }),
};

/**
 * Upgrades a raw Firestore document to the current schema version.
 * Safe to call on already-current documents (no-op).
 */
export function migrateGraph(raw: any): any {
    let graph = { ...raw };
    const startVersion = graph.schemaVersion ?? 1;

    for (let v = startVersion; v < CURRENT_SCHEMA_VERSION; v++) {
        const migrate = MIGRATIONS[v];
        if (migrate) {
            graph = migrate(graph);
        }
    }

    // Stamp current version so repeated calls are idempotent
    graph.schemaVersion = CURRENT_SCHEMA_VERSION;
    return graph;
}

/** Returns true if the document needs any migration */
export function needsMigration(raw: any): boolean {
    return (raw?.schemaVersion ?? 1) < CURRENT_SCHEMA_VERSION;
}
