"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/context/ToastContext";

export default function TaskMigration() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [scanResult, setScanResult] = useState<{ id: string, oldId: string, newId: string }[]>([]);

    const scanTasks = async () => {
        setLoading(true);
        setScanResult([]);
        try {
            // Scan for tasks with "EUR-" prefix (Hardcoded for this specific request)
            // Ideally this would be dynamic, but "EUR" is the reported issue.
            // We scan ALL existing tasks to find them. 
            // Querying by friendlyId prefix is not directly supported in Firestore (>=, <= hack needed),
            // but for a small dataset, fetching active tasks is okay.

            const tasksRef = collection(db, "tasks");
            const q = query(tasksRef); // Fetching all effectively... might be heavy?
            // Optimization: Filter by tenant if known? No, global migration.
            // Let's rely on client side filtering for this one-off tool.

            const snapshot = await getDocs(q);
            const candidates: { id: string, oldId: string, newId: string }[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.friendlyId && typeof data.friendlyId === 'string') {
                    if (data.friendlyId.startsWith("EUR-")) {
                        // FIX: Change EUR to EUP
                        const newId = data.friendlyId.replace("EUR-", "EUP-");
                        candidates.push({
                            id: doc.id,
                            oldId: data.friendlyId,
                            newId: newId
                        });
                    }
                }
            });

            setScanResult(candidates);
            if (candidates.length === 0) {
                showToast("System", "No tasks found with EUR- prefix.", "info");
            } else {
                showToast("System", `Found ${candidates.length} tasks to migrate.`, "info");
            }

        } catch (error: any) {
            console.error("Scan error:", error);
            showToast("Error", "Scan failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const executeMigration = async () => {
        if (!confirm(`Are you sure you want to rename ${scanResult.length} tasks?`)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);

            // Check collisions first?
            // For now, let's assume EUP- doesn't overlap because "EUR" was generated INSTEAD of "EUP".
            // They share the same counter logic usually (unless multiple projects share counters which is bad).

            scanResult.forEach(item => {
                const ref = doc(db, "tasks", item.id);
                batch.update(ref, {
                    friendlyId: item.newId,
                    // Optionally update projectCode if it was wrong on the task doc too?
                    // data.projectCode might be "EUR"? Let's update it to "EUP" if useful.
                    projectCode: "EUP"
                });
            });

            await batch.commit();
            showToast("Success", `Migrated ${scanResult.length} tasks successfully.`, "success");
            setScanResult([]);

        } catch (error: any) {
            console.error("Migration error:", error);
            showToast("Error", "Migration failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-card border border-border rounded-xl space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Task ID Migration (EUR -&gt; EUP)
            </h3>
            <p className="text-sm text-muted-foreground">
                Scans for tasks incorrectly named "EUR-XX" and renames them to "EUP-XX".
            </p>

            <div className="flex gap-4">
                <button
                    onClick={scanTasks}
                    disabled={loading}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 ml-2" />}
                    Scan Tasks
                </button>

                {scanResult.length > 0 && (
                    <button
                        onClick={executeMigration}
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg text-sm font-bold flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Migrate {scanResult.length} Tasks
                    </button>
                )}
            </div>

            {scanResult.length > 0 && (
                <div className="max-h-60 overflow-y-auto border border-border rounded-lg p-2 bg-background/50 text-xs font-mono">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-muted-foreground border-b border-border">
                                <th className="p-2">Current ID</th>
                                <th className="p-2">New ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scanResult.map((r) => (
                                <tr key={r.id} className="border-b border-border/50">
                                    <td className="p-2 text-red-500">{r.oldId}</td>
                                    <td className="p-2 text-green-500">{r.newId}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
import { Search } from "lucide-react";
