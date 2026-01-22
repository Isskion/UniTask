
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, serverTimestamp, query, where } from "firebase/firestore";

export interface MigrationLog {
    total: number;
    updated: number;
    errors: string[];
}

const COLLECTIONS_TO_MIGRATE = [
    'projects',
    'tasks',
    'users', // Legacy collection if exists
    'user',
    'journal_entries',
    'weekly_entries',
    'permission_groups',
    'invites'
];

export async function migrateToMultiTenant(
    targetTenantId: string = "1",
    onProgress?: (collection: string, progress: number, total: number) => void
): Promise<Record<string, MigrationLog>> {

    const results: Record<string, MigrationLog> = {};

    for (const colName of COLLECTIONS_TO_MIGRATE) {
        console.log(`Starting migration for ${colName}...`);
        const result: MigrationLog = { total: 0, updated: 0, errors: [] };

        try {
            const colRef = collection(db, colName);
            const snapshot = await getDocs(colRef);

            result.total = snapshot.size;

            if (snapshot.empty) {
                results[colName] = result;
                continue;
            }

            let batch = writeBatch(db);
            let batchCount = 0;
            let processed = 0;

            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data();

                // Idempotency Check: migrate if neither organizationId nor tenantId is present
                if (!data.organizationId && !data.tenantId) {
                    batch.update(docSnapshot.ref, {
                        organizationId: targetTenantId,
                        _migratedAt: serverTimestamp()
                    });

                    batchCount++;
                    result.updated++;
                } else if (data.tenantId && !data.organizationId) {
                    // Transition: move tenantId to organizationId
                    batch.update(docSnapshot.ref, {
                        organizationId: data.tenantId,
                        _migratedAt: serverTimestamp()
                    });
                    batchCount++;
                    result.updated++;
                }

                processed++;

                // Commit batch every 400 writes
                if (batchCount >= 400) {
                    await batch.commit();
                    batch = writeBatch(db);
                    batchCount = 0;
                    if (onProgress) onProgress(colName, processed, result.total);
                }
            }

            // Commit remaining
            if (batchCount > 0) {
                await batch.commit();
            }

            if (onProgress) onProgress(colName, result.total, result.total);

        } catch (error: any) {
            console.error(`Error migrating ${colName}:`, error);
            result.errors.push(error.message);
        }

        results[colName] = result;
    }

    return results;
}
