"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { PermissionGroup } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Shield, Plus, Edit2, Copy, Trash2, X, Save, FolderGit2, ListTodo, BarChart3, Users, Settings, Sparkles } from 'lucide-react';
import { seedPermissionGroups } from '@/lib/permissionGroups';

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
    const { user } = useAuth();
    const [groups, setGroups] = useState<PermissionGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'projects' | 'tasks' | 'views' | 'special'>('general');
    const [formData, setFormData] = useState<Partial<PermissionGroup>>(DEFAULT_GROUP);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'permission_groups'));
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
            name: `${group.name} (Copia)`,
            id: undefined
        });
        setActiveTab('general');
        setShowModal(true);
    };

    const handleDelete = async (groupId: string) => {
        if (!confirm('¿Estás seguro de eliminar este grupo de permisos? Los usuarios asignados perderán estos permisos.')) return;

        try {
            await deleteDoc(doc(db, 'permission_groups', groupId));
            await loadGroups();
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('Error al eliminar el grupo');
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.description) {
            alert('Por favor completa el nombre y descripción');
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
            alert('Error al guardar el grupo');
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
            alert('✅ Grupos predefinidos creados exitosamente!');
        } catch (error) {
            console.error('Error initializing groups:', error);
            alert('Error al inicializar grupos');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#09090b]">
                <div className="text-zinc-500">Cargando grupos de permisos...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#09090b]">
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0c0c0e]">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    Gestión de Grupos de Permisos
                </h2>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20"
                >
                    <Plus className="w-4 h-4" />
                    Crear Grupo
                </button>
            </div>

            {/* Groups Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map(group => (
                        <div
                            key={group.id}
                            className="bg-[#121212] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all group"
                            style={{ borderLeftWidth: '4px', borderLeftColor: group.color }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="text-white font-bold text-lg mb-1">{group.name}</h3>
                                    <p className="text-zinc-500 text-sm">{group.description}</p>
                                </div>
                            </div>

                            {/* Permission Icons */}
                            <div className="flex items-center gap-3 mb-4 text-zinc-600">
                                {group.projectAccess?.viewAll && <span title="Proyectos"><FolderGit2 className="w-4 h-4" /></span>}
                                {group.taskAccess?.create && <span title="Tareas"><ListTodo className="w-4 h-4" /></span>}
                                {group.viewAccess?.dashboard && <span title="Dashboard"><BarChart3 className="w-4 h-4" /></span>}
                                {group.specialPermissions?.managePermissions && <span title="Admin"><Shield className="w-4 h-4" /></span>}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(group)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-medium rounded hover:bg-zinc-700 transition-colors"
                                >
                                    <Edit2 className="w-3 h-3" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDuplicate(group)}
                                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-medium rounded hover:bg-zinc-700 transition-colors"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => handleDelete(group.id)}
                                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-medium rounded hover:bg-red-900/50 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {groups.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
                            <div className="w-16 h-16 rounded-full bg-indigo-600/10 flex items-center justify-center mb-4">
                                <Shield className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No hay grupos de permisos</h3>
                            <p className="text-zinc-500 text-center mb-6 max-w-md">
                                Crea grupos de permisos para organizar y gestionar el acceso de los usuarios a diferentes partes del sistema.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleInitializeGroups}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-900/30"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Inicializar Grupos Predefinidos
                                </button>
                                <button
                                    onClick={handleCreate}
                                    className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Crear Grupo Personalizado
                                </button>
                            </div>
                            <p className="text-zinc-600 text-xs mt-4">
                                Los grupos predefinidos incluyen: Administradores, Project Managers, Equipo, Consultor y Usuario Externo
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h3 className="text-xl font-bold text-white">
                                {editingGroup ? 'Editar Grupo' : 'Crear Grupo'}: {formData.name || 'Nuevo Grupo'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 px-6 pt-4 border-b border-white/5">
                            {[
                                { id: 'general', label: 'General' },
                                { id: 'projects', label: 'Proyectos' },
                                { id: 'tasks', label: 'Tareas' },
                                { id: 'views', label: 'Vistas' },
                                { id: 'special', label: 'Especiales' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`}
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
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">Nombre del Grupo</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="Ej: Equipo Técnico"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">Descripción</label>
                                        <textarea
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 h-24"
                                            placeholder="Describe los permisos y responsabilidades de este grupo"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">Color Identificador</label>
                                        <input
                                            type="color"
                                            value={formData.color || '#6366f1'}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-20 h-10 bg-black/20 border border-white/10 rounded-lg cursor-pointer"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'projects' && (
                                <div className="space-y-3">
                                    <h4 className="text-white font-semibold mb-4">Acceso a Proyectos</h4>
                                    {[
                                        { key: 'viewAll', label: 'Ver todos los proyectos', desc: 'Permite ver la lista completa de proyectos en la organización' },
                                        { key: 'assignedOnly', label: 'Solo proyectos asignados', desc: 'Solo muestra proyectos donde el usuario es miembro directo' },
                                        { key: 'create', label: 'Crear proyectos', desc: 'Habilita la capacidad de iniciar nuevos proyectos' },
                                        { key: 'edit', label: 'Editar proyectos', desc: 'Permite modificar detalles, fechas y miembros de proyectos existentes' },
                                        { key: 'archive', label: 'Archivar proyectos', desc: 'Permite mover proyectos a un estado de solo lectura o eliminarlos' }
                                    ].map(perm => (
                                        <label key={perm.key} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.projectAccess?.[perm.key as keyof typeof formData.projectAccess] || false}
                                                onChange={(e) => updateFormField('projectAccess', perm.key, e.target.checked)}
                                                className="mt-1 w-4 h-4 rounded border-white/20 bg-black/20 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                <div className="text-white font-medium">{perm.label}</div>
                                                <div className="text-zinc-500 text-sm">{perm.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'tasks' && (
                                <div className="space-y-3">
                                    <h4 className="text-white font-semibold mb-4">Acceso a Tareas</h4>
                                    {[
                                        { key: 'viewAll', label: 'Ver todas las tareas', desc: 'Permite ver tareas de todos los proyectos' },
                                        { key: 'assignedProjectsOnly', label: 'Solo tareas de proyectos asignados', desc: 'Limita la visibilidad a tareas de proyectos donde es miembro' },
                                        { key: 'create', label: 'Crear tareas', desc: 'Habilita la creación de nuevas tareas' },
                                        { key: 'edit', label: 'Editar tareas', desc: 'Permite modificar tareas existentes' },
                                        { key: 'delete', label: 'Eliminar tareas', desc: 'Permite eliminar tareas permanentemente' }
                                    ].map(perm => (
                                        <label key={perm.key} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.taskAccess?.[perm.key as keyof typeof formData.taskAccess] || false}
                                                onChange={(e) => updateFormField('taskAccess', perm.key, e.target.checked)}
                                                className="mt-1 w-4 h-4 rounded border-white/20 bg-black/20 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                <div className="text-white font-medium">{perm.label}</div>
                                                <div className="text-zinc-500 text-sm">{perm.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'views' && (
                                <div className="space-y-3">
                                    <h4 className="text-white font-semibold mb-4">Acceso a Vistas</h4>
                                    {[
                                        { key: 'dashboard', label: 'Dashboard', desc: 'Vista de métricas y gráficos' },
                                        { key: 'taskManager', label: 'Gestor de Tareas', desc: 'Vista detallada de gestión de tareas' },
                                        { key: 'taskDashboard', label: 'Todas las Tareas', desc: 'Vista global de exportación de tareas' },
                                        { key: 'projectManagement', label: 'Gestión de Proyectos', desc: 'Vista de administración de proyectos' },
                                        { key: 'userManagement', label: 'Gestión de Usuarios', desc: 'Vista de administración de usuarios' },
                                        { key: 'weeklyEditor', label: 'Editor Semanal', desc: 'Vista de planificación semanal' },
                                        { key: 'dailyFollowUp', label: 'Seguimiento Diario', desc: 'Vista de bitácora diaria' }
                                    ].map(perm => (
                                        <label key={perm.key} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.viewAccess?.[perm.key as keyof typeof formData.viewAccess] || false}
                                                onChange={(e) => updateFormField('viewAccess', perm.key, e.target.checked)}
                                                className="mt-1 w-4 h-4 rounded border-white/20 bg-black/20 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                <div className="text-white font-medium">{perm.label}</div>
                                                <div className="text-zinc-500 text-sm">{perm.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'special' && (
                                <div className="space-y-3">
                                    <h4 className="text-white font-semibold mb-4">Permisos Especiales</h4>
                                    {[
                                        { key: 'viewAllUserProfiles', label: 'Ver todos los perfiles de usuario', desc: 'Acceso a información de todos los usuarios' },
                                        { key: 'managePermissions', label: 'Gestionar permisos', desc: 'Permite crear y editar grupos de permisos (Admin)' },
                                        { key: 'accessTrash', label: 'Acceder a papelera', desc: 'Ver y restaurar elementos eliminados' },
                                        { key: 'useCommandMenu', label: 'Usar menú de comandos', desc: 'Acceso al menú rápido de navegación' }
                                    ].map(perm => (
                                        <label key={perm.key} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.specialPermissions?.[perm.key as keyof typeof formData.specialPermissions] || false}
                                                onChange={(e) => updateFormField('specialPermissions', perm.key, e.target.checked)}
                                                className="mt-1 w-4 h-4 rounded border-white/20 bg-black/20 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="flex-1">
                                                <div className="text-white font-medium">{perm.label}</div>
                                                <div className="text-zinc-500 text-sm">{perm.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-zinc-800 text-zinc-300 text-sm font-medium rounded hover:bg-zinc-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20"
                            >
                                <Save className="w-4 h-4" />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
