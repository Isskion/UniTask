"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { Tenant } from "@/types";
import { createTenant } from "@/lib/tenants";
import { Loader2, Building2, Plus, Edit2, Trash2, X, Globe, CheckCircle2, XCircle, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";

export default function TenantManagement() {
    const { userRole } = useAuth();
    const { t } = useLanguage();
    const { updateDoc, deleteDoc } = useSafeFirestore();
    const { showToast } = useToast();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [processing, setProcessing] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Tenant>>({
        name: "",
        code: "",
        isActive: true
    });

    useEffect(() => {
        loadTenants();
    }, []);

    const loadTenants = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "tenants"), orderBy("name"));
            const snapshot = await getDocs(q);
            const loaded: Tenant[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Tenant));

            setTenants(loaded);
        } catch (error) {
            console.error("Error loading tenants:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingTenant(null);
        setFormData({ name: "", code: "", isActive: true });
        setShowModal(true);
    };

    const handleEdit = (tenant: Tenant) => {
        setEditingTenant(tenant);
        setFormData({
            name: tenant.name,
            code: tenant.code || tenant.id,
            isActive: tenant.isActive
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.name) {
            showToast("Error", "Name requested", "error");
            return;
        }
        setProcessing(true);

        try {
            if (editingTenant) {
                // Update
                await updateDoc(doc(db, "tenants", editingTenant.id), {
                    name: formData.name,
                    code: formData.code || formData.name.toLowerCase().replace(/\s+/g, '-'),
                    isActive: formData.isActive,
                    updatedAt: serverTimestamp()
                });
            } else {
                // Create with AUTO ID
                await createTenant({
                    name: formData.name,
                    code: formData.name.toLowerCase().replace(/\s+/g, '-'),
                    isActive: formData.isActive ?? true
                });
            }
            await loadTenants();
            setShowModal(false);
        } catch (error) {
            console.error("Error saving tenant:", error);
            alert("Error saving tenant");
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (id === "1") {
            showToast("Error", t('projects.organization_delete_main_error') || "You cannot delete the Main Tenant (System).", "error");
            return;
        }
        if (!confirm(t('projects.organization_delete_confirm') || "Delete this Tenant? This will not delete its data, but may break references.")) return;
        setProcessing(true);
        try {
            await deleteDoc(doc(db, "tenants", id));
            await loadTenants();
        } catch (error) {
            console.error("Error deleting tenant:", error);
        } finally {
            setProcessing(false);
        }
    };

    if (userRole !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Building2 className="w-12 h-12 mb-4 opacity-20" />
                <p>Access restricted to Superadmin</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900/50">
            {/* Header */}
            <div className="px-8 py-6 border-b border-border bg-card">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <Globe className="w-6 h-6 text-indigo-500" />
                            {t('nav.tenants') || "Tenants"}
                        </h1>
                        <p className="text-muted-foreground mt-1">{t('projects.organization_management_desc') || 'Manage tenants (Sequential Numeric IDs).'}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            {t('projects.organization_new') || 'New Tenant'}
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {tenants.map(tenant => (
                                <div key={tenant.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between group hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg",
                                            tenant.isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {tenant.id}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">
                                                {tenant.name}
                                            </h3>
                                            <div className="text-xs font-mono text-muted-foreground mt-1 flex items-center gap-2">
                                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                    ID: {tenant.id}
                                                </span>
                                                <span className="text-slate-400">|</span>
                                                <span>Code: {tenant.code || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(tenant)}
                                            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>

                                        {tenant.id !== "1" && (
                                            <button
                                                onClick={() => handleDelete(tenant.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">
                                {editingTenant ? `${t('common.edit')} ${editingTenant.name}` : t('projects.organization_new')}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('projects.organization_name_label') || 'Tenant Name'}</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    autoFocus
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tenant ID</label>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 border border-border rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground">
                                    {editingTenant ? editingTenant.id : "(Will be generated automatically)"}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="rounded border-border text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Tenant Active
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 hover:bg-secondary rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={processing || !formData.name}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
