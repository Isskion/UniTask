"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from "@/lib/utils";
import { Layout, ListTodo, FolderGit2, Briefcase, ChevronRight, Plus, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSafeFirestore } from '@/hooks/useSafeFirestore';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MasterDataItem {
    id: string;
    name: string;
    color: string;
    type: 'priority' | 'area' | 'scope' | 'module';
    tenantId: string;
    isActive: boolean;
}

export default function TaskMasterDataManagement() {
    const { theme } = useTheme();
    const { user, tenantId } = useAuth();
    const { addDoc, deleteDoc: safeDeleteDoc } = useSafeFirestore();
    const isLight = theme === 'light';
    const isRed = theme === 'red';

    const [activeSection, setActiveSection] = useState<'dashboard' | 'priority' | 'area' | 'scope' | 'module'>('dashboard');
    const [items, setItems] = useState<MasterDataItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [newItemName, setNewItemName] = useState("");
    const [newItemColor, setNewItemColor] = useState("#6366f1");
    const [isAdding, setIsAdding] = useState(false);

    const sections = [
        { id: 'priority', label: 'Prioridades', icon: ListTodo, color: '#f59e0b', description: 'Define niveles de urgencia (Alta, Media, Baja)' },
        { id: 'area', label: 'Áreas', icon: FolderGit2, color: '#3b82f6', description: 'Departamentos o áreas de negocio (Finanzas, IT, RRHH)' },
        { id: 'scope', label: 'Alcance', icon: Briefcase, color: '#8b5cf6', description: 'Tipos de trabajo o alcance (Proyecto, Soporte, Mantenimiento)' },
        { id: 'module', label: 'Módulos', icon: Layout, color: '#10b981', description: 'Módulos del sistema afectados (WMS, TMS, ERP)' },
    ];

    useEffect(() => {
        // Load all items initially for dashboard, or filter when section changes
        loadItems(activeSection === 'dashboard' ? undefined : activeSection);
    }, [activeSection, tenantId]);

    const loadItems = async (type?: string) => {
        if (!tenantId) return;
        setLoading(true);
        try {
            let q;
            if (type) {
                q = query(
                    collection(db, 'master_data'),
                    where('tenantId', '==', tenantId),
                    where('type', '==', type)
                );
            } else {
                q = query(
                    collection(db, 'master_data'),
                    where('tenantId', '==', tenantId)
                );
            }

            const snapshot = await getDocs(q);
            const loadedItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as MasterDataItem[];

            // Client-side sort fallback
            loadedItems.sort((a, b) => a.name.localeCompare(b.name));

            setItems(loadedItems);
        } catch (error) {
            console.error("Error loading master data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!newItemName.trim() || !tenantId) return;

        try {
            setIsAdding(true);
            await addDoc(collection(db, 'master_data'), {
                name: newItemName.trim(),
                color: newItemColor,
                type: activeSection,
                tenantId: tenantId,
                isActive: true,
                createdAt: serverTimestamp(),
                createdBy: user?.uid || 'system'
            });

            setNewItemName("");
            // Reload specific type or all if in dashboard (though we are only adding in detail view)
            await loadItems(activeSection as string);
        } catch (error) {
            console.error("Error adding item:", error);
            alert("Error al crear el elemento");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este elemento?")) return;
        try {
            await safeDeleteDoc(doc(db, 'master_data', id));
            await loadItems(activeSection as string);
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Error al eliminar el elemento");
        }
    };

    const activeSectionData = sections.find(s => s.id === activeSection);

    // Filter items for dashboard view
    const getItemsByType = (type: string) => items.filter(i => i.type === type);

    return (
        <div className={cn("flex-1 p-8 overflow-y-auto h-full",
            isLight ? "bg-white" : "bg-[#09090b]"
        )}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-8 text-sm text-zinc-500">
                <span className="cursor-pointer hover:text-zinc-300" onClick={() => setActiveSection('dashboard')}>Administración</span>
                <ChevronRight className="w-4 h-4" />
                <span className={cn("font-bold", isLight ? "text-zinc-900" : "text-white")}>
                    {activeSection === 'dashboard' ? 'Gestión de Tareas' : activeSectionData?.label}
                </span>
            </div>

            <div className="max-w-7xl mx-auto">
                {activeSection === 'dashboard' ? (
                    <>
                        <h1 className={cn("text-3xl font-bold mb-2", isLight ? "text-zinc-900" : "text-white")}>Gestión de Maestros de Tareas</h1>
                        <p className={cn("mb-8", isLight ? "text-zinc-600" : "text-zinc-400")}>Configura las listas desplegables y opciones disponibles en el formulario de tareas.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                            {sections.map(section => {
                                const sectionItems = getItemsByType(section.id);
                                return (
                                    <div
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id as any)}
                                        className={cn(
                                            "group relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 cursor-pointer hover:shadow-2xl flex flex-col h-full",
                                            isLight
                                                ? "bg-white border-zinc-200 hover:border-zinc-300 shadow-sm"
                                                : "bg-[#18181b] border-white/5 hover:border-white/10 hover:shadow-black/50"
                                        )}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                            <section.icon className="w-24 h-24" style={{ color: section.color }} />
                                        </div>

                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="mb-auto">
                                                <div className="mb-4 inline-flex p-3 rounded-xl bg-opacity-10 backdrop-blur-sm" style={{ backgroundColor: `${section.color}20` }}>
                                                    <section.icon className="w-8 h-8" style={{ color: section.color }} />
                                                </div>
                                                <h3 className={cn("text-xl font-bold mb-2", isLight ? "text-zinc-900" : "text-white")}>{section.label}</h3>
                                                <p className={cn("text-sm leading-relaxed mb-4", isLight ? "text-zinc-600" : "text-zinc-400")}>
                                                    {section.description}
                                                </p>
                                            </div>

                                            {/* Tag Preview Area */}
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {sectionItems.length > 0 ? (
                                                    sectionItems.slice(0, 5).map(item => (
                                                        <span
                                                            key={item.id}
                                                            className="text-[10px] font-bold px-2 py-1 rounded-md shadow-sm border border-black/5"
                                                            style={{ backgroundColor: item.color, color: '#fff' }}
                                                        >
                                                            {item.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs italic text-zinc-500 opacity-50">Sin elementos definidos</span>
                                                )}
                                                {sectionItems.length > 5 && (
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-white/10">
                                                        +{sectionItems.length - 5}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity border-t pt-4 border-dashed border-zinc-700/50" style={{ color: section.color }}>
                                                Gestionar <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className={cn("text-2xl font-bold flex items-center gap-3", isLight ? "text-zinc-900" : "text-white")}>
                                    <div className="p-2 rounded-lg bg-opacity-10" style={{ backgroundColor: `${activeSectionData?.color}20` }}>
                                        {activeSectionData && <activeSectionData.icon className="w-6 h-6" style={{ color: activeSectionData.color }} />}
                                    </div>
                                    Gestión de {activeSectionData?.label}
                                </h1>
                                <p className={cn("mt-1", isLight ? "text-zinc-600" : "text-zinc-400")}>
                                    Crea y gestiona las etiquetas para {activeSectionData?.label.toLowerCase()}.
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveSection('dashboard')}
                                className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                    isLight
                                        ? "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                                        : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                                )}
                            >
                                Volver al Dashboard
                            </button>
                        </div>

                        {/* Add New Item */}
                        <div className={cn("p-4 rounded-xl border mb-6 flex gap-4 items-end",
                            isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/10"
                        )}>
                            <div className="flex-1">
                                <label className={cn("block text-xs font-bold uppercase mb-1", isLight ? "text-zinc-500" : "text-zinc-400")}>Nombre de la Etiqueta</label>
                                <input
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder={`Ej: ${activeSection === 'priority' ? 'Alta' : 'Nuevo Item'}`}
                                    className={cn("w-full px-4 py-2 rounded-lg border focus:outline-none transition-all",
                                        isLight
                                            ? "bg-white border-zinc-300 text-zinc-900 focus:border-indigo-500"
                                            : "bg-black/20 border-white/10 text-white focus:border-indigo-500"
                                    )}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                />
                            </div>
                            <div>
                                <label className={cn("block text-xs font-bold uppercase mb-1", isLight ? "text-zinc-500" : "text-zinc-400")}>Color</label>
                                <input
                                    type="color"
                                    value={newItemColor}
                                    onChange={(e) => setNewItemColor(e.target.value)}
                                    className={cn("w-20 h-10 rounded-lg border cursor-pointer",
                                        isLight ? "bg-white border-zinc-300" : "bg-black/20 border-white/10"
                                    )}
                                />
                            </div>
                            <button
                                onClick={handleAddItem}
                                disabled={isAdding || !newItemName.trim()}
                                className={cn("px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all h-10",
                                    isLight
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                                )}
                            >
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Agregar
                            </button>
                        </div>

                        {/* List */}
                        {loading ? (
                            <div className="py-10 text-center text-zinc-500 flex flex-col items-center">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                Cargando...
                            </div>
                        ) : items.length === 0 ? (
                            <div className="py-12 text-center border border-dashed rounded-xl border-zinc-700/50">
                                <p className="text-zinc-500 italic">No hay elementos definidos todavía.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {items.map(item => (
                                    <div
                                        key={item.id}
                                        className={cn("group p-3 rounded-xl border flex items-center justify-between transition-all hover:scale-[1.01]",
                                            isLight
                                                ? "bg-white border-zinc-200 hover:border-indigo-300 hover:shadow-md"
                                                : "bg-[#18181b] border-white/5 hover:border-white/20 hover:shadow-lg"
                                        )}
                                        style={{ borderLeftWidth: '4px', borderLeftColor: item.color }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner"
                                                style={{ backgroundColor: `${item.color}30`, color: item.color }}
                                            >
                                                {item.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className={cn("font-bold text-sm", isLight ? "text-zinc-800" : "text-zinc-200")}>{item.name}</div>
                                                <div className="text-[10px] text-zinc-500 font-mono">ID: {item.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
