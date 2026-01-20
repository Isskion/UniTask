"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { PermissionGroup } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useSafeFirestore } from '@/hooks/useSafeFirestore';
import { Shield, Plus, Edit2, Copy, Trash2, X, Save, FolderGit2, ListTodo, BarChart3, Users, Settings, Sparkles } from 'lucide-react';
import { seedPermissionGroups } from '@/lib/permissionGroups';
import { migrateToMultiTenant } from '@/lib/migration';
import { cn } from "@/lib/utils";
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/context/LanguageContext';

const DEFAULT_GROUP: Partial<PermissionGroup> = {
    name: '',
    description: '',
    color: '#6366f1',
    projectAccess: { viewAll: false, assignedOnly: true, create: false, edit: false, archive: false },
    taskAccess: { viewAll: false, assignedProjectsOnly: true, create: true, edit: true, delete: false },
    viewAccess: { dashboard: true, taskManager: true, taskDashboard: true, projectManagement: false, userManagement: false, weeklyEditor: true, dailyFollowUp: true },
    exportAccess: { tasks: true, projects: false, reports: false },
    specialPermissions: { viewAllUserProfiles: false, managePermissions: false, accessTrash: false, useCommandMenu: true }
};

export default function UserRoleManagement() {
    const { user, userRole, tenantId } = useAuth();
    const { addDoc, updateDoc, deleteDoc } = useSafeFirestore();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isLight = theme === 'light';
    const isRed = theme === 'red';
    const [groups, setGroups] = useState<PermissionGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [migrating, setMigrating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'projects' | 'tasks' | 'views' | 'special'>('general');
    const [formData, setFormData] = useState<Partial<PermissionGroup>>(DEFAULT_GROUP);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const q = query(collection(db, 'permission_groups'), where('tenantId', '==', tenantId || '1'));
            const snapshot = await getDocs(q);
            const loadedGroups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as PermissionGroup[];
            setGroups(loadedGroups);
        } catch (error) {
            console.error('Error loading permission groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingGroup(null);
        setFormData(DEFAULT_GROUP);
        setActiveTab('general');
        setShowModal(true);
    };

    const handleEdit = (group: PermissionGroup) => {
        setEditingGroup(group);
        setFormData(group);
        setActiveTab('general');
        setShowModal(true);
    };

    const handleDuplicate = (group: PermissionGroup) => {
        setEditingGroup(null);
        setFormData({
            ...group,
            name: `${group.name} (${t('common.copy') || 'Copy'})`,
            id: undefined
        });
        setActiveTab('general');
        setShowModal(true);
    };

    const handleDelete = async (groupId: string) => {
        if (!confirm(t('roles_page.delete_confirm'))) return;

        try {
            await deleteDoc(doc(db, 'permission_groups', groupId));
            await loadGroups();
        } catch (error) {
            console.error('Error deleting group:', error);
            alert(t('roles_page.delete_error'));
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.description) {
            alert(t('roles_page.validation_error'));
            return;
        }

        try {
            const groupData = {
                ...formData,
                updatedAt: serverTimestamp(),
                ...(editingGroup ? {} : {
                    createdAt: serverTimestamp(),
                    createdBy: user?.uid || 'system'
                })
            };

            if (editingGroup) {
                await updateDoc(doc(db, 'permission_groups', editingGroup.id), groupData);
            } else {
                await addDoc(collection(db, 'permission_groups'), groupData);
            }

            setShowModal(false);
            await loadGroups();
        } catch (error) {
            console.error('Error saving group:', error);
            alert(t('roles_page.save_error'));
        }
    };

    const updateFormField = (section: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...(prev as any)[section],
                [field]: value
            }
        }));
    };

    const handleInitializeGroups = async () => {
        try {
            setLoading(true);
            await seedPermissionGroups(user?.uid || 'system');
            await loadGroups();
            alert(t('roles_page.init_success'));
        } catch (error) {
            console.error('Error initializing groups:', error);
            alert(t('roles_page.init_error'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={cn("h-full flex items-center justify-center", isLight ? "bg-white" : "bg-[#09090b]")}>
                <div className={cn("text-zinc-500", isLight && "text-zinc-400")}>{t('roles_page.loading')}</div>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex-1 overflow-hidden flex flex-col gap-6 max-w-7xl mx-auto w-full h-full p-6 relative transition-colors duration-300",
            isLight ? "bg-white" : (isRed ? "bg-[#D32F2F]/10" : "bg-[#09090b]")
        )}>
            {loading && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D32F2F]"></div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className={cn("text-2xl font-bold flex items-center gap-2", isLight ? "text-zinc-950" : "text-white")}>
                        <Shield className={cn("w-6 h-6", isLight ? "text-red-700" : (isRed ? "text-[#D32F2F]" : "text-white"))} />
                        {t('roles_page.title')}
                    </h1>
                    <p className={cn("mt-1 font-medium", isLight ? "text-zinc-700" : "text-zinc-400")}>
                        {t('roles_page.subtitle')}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setFormData(DEFAULT_GROUP);
                        setShowModal(true);
                    }}
                    className={cn(
                        "px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg",
                        isLight
                            ? "bg-zinc-900 hover:bg-black text-white shadow-zinc-300"
                            : (isRed
                                ? "bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-red-900/20"
                                : "bg-white hover:bg-zinc-200 text-black shadow-white/10")
                    )}
                >
                    <Plus className="w-5 h-5" />
                    {t('roles_page.create_group')}
                </button>
            </div>

            {/* Groups Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Superadmin Static Card */}
                    {userRole === 'superadmin' && (
                        <div
                            className={cn(
                                "rounded-xl border p-5 flex flex-col gap-4 relative group transition-all duration-300",
                                isLight
                                    ? "bg-white border-indigo-200 shadow-lg shadow-indigo-50"
                                    : "bg-[#18181b] border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                            )}
                            style={{ borderLeftWidth: '4px', borderLeftColor: '#6366F1' }}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className={cn("text-lg font-bold flex items-center gap-2", isLight ? "text-indigo-900" : "text-white")}>
                                        <Shield className="w-5 h-5 text-indigo-500" />
                                        Super Admin
                                    </h3>
                                    <p className={cn("text-sm mt-1 font-medium", isLight ? "text-indigo-700" : "text-indigo-200/70")}>
                                        {t('roles_page.super_admin_desc')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded border flex items-center gap-1",
                                    isLight ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                )}>
                                    <Sparkles className="w-3 h-3" /> {t('roles_page.all_access')}
                                </span>
                            </div>
                        </div>
                    )}

                    {groups.map(group => (
                        <div
                            key={group.id}
                            className={cn(
                                "rounded-xl border p-5 flex flex-col gap-4 relative group transition-all duration-300",
                                isLight
                                    ? "bg-white border-zinc-200 hover:border-red-200 hover:shadow-lg hover:shadow-red-50"
                                    : (isRed
                                        ? "bg-[#D32F2F]/10 border-[#D32F2F]/20 hover:border-[#D32F2F]/40 hover:shadow-lg hover:shadow-[#D32F2F]/10"
                                        : "bg-[#18181b] border-white/5 hover:border-white/10 hover:shadow-lg hover:shadow-black")
                            )}
                            style={{ borderLeftWidth: '4px', borderLeftColor: group.color }}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className={cn("text-lg font-bold flex items-center gap-2", isLight ? "text-zinc-950" : "text-white")}>
                                        <Shield className="w-5 h-5" style={{ color: group.color }} />
                                        {group.name}
                                    </h3>
                                    <p className={cn("text-sm mt-1 font-medium", isLight ? "text-zinc-700" : (isRed ? "text-white/70" : "text-zinc-400"))}>
                                        {group.description || t('common.none')}
                                    </p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(group)}
                                        className={cn("p-2 rounded-lg transition-colors",
                                            isLight
                                                ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-900"
                                                : (isRed ? "bg-[#D32F2F]/20 hover:bg-[#D32F2F]/40 text-white" : "bg-white/5 hover:bg-white/10 text-white")
                                        )}
                                        title={t('common.edit')}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDuplicate(group)}
                                        className={cn("p-2 rounded-lg transition-colors",
                                            isLight
                                                ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-900"
                                                : (isRed ? "bg-[#D32F2F]/20 hover:bg-[#D32F2F]/40 text-white" : "bg-white/5 hover:bg-white/10 text-white")
                                        )}
                                        title={t('common.copy')}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(group.id!)}
                                        className={cn("p-2 rounded-lg transition-colors",
                                            isLight
                                                ? "bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-900"
                                                : (isRed ? "bg-[#D32F2F]/20 hover:bg-red-900/40 text-white hover:text-red-200" : "bg-white/5 hover:bg-red-900/20 text-white hover:text-red-400")
                                        )}
                                        title={t('common.delete')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Permission Summary Chips */}
                            <div className="flex flex-wrap gap-2">
                                {group.specialPermissions?.viewAllUserProfiles && (
                                    <span className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded border flex items-center gap-1",
                                        isLight
                                            ? "bg-blue-50 text-blue-600 border-blue-200"
                                            : (isRed ? "bg-blue-500/10 text-blue-200 border-blue-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20")
                                    )}>
                                        <Users className="w-3 h-3" /> {t('roles_page.permissions.special.viewAllUserProfiles.label')}
                                    </span>
                                )}
                                {group.projectAccess?.viewAll && (
                                    <span className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded border flex items-center gap-1",
                                        isLight
                                            ? "bg-green-50 text-green-600 border-green-200"
                                            : (isRed ? "bg-green-500/10 text-green-200 border-green-500/20" : "bg-green-500/10 text-green-400 border-green-500/20")
                                    )}>
                                        <FolderGit2 className="w-3 h-3" /> {t('roles_page.tabs.projects')}
                                    </span>
                                )}
                                {group.taskAccess?.create && (
                                    <span className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded border flex items-center gap-1",
                                        isLight
                                            ? "bg-purple-50 text-purple-600 border-purple-200"
                                            : (isRed ? "bg-purple-500/10 text-purple-200 border-purple-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20")
                                    )}>
                                        <ListTodo className="w-3 h-3" /> {t('roles_page.tabs.tasks')}
                                    </span>
                                )}
                                {group.viewAccess?.dashboard && (
                                    <span className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded border flex items-center gap-1",
                                        isLight
                                            ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                                            : (isRed ? "bg-yellow-500/10 text-yellow-200 border-yellow-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20")
                                    )}>
                                        <BarChart3 className="w-3 h-3" /> {t('roles_page.permissions.views.dashboard.label')}
                                    </span>
                                )}
                                {group.specialPermissions?.managePermissions && (
                                    <span className={cn("text-[10px] uppercase font-bold px-2 py-1 rounded border flex items-center gap-1",
                                        isLight
                                            ? "bg-red-50 text-red-600 border-red-200"
                                            : (isRed ? "bg-red-500/10 text-red-200 border-red-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")
                                    )}>
                                        <Settings className="w-3 h-3" /> Admin
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {groups.length === 0 && !loading && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-center opacity-50">
                            <Shield className={cn("w-16 h-16 mb-4", isLight ? "text-zinc-300" : (isRed ? "text-white/20" : "text-zinc-600"))} />
                            <h3 className={cn("text-xl font-bold", isLight ? "text-zinc-900" : "text-white")}>{t('roles_page.no_groups')}</h3>
                            <p className={cn("max-w-md mx-auto mt-2", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                {t('roles_page.no_groups_desc')}
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleInitializeGroups}
                                    className={cn("mt-6 px-4 py-2 rounded font-bold transition-all",
                                        isLight
                                            ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                                            : (isRed ? "bg-[#D32F2F]/20 hover:bg-[#D32F2F]/30 text-white" : "bg-white/5 hover:bg-white/10 text-white")
                                    )}
                                >
                                    {t('roles_page.init_defaults')}
                                </button>
                                {
                                    // [FIX] Show "Import Roles" button only if tenant is empty and != '1'
                                    tenantId !== '1' && (
                                        <button
                                            onClick={async () => {
                                                if (!confirm(t('roles_page.import_confirm'))) return;
                                                setMigrating(true);
                                                try {
                                                    const resLog = await import('@/lib/permissionGroups').then(m => m.startTenantPopulation(tenantId || "1", user?.uid)); // Lazy load to avoid cycle if any
                                                    console.log(resLog);
                                                    alert(t('roles_page.import_success') + "\n" + resLog);
                                                    await loadGroups(); // Refresh UI
                                                } catch (e: any) {
                                                    console.error(e);
                                                    alert(t('common.error') + ": " + e.message);
                                                } finally {
                                                    setMigrating(false);
                                                }
                                            }}
                                            disabled={migrating}
                                            className={cn("mt-6 px-4 py-2 rounded font-bold transition-all border border-transparent",
                                                isLight
                                                    ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-200"
                                                    : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/20"
                                            )}
                                        >
                                            <Sparkles className={cn("w-4 h-4 inline mr-2", migrating && "animate-spin")} />
                                            {migrating ? t('roles_page.importing') : t('roles_page.import_roles')}
                                        </button>
                                    )
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className={cn(
                        "rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl transition-colors",
                        isLight
                            ? "bg-white border border-zinc-200 shadow-zinc-200"
                            : (isRed
                                ? "bg-[#1a0505] border border-[#D32F2F]/30 shadow-[#D32F2F]/20"
                                : "bg-[#09090b] border border-white/10 shadow-black")
                    )}>
                        <div className={cn("p-4 border-b flex justify-between items-center shrink-0",
                            isLight ? "bg-zinc-50 border-zinc-200" : (isRed ? "bg-[#D32F2F]/10 border-[#D32F2F]/20" : "bg-white/5 border-white/10")
                        )}>
                            <h3 className={cn("text-lg font-bold flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                                <Edit2 className={cn("w-4 h-4", isLight ? "text-zinc-700" : (isRed ? "text-[#D32F2F]" : "text-white"))} />
                                {formData.id ? t('roles_page.edit_group') : t('roles_page.new_group')}
                            </h3>
                            <button onClick={() => setShowModal(false)} className={cn("hover:text-white transition-colors", isLight ? "text-zinc-500 hover:text-zinc-900" : "text-zinc-400")}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className={cn("flex gap-1 px-6 pt-4 border-b", isLight ? "border-zinc-100" : "border-white/5")}>
                            {[
                                { id: 'general', label: t('roles_page.tabs.general') },
                                { id: 'projects', label: t('roles_page.tabs.projects') },
                                { id: 'tasks', label: t('roles_page.tabs.tasks') },
                                { id: 'views', label: t('roles_page.tabs.views') },
                                { id: 'special', label: t('roles_page.tabs.special') }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                                        activeTab === tab.id
                                            ? (isLight ? "bg-red-600 text-white" : "bg-[#D32F2F] text-white")
                                            : (isLight ? "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100" : "text-zinc-400 hover:text-white hover:bg-white/5")
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {activeTab === 'general' && (
                                <>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-2", isLight ? "text-zinc-700" : "text-zinc-300")}>{t('roles_page.form.name')}</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className={cn(
                                                "w-full border rounded-lg px-4 py-2 focus:outline-none",
                                                isLight
                                                    ? "bg-white border-zinc-200 text-zinc-900 focus:border-red-500"
                                                    : (isRed
                                                        ? "bg-black/20 border-white/10 text-white focus:border-[#D32F2F]"
                                                        : "bg-zinc-900 border-zinc-700 text-white focus:border-zinc-500")
                                            )}
                                            placeholder={t('roles_page.form.name_placeholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-2", isLight ? "text-zinc-700" : "text-zinc-300")}>{t('roles_page.form.description')}</label>
                                        <textarea
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className={cn(
                                                "w-full border rounded-lg px-4 py-2 focus:outline-none h-24 transition-colors",
                                                isLight
                                                    ? "bg-white border-zinc-200 text-zinc-900 focus:border-red-500"
                                                    : (isRed
                                                        ? "bg-black/20 border-white/10 text-white focus:border-[#D32F2F]"
                                                        : "bg-zinc-900 border-zinc-700 text-white focus:border-white")
                                            )}
                                            placeholder={t('roles_page.form.desc_placeholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className={cn("block text-sm font-medium mb-2", isLight ? "text-zinc-700" : "text-zinc-300")}>{t('roles_page.form.color')}</label>
                                        <input
                                            type="color"
                                            value={formData.color || '#6366f1'}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className={cn("w-20 h-10 border rounded-lg cursor-pointer transition-colors",
                                                isLight ? "bg-white border-zinc-200" : (isRed ? "bg-black/20 border-white/10" : "bg-zinc-900 border-zinc-700")
                                            )}
                                        />
                                    </div>
                                </>
                            )}


                            {activeTab === 'projects' && (
                                <div className="space-y-3">
                                    <h4 className={cn("font-semibold mb-4", isLight ? "text-zinc-900" : "text-white")}>{t('roles_page.sections.projects')}</h4>
                                    {[
                                        'viewAll', 'assignedOnly', 'create', 'edit', 'archive'
                                    ].map(key => (
                                        <label key={key} className={cn("flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors", isLight ? "hover:bg-zinc-50" : "hover:bg-white/5")}>
                                            <input
                                                type="checkbox"
                                                checked={formData.projectAccess?.[key as keyof typeof formData.projectAccess] || false}
                                                onChange={(e) => updateFormField('projectAccess', key, e.target.checked)}
                                                className={cn("mt-1 w-4 h-4 rounded focus:ring-2",
                                                    isLight
                                                        ? "border-zinc-300 text-red-600 focus:ring-red-500 bg-white"
                                                        : "border-white/20 bg-black/20 text-[#D32F2F] focus:ring-[#D32F2F]"
                                                )}
                                            />
                                            <div className="flex-1">
                                                <div className={cn("font-medium", isLight ? "text-zinc-900" : "text-white")}>
                                                    {t(`roles_page.permissions.projects.${key}.label`)}
                                                </div>
                                                <div className={cn("text-sm", isLight ? "text-zinc-500" : "text-zinc-500")}>
                                                    {t(`roles_page.permissions.projects.${key}.desc`)}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'tasks' && (
                                <div className="space-y-3">
                                    <h4 className={cn("font-semibold mb-4", isLight ? "text-zinc-900" : "text-white")}>{t('roles_page.sections.tasks')}</h4>
                                    {[
                                        'viewAll', 'assignedProjectsOnly', 'create', 'edit', 'delete'
                                    ].map(key => (
                                        <label key={key} className={cn("flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors", isLight ? "hover:bg-zinc-50" : "hover:bg-white/5")}>
                                            <input
                                                type="checkbox"
                                                checked={formData.taskAccess?.[key as keyof typeof formData.taskAccess] || false}
                                                onChange={(e) => updateFormField('taskAccess', key, e.target.checked)}
                                                className={cn("mt-1 w-4 h-4 rounded focus:ring-2",
                                                    isLight
                                                        ? "border-zinc-300 text-red-600 focus:ring-red-500 bg-white"
                                                        : "border-white/20 bg-black/20 text-[#D32F2F] focus:ring-[#D32F2F]"
                                                )}
                                            />
                                            <div className="flex-1">
                                                <div className={cn("font-medium", isLight ? "text-zinc-900" : "text-white")}>
                                                    {t(`roles_page.permissions.tasks.${key}.label`)}
                                                </div>
                                                <div className={cn("text-sm", isLight ? "text-zinc-500" : "text-zinc-500")}>
                                                    {t(`roles_page.permissions.tasks.${key}.desc`)}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'views' && (
                                <div className="space-y-3">
                                    <h4 className={cn("font-semibold mb-4", isLight ? "text-zinc-900" : "text-white")}>{t('roles_page.sections.views')}</h4>
                                    {[
                                        'dashboard', 'taskManager', 'taskDashboard', 'projectManagement', 'userManagement', 'weeklyEditor', 'dailyFollowUp'
                                    ].map(key => (
                                        <label key={key} className={cn("flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors", isLight ? "hover:bg-zinc-50" : "hover:bg-white/5")}>
                                            <input
                                                type="checkbox"
                                                checked={formData.viewAccess?.[key as keyof typeof formData.viewAccess] || false}
                                                onChange={(e) => updateFormField('viewAccess', key, e.target.checked)}
                                                className={cn("mt-1 w-4 h-4 rounded focus:ring-2",
                                                    isLight
                                                        ? "border-zinc-300 text-red-600 focus:ring-red-500 bg-white"
                                                        : "border-white/20 bg-black/20 text-[#D32F2F] focus:ring-[#D32F2F]"
                                                )}
                                            />
                                            <div className="flex-1">
                                                <div className={cn("font-medium", isLight ? "text-zinc-900" : "text-white")}>
                                                    {t(`roles_page.permissions.views.${key}.label`)}
                                                </div>
                                                <div className={cn("text-sm", isLight ? "text-zinc-500" : "text-zinc-500")}>
                                                    {t(`roles_page.permissions.views.${key}.desc`)}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'special' && (
                                <div className="space-y-3">
                                    <h4 className="text-white font-semibold mb-4">{t('roles_page.sections.special')}</h4>
                                    {[
                                        'viewAllUserProfiles', 'managePermissions', 'accessTrash', 'useCommandMenu'
                                    ].map(key => (
                                        <label key={key} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.specialPermissions?.[key as keyof typeof formData.specialPermissions] || false}
                                                onChange={(e) => updateFormField('specialPermissions', key, e.target.checked)}
                                                className="mt-1 w-4 h-4 rounded border-white/20 bg-black/20 text-[#D32F2F] focus:ring-[#D32F2F]"
                                            />
                                            <div className="flex-1">
                                                <div className="text-white font-medium">
                                                    {t(`roles_page.permissions.special.${key}.label`)}
                                                </div>
                                                <div className="text-zinc-500 text-sm">
                                                    {t(`roles_page.permissions.special.${key}.desc`)}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className={cn("p-4 border-t flex justify-end gap-3 shrink-0", isLight ? "bg-zinc-50 border-zinc-200" : (isRed ? "bg-[#D32F2F]/10 border-[#D32F2F]/20" : "bg-white/5 border-white/10"))}>
                            <button
                                onClick={() => setShowModal(false)}
                                className={cn("px-4 py-2 rounded font-bold transition-colors", isLight ? "text-zinc-500 hover:text-zinc-800" : (isRed ? "text-red-200 hover:text-white" : "text-zinc-400 hover:text-white"))}
                            >
                                {t('roles_page.form.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                className={cn("px-6 py-2 rounded shadow-lg font-bold flex items-center gap-2 transition-all",
                                    isLight
                                        ? "bg-red-600 hover:bg-red-700 text-white shadow-red-200"
                                        : (isRed ? "bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-red-900/20" : "bg-white hover:bg-zinc-200 text-black shadow-black/20")
                                )}
                            >
                                <Save className="w-4 h-4" />
                                {t('roles_page.form.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
