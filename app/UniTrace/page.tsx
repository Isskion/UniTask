"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { getActiveProjects } from "@/lib/projects";
import { toSlug } from "@/lib/slug";
import { RoleLevel, type Project } from "@/types";
import { Trash2 } from "lucide-react";

interface UniTraceEntry {
    slug: string;
    projectId: string | null;
    clientName: string | null;
    accessEnabled: boolean;
}

export default function UniTracePage() {
    const { user, userProfile, tenantId, loading } = useAuth();
    const [entries, setEntries] = useState<UniTraceEntry[]>([]);
    const [entriesLoading, setEntriesLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [slug, setSlug] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

    const roleLevel = userProfile?.roleLevel ?? 0;
    const canCreate = roleLevel >= RoleLevel.ADMIN;
    // Mismo nivel que requiere el endpoint DELETE — solo admin puede borrar clientes UniTrace.
    const canDelete = canCreate;

    async function loadEntries() {
        if (!auth.currentUser) return;
        setEntriesLoading(true);
        setError(null);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch("/api/unitrace", { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error("No se pudo cargar el listado");
            const json = await res.json();
            setEntries(json.entries || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error desconocido");
        } finally {
            setEntriesLoading(false);
        }
    }

    useEffect(() => {
        if (user) loadEntries();
    }, [user]);

    useEffect(() => {
        if (canCreate) {
            getActiveProjects(tenantId || "1").then(setProjects).catch(() => {});
        }
    }, [canCreate, tenantId]);

    function handleSelectProject(projectId: string) {
        setSelectedProjectId(projectId);
        const project = projects.find(p => p.id === projectId);
        if (project) setSlug(toSlug(project.clientName || project.name));
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!auth.currentUser) return;
        setCreating(true);
        setCreateError(null);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch("/api/unitrace", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ slug, projectId: selectedProjectId }),
            });
            const json = await res.json();
            if (!res.ok) {
                setCreateError(json.error === "slug_taken" ? "Esa URL ya está en uso, elige otro nombre." : "No se pudo crear.");
                return;
            }
            setSelectedProjectId("");
            setSlug("");
            await loadEntries();
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(e: React.MouseEvent, entrySlug: string, clientLabel: string) {
        e.preventDefault();
        e.stopPropagation();
        if (!auth.currentUser) return;
        if (!confirm(`¿Eliminar "${clientLabel}" (/UniTrace/${entrySlug})? Esta acción no se puede deshacer.`)) return;

        setDeletingSlug(entrySlug);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`/api/unitrace?slug=${encodeURIComponent(entrySlug)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("No se pudo eliminar");
            await loadEntries();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error eliminando el cliente");
        } finally {
            setDeletingSlug(null);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando…</div>;
    }

    if (!user) {
        return (
            <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 text-center max-w-lg">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Inicia sesión</h2>
                    <p className="text-slate-600">Necesitas una cuenta de UniTask para ver tus proyectos UniTrace.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">UniTrace</h1>
                    <p className="text-slate-600 text-sm mt-1">
                        Páginas de seguimiento por cliente. Cada proyecto tiene su propia URL y clave — la clave de un cliente nunca da acceso a los datos de otro.
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                    {entriesLoading && <div className="p-6 text-slate-500 text-sm">Cargando proyectos…</div>}
                    {error && <div className="p-6 text-red-600 text-sm">{error}</div>}
                    {!entriesLoading && !error && entries.length === 0 && (
                        <div className="p-6 text-slate-500 text-sm">Todavía no tienes ningún proyecto UniTrace.</div>
                    )}
                    {entries.map(entry => (
                        <a
                            key={entry.slug}
                            href={`/UniTrace/${entry.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div>
                                <div className="font-medium text-slate-800">{entry.clientName || entry.slug}</div>
                                <div className="text-xs text-slate-500">/UniTrace/{entry.slug}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                                        entry.accessEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                    }`}
                                >
                                    {entry.accessEnabled ? "Clave activa" : "Sin clave activa"}
                                </span>
                                {canDelete && (
                                    <button
                                        onClick={(e) => handleDelete(e, entry.slug, entry.clientName || entry.slug)}
                                        disabled={deletingSlug === entry.slug}
                                        title="Eliminar cliente UniTrace"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </a>
                    ))}
                </div>

                {canCreate && (
                    <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                        <h2 className="font-semibold text-slate-800">Crear nuevo cliente</h2>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Proyecto</label>
                            <select
                                value={selectedProjectId}
                                onChange={e => handleSelectProject(e.target.value)}
                                required
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">Selecciona un proyecto…</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.clientName || p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">URL (/UniTrace/…)</label>
                            <input
                                value={slug}
                                onChange={e => setSlug(toSlug(e.target.value))}
                                required
                                placeholder="ej. luis-simoes"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                            />
                        </div>
                        {createError && <p className="text-sm text-red-600">{createError}</p>}
                        <button
                            type="submit"
                            disabled={creating || !selectedProjectId || !slug}
                            className="bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                        >
                            {creating ? "Creando…" : "Crear"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
