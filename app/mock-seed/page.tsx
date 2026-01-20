"use client";
import { useState } from 'react';
import { getProjectsAction, seedDataAction, cleanupMockDataAction } from '@/app/actions/seed';

export default function SeedPage() {
    const [status, setStatus] = useState('Ready');
    const [logs, setLogs] = useState<string[]>([]);

    const [targetTenantId, setTargetTenantId] = useState('1');
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleLoadProjects = async () => {
        setStatus('Loading Projects...');
        setProjects([]);
        const res = await getProjectsAction(targetTenantId);

        if (res.success && res.data) {
            setProjects(res.data);
            if (res.data.length > 0) setSelectedProjectId(res.data[0].id);
            addLog(`Loaded ${res.data.length} projects for Tenant ${targetTenantId}`);

            if (res.data.length === 0) addLog("No projects found. Check Tenant ID.");
        } else {
            addLog(`Error loading projects: ${res.error || 'Unknown error'}`);
            if (res.code) addLog(`Code: ${res.code}`);
        }
        setStatus('Ready');
    };

    const handleSeed = async () => {
        if (!selectedProjectId) return alert("Select a project");
        setStatus('Running...');
        addLog("Starting Seed...");

        const res = await seedDataAction(targetTenantId, selectedProjectId);
        if (res.success) {
            addLog(res.message || "Done");
            setStatus('Done');
        } else {
            addLog("Error: " + res.error);
            setStatus('Error');
        }
    };

    const handleCleanup = async () => {
        if (!confirm("Delete Mock Data?")) return;
        setStatus('Cleaning...');
        const res = await cleanupMockDataAction(targetTenantId);
        if (res.success) {
            addLog(res.message || "Cleaned");
            setStatus('Cleaned');
        } else {
            addLog("Error: " + res.error);
            setStatus('Error');
        }
    };

    return (
        <div className="p-10 bg-black text-white min-h-screen font-mono">
            <h1 className="text-2xl font-bold mb-4">Mock Data Seeder (Server Action)</h1>

            <div className="mb-6 grid gap-4 max-w-md bg-zinc-900 p-4 rounded border border-zinc-800">
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Target Tenant ID</label>
                        <input
                            className="w-full bg-black border border-zinc-700 rounded px-2 py-1"
                            value={targetTenantId}
                            onChange={e => setTargetTenantId(e.target.value)}
                        />
                    </div>
                    <button onClick={handleLoadProjects} className="bg-zinc-700 px-3 py-1 rounded text-sm h-8">Load</button>
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Select Project</label>
                    <select
                        className="w-full bg-black border border-zinc-700 rounded px-2 py-1"
                        value={selectedProjectId}
                        onChange={e => setSelectedProjectId(e.target.value)}
                    >
                        <option value="">-- Select --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <button
                    onClick={handleSeed}
                    disabled={status === 'Running...' || !selectedProjectId}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                    Generate Data
                </button>

                <button
                    onClick={handleCleanup}
                    disabled={status === 'Running...'}
                    className="bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-600/50 px-4 py-2 rounded disabled:opacity-50"
                >
                    DELETE MOCK DATA
                </button>
            </div>

            <div className="border border-zinc-800 p-4 h-96 overflow-y-auto bg-zinc-900 rounded">
                {logs.map((l, i) => <div key={i} className="text-xs text-zinc-300 border-b border-zinc-800/50 py-0.5">{l}</div>)}
            </div>
        </div>
    );
}
