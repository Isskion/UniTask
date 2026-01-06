"use client";
import { useState } from "react";
import { migrateAllData, MigrationLog } from "@/lib/migration";
import { Database, Play, AlertTriangle, CheckCircle } from "lucide-react";

export default function MigrationPage() {
    const [running, setRunning] = useState(false);
    const [log, setLog] = useState<MigrationLog | null>(null);
    const [finished, setFinished] = useState(false);

    const handleRun = async () => {
        if (!confirm("⚠️ This will scan all weekly entries and create duplicates in the new 'updates' subcollections. Continue?")) return;

        setRunning(true);
        setFinished(false);
        try {
            await migrateAllData((progress) => {
                setLog({ ...progress });
            });
            setFinished(true);
        } catch (e) {
            console.error(e);
            alert("Migration Failed");
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-10 flex flex-col items-center">
            <div className="max-w-2xl w-full space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                    <div className="p-3 bg-indigo-500/20 rounded-xl">
                        <Database className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Migration Utility (ETL)</h1>
                        <p className="text-zinc-500">Transform Weekly Entries → Project Event Stream</p>
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-lg flex gap-3 text-orange-200 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>
                        This script reads all legacy `weekly_entries`, finds (or creates) the parent Project,
                        and essentially "re-posts" the notes as individual `ProjectUpdate` documents dated to that week's Monday.
                    </p>
                </div>

                {/* Action Area */}
                <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center space-y-6">
                    {!running && !finished && (
                        <button
                            onClick={handleRun}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg px-8 py-4 rounded-full transition-all flex items-center gap-3 mx-auto shadow-lg shadow-indigo-900/50"
                        >
                            <Play className="w-6 h-6" />
                            Start Migration
                        </button>
                    )}

                    {running && (
                        <div className="space-y-4">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-zinc-400 animate-pulse">Processing Database...</p>
                        </div>
                    )}

                    {finished && (
                        <div className="flex flex-col items-center gap-2 text-emerald-400">
                            <CheckCircle className="w-12 h-12" />
                            <h3 className="text-xl font-bold">Migration Complete</h3>
                        </div>
                    )}
                </div>

                {/* Logs / Progress */}
                {log && (
                    <div className="grid grid-cols-3 gap-4">
                        <StatCard label="Total Weeks" value={log.totalWeeks} />
                        <StatCard label="Processed" value={log.processedWeeks} />
                        <StatCard label="Events Created" value={log.projectsMigrated} highlighted />
                    </div>
                )}

                {log?.errors && log.errors.length > 0 && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <h4 className="text-red-400 font-bold mb-2 sticky top-0 bg-[#1a0505]">Errors ({log.errors.length})</h4>
                        <ul className="space-y-1 text-xs text-red-300 font-mono">
                            {log.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, highlighted = false }: { label: string, value: number, highlighted?: boolean }) {
    return (
        <div className={`p-4 rounded-lg border ${highlighted ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-white/5 border-white/10'}`}>
            <div className="text-zinc-500 text-xs uppercase font-bold">{label}</div>
            <div className={`text-3xl font-mono font-bold ${highlighted ? 'text-indigo-400' : 'text-white'}`}>
                {value}
            </div>
        </div>
    )
}
