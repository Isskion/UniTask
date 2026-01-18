"use client";

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from "@/lib/utils";
import { Layout, ListTodo, FolderGit2, Briefcase, ChevronRight, Plus, Edit2, Trash2, Save, X, Loader2, Box, Layers } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSafeFirestore } from '@/hooks/useSafeFirestore';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AttributeDefinition } from '@/types';

const getIconForField = (field: string) => {
    switch (field) {
        case 'priority': return ListTodo;
        case 'area': return FolderGit2;
        case 'scope': return Briefcase;
        case 'module': return Layout;
        default: return Box;
    }
};

interface MasterDataItem {
    id: string;
    name: string;
    color: string;
    type: string; // 'priority' | 'area' | ... or 'attr_xyz'
    tenantId: string;
    isActive: boolean;
}

const SYSTEM_SECTIONS = [
    { id: 'priority', label: 'Prioridades', icon: ListTodo, color: '#f59e0b', description: 'Urgencia' },
    { id: 'area', label: 'Áreas', icon: FolderGit2, color: '#3b82f6', description: 'Departamentos' },
    { id: 'scope', label: 'Alcance', icon: Briefcase, color: '#8b5cf6', description: 'Tipos de trabajo' },
    { id: 'module', label: 'Módulos', icon: Layout, color: '#10b981', description: 'Módulos del sistema' },
];

export default function TaskMasterDataManagement() {
    const { theme } = useTheme();
    const { user, tenantId } = useAuth();
    const { addDoc, deleteDoc: safeDeleteDoc, updateDoc: safeUpdateDoc } = useSafeFirestore();
    const isLight = theme === 'light';

    // State
    const [activeSection, setActiveSection] = useState<string>('dashboard');
    const [items, setItems] = useState<MasterDataItem[]>([]); // Options for the active section (VIEW MODE)
    const [allMasterData, setAllMasterData] = useState<Record<string, MasterDataItem[]>>({}); // All options (DASHBOARD PREVIEW MODE)
    const [customAttributes, setCustomAttributes] = useState<AttributeDefinition[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State (Options)
    const [newItemName, setNewItemName] = useState("");
    const [newItemColor, setNewItemColor] = useState("#6366f1");
    const [isAdding, setIsAdding] = useState(false);

    // Form State (New/Edit Block)
    const [isCreatingBlock, setIsCreatingBlock] = useState(false);
    const [isEditingBlock, setIsEditingBlock] = useState(false); // New: Edit Mode
    const [blockFormName, setBlockFormName] = useState("");
    const [blockFormColor, setBlockFormColor] = useState("#ec4899");

    // Load Attributes (Blocks)
    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'attribute_definitions'), where('tenantId', '==', tenantId));
        const unsubscribe = onSnapshot(q, (snap) => {
            const attrs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttributeDefinition));
            setCustomAttributes(attrs);
        });
        return () => unsubscribe();
    }, [tenantId]);

    // Bootstrap Defaults removed - System sections are hardcoded now

    // Load All Master Data for Dashboard Preview
    useEffect(() => {
        if (!tenantId) return;
        const q = query(collection(db, 'master_data'), where('tenantId', '==', tenantId));
        return onSnapshot(q, (snap) => {
            const data: Record<string, MasterDataItem[]> = {};
            snap.forEach(doc => {
                const item = { id: doc.id, ...doc.data() } as MasterDataItem;
                if (!data[item.type]) data[item.type] = [];
                data[item.type].push(item);
            });
            // Sort
            Object.keys(data).forEach(k => data[k].sort((a, b) => a.name.localeCompare(b.name)));
            setAllMasterData(data);
        });
    }, [tenantId]);

    // Computed Sections (Mixed: System + Custom)
    const sections = useMemo(() => {
        // MERGE LOGIC:
        // 1. System Sections serve as base.
        // 2. If a custom attribute exists with the same ID or mappedField, we MERGE it (take name/color from DB, keep icon/desc from System).
        // 3. Pure custom attributes are added as is.

        const mergedSections = SYSTEM_SECTIONS.map(sys => {
            // Find override in DB
            const override = customAttributes.find(attr => attr.id === sys.id || attr.mappedField === sys.id);
            if (override) {
                return {
                    ...sys,
                    label: override.name, // Allow renaming system blocks
                    color: override.color, // Allow recoloring system blocks
                    // Keep icon and description fixed for consistency? Or allow override?
                    // Let's keep icon fixed.
                    isCustom: false, // Still system, but edited
                    originalId: sys.id // Track original ID
                };
            }
            return { ...sys, isCustom: false };
        });

        // Filter out customs that were already used as overrides
        const systemIds = SYSTEM_SECTIONS.map(s => s.id);
        const pureCustoms = customAttributes.filter(attr => !systemIds.includes(attr.id) && !systemIds.includes(attr.mappedField as any));

        return [
            ...mergedSections,
            ...pureCustoms.map(attr => ({
                id: attr.id,
                label: attr.name,
                icon: Box,
                color: attr.color,
                description: 'Personalizado',
                isCustom: true
            }))
        ];
    }, [customAttributes]);

    // Load Options for Active Section
    useEffect(() => {
        loadItems(activeSection === 'dashboard' ? undefined : activeSection);
    }, [activeSection, tenantId]);

    const loadItems = async (type?: string) => {
        if (!tenantId) return;
        setLoading(true);
        try {
            let q;
            if (type && type !== 'dashboard') {
                q = query(collection(db, 'master_data'), where('tenantId', '==', tenantId), where('type', '==', type));
            } else {
                // For Dashboard, we might want entry counts, but for now let's just enable navigation
                setLoading(false);
                return;
            }

            const snapshot = await getDocs(q);
            const loadedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterDataItem));
            loadedItems.sort((a, b) => a.name.localeCompare(b.name));
            setItems(loadedItems);
        } catch (error) {
            console.error("Error loading master data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddOption = async () => {
        if (!newItemName.trim() || !tenantId) return;
        try {
            setIsAdding(true);
            await addDoc(collection(db, 'master_data'), {
                name: newItemName.trim(),
                color: newItemColor,
                type: activeSection, // Links to System Section OR Attribute Definition ID
                tenantId: tenantId,
                isActive: true,
                createdAt: serverTimestamp(),
                createdBy: user?.uid || 'system'
            });
            setNewItemName("");
            await loadItems(activeSection);
        } catch (error) {
            console.error("Error adding item:", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleCreateBlock = async () => {
        if (!blockFormName.trim() || !tenantId) return;
        try {
            setIsAdding(true);
            await addDoc(collection(db, 'attribute_definitions'), {
                name: blockFormName.trim(),
                color: blockFormColor,
                tenantId,
                isActive: true,
                createdAt: serverTimestamp()
            });
            setBlockFormName("");
            setIsCreatingBlock(false);
        } catch (error) {
            console.error("Error creating block:", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdateBlock = async () => {
        if (!activeSection || !blockFormName.trim() || !tenantId) return;
        try {
            setIsAdding(true);
            const { doc, setDoc } = await import("firebase/firestore");

            // Logic:
            // If it's a pure custom block (activeSection is an ID), we update it.
            // If it's a SYSTEM block (activeSection is 'priority'), we check if an override exists.
            // If override exists (ID matches or mappedField matches), update it.
            // If not, CREATE a new attribute_definition with mappedField = activeSection to act as override.

            // Check if we have an existing definition for this ID
            // We can look at `customAttributes`
            const existingDef = customAttributes.find(attr => attr.id === activeSection || attr.mappedField === activeSection);

            if (existingDef) {
                // Update existing
                await safeUpdateDoc(doc(db, 'attribute_definitions', existingDef.id), {
                    name: blockFormName.trim(),
                    color: blockFormColor
                });
            } else {
                // Determine if it's a system ID we are overriding
                const isSystem = SYSTEM_SECTIONS.some(s => s.id === activeSection);
                if (isSystem) {
                    // Create Override
                    await setDoc(doc(db, 'attribute_definitions', activeSection), {
                        name: blockFormName.trim(),
                        color: blockFormColor,
                        tenantId,
                        isActive: true,
                        mappedField: activeSection, // Link to system
                        createdAt: serverTimestamp()
                    });
                } else {
                    // Should not happen for pure customs not in list, but fallback logic
                    console.error("Cannot update unknown block type");
                }
            }
            setIsEditingBlock(false);
        } catch (error) {
            console.error("Error updating block:", error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm("¿Eliminar opción?")) return;
        await safeDeleteDoc(doc(db, 'master_data', id));
        loadItems(activeSection);
    };

    const handleDeleteBlock = async (id: string) => {
        if (!confirm("¿Eliminar este bloque y todas sus opciones? Esta acción no se puede deshacer.")) return;
        // 1. Delete Definition
        await safeDeleteDoc(doc(db, 'attribute_definitions', id));
        // 2. Delete Options (Best effort client side, ideally backend function)
        const q = query(collection(db, 'master_data'), where('type', '==', id));
        const snap = await getDocs(q);
        snap.forEach(d => safeDeleteDoc(d.ref));
    };

    const handleRecoverData = async () => {
        if (!confirm("Esta acción escaneará todas las tareas existentes y recreará las opciones de Área, Alcance y Módulo que se hayan borrado accidentalmente. ¿Continuar?")) return;

        setLoading(true);
        try {
            // 1. Fetch all tasks
            const tasksSnapshot = await getDocs(query(collection(db, 'tasks'), where('tenantId', '==', tenantId)));
            const tasks = tasksSnapshot.docs.map(d => d.data());

            // 2. Extract unique values
            const recoveredOptions: Record<string, Set<string>> = {
                area: new Set(),
                scope: new Set(),
                module: new Set()
            };

            tasks.forEach((task: any) => {
                if (task.area) recoveredOptions.area.add(task.area);
                if (task.scope) recoveredOptions.scope.add(task.scope);
                if (task.module) recoveredOptions.module.add(task.module);
            });

            // 3. Fetch existing master data to avoid duplicates
            const existingSnapshot = await getDocs(query(collection(db, 'master_data'), where('tenantId', '==', tenantId)));
            const existingData = existingSnapshot.docs.map(d => d.data());

            let restoredCount = 0;

            const processType = async (type: string, values: Set<string>) => {
                for (const name of Array.from(values)) {
                    // Check if exists (case insensitive?)
                    const exists = existingData.find((d: any) => d.type === type && d.name.toLowerCase() === name.toLowerCase());
                    if (!exists) {
                        await addDoc(collection(db, 'master_data'), {
                            name: name,
                            color: '#94a3b8', // Default Slate-400
                            type: type,
                            tenantId: tenantId,
                            isActive: true,
                            createdAt: serverTimestamp(),
                            createdBy: 'recovery_script'
                        });
                        restoredCount++;
                    }
                }
            };

            await processType('area', recoveredOptions.area);
            await processType('scope', recoveredOptions.scope);
            await processType('module', recoveredOptions.module);

            alert(`Proceso finalizado. Se han restaurado ${restoredCount} opciones.`);
            window.location.reload(); // Refresh to see changes

        } catch (error) {
            console.error("Recovery failed:", error);
            alert("Error al recuperar datos. Revisa la consola.");
        } finally {
            setLoading(false);
        }
    };

    const activeSectionData = sections.find(s => s.id === activeSection);

    return (
        <div className={cn("flex-1 p-6 overflow-y-auto h-full", isLight ? "bg-zinc-50/50" : "bg-[#09090b]")}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6 text-xs font-medium text-zinc-500">
                <span className="cursor-pointer hover:text-foreground" onClick={() => setActiveSection('dashboard')}>Admin</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground">{activeSection === 'dashboard' ? 'Maestros y Atributos' : activeSectionData?.label}</span>
            </div>

            <div className="max-w-6xl mx-auto">
                {activeSection === 'dashboard' ? (
                    <>
                        {/* Header */}
                        <div className={cn(
                            "flex justify-between items-end mb-6 p-6 rounded-xl border shadow-sm",
                            isLight ? "bg-white border-zinc-200" : (theme === 'red' ? "bg-white border-red-100" : "bg-card border-border")
                        )}>
                            <div>
                                <h1 className={cn("text-2xl font-bold tracking-tight mb-1", theme === 'red' ? "text-red-900" : "text-foreground")}>Gestión de Tareas</h1>
                                <p className={cn("text-sm", theme === 'red' ? "text-red-700/70" : "text-muted-foreground")}>Define las opciones de clasificación y añade nuevos criterios dinámicos.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRecoverData}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg text-xs font-medium transition-all",
                                        theme === 'red' ? "border-red-200 text-red-600 hover:bg-red-50" : "border-zinc-400 text-zinc-500 hover:bg-muted"
                                    )}
                                    title="Escanear tareas y restaurar opciones perdidas"
                                >
                                    <Save className="w-3.5 h-3.5" /> Recuperar Datos
                                </button>
                                <button
                                    onClick={() => setIsCreatingBlock(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
                                >
                                    <Plus className="w-4 h-4" /> Nuevo Bloque
                                </button>
                            </div>
                        </div>

                        {/* Create Block Form */}
                        {isCreatingBlock && (
                            <div className={cn("mb-8 p-4 rounded-xl border animate-in slide-in-from-top-4",
                                isLight ? "bg-white" : (theme === 'red' ? "bg-white border-red-100" : "bg-card")
                            )}>
                                <h3 className="text-sm font-bold mb-3">Definir Nuevo Criterio</h3>
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <label className="text-xs text-muted-foreground font-bold uppercase">Nombre (ej. País, Versión)</label>
                                        <input
                                            value={blockFormName}
                                            onChange={e => setBlockFormName(e.target.value)}
                                            className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm focus:ring-2 ring-primary/20 outline-none"
                                            placeholder="Nombre del bloque..."
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground font-bold uppercase">Color</label>
                                        <div className="mt-1 flex gap-2">
                                            <input type="color" value={blockFormColor} onChange={e => setBlockFormColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsCreatingBlock(false)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">Cancelar</button>
                                        <button onClick={handleCreateBlock} disabled={!blockFormName.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50">Crear</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Grid - Compat Mode (50% Size Reduction requested) */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {sections.map(section => {
                                // Custom Block Logic
                                // Use raw ID as type
                                const blockOptions = allMasterData[section.id] || [];
                                const previewOptions = blockOptions.slice(0, 3);

                                return (
                                    <div
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={cn(
                                            "group relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.98]",
                                            isLight ? "bg-white border-zinc-200 hover:border-zinc-300" : (theme === 'red' ? "bg-white border-red-100 hover:border-red-200" : "bg-card border-white/5 hover:border-white/10")
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: `${section.color}15`, color: section.color }}>
                                                <section.icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-sm truncate">{section.label}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">
                                                        {blockOptions.length}
                                                    </span>
                                                    {(section as any).isCustom && (
                                                        <span className="text-[8px] uppercase tracking-wider text-muted-foreground opacity-50">Custom</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Delete moved to detail view */}
                                        </div>

                                        {/* Options Preview */}
                                        <div className="space-y-1">
                                            {previewOptions.length > 0 ? (
                                                previewOptions.map(opt => (
                                                    <div key={opt.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: opt.color || section.color }} />
                                                        <span className="truncate max-w-[120px]">{opt.name}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-[10px] text-muted-foreground/50 italic pl-1">Sin opciones...</div>
                                            )}
                                            {blockOptions.length > 3 && (
                                                <div className="text-[9px] text-muted-foreground/50 pl-3.5">
                                                    +{blockOptions.length - 3} más...
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute right-0 top-0 w-12 h-12 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Detail View Header */}
                        <div className="flex justify-between items-center mb-6 pb-6 border-b">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${activeSectionData?.color}20`, color: activeSectionData?.color }}>
                                    {activeSectionData && <activeSectionData.icon className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold">{activeSectionData?.label}</h1>
                                    <p className="text-xs text-muted-foreground">Gestionando opciones para {activeSectionData?.label}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setBlockFormName(activeSectionData?.label || "");
                                            setBlockFormColor(activeSectionData?.color || "#ec4899");
                                            setIsEditingBlock(true);
                                        }}
                                        className="px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-muted flex items-center gap-2"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    {(activeSectionData as any)?.isCustom && (
                                        <button
                                            onClick={() => {
                                                if (confirm("¿Estás seguro de que quieres eliminar este bloque? Esta acción borrará el bloque y todas sus opciones asociadas. No se puede deshacer.")) {
                                                    handleDeleteBlock(activeSection);
                                                    setActiveSection('dashboard');
                                                }
                                            }}
                                            className="px-3 py-1.5 border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Borrar
                                        </button>
                                    )}
                                    <button onClick={() => setActiveSection('dashboard')} className="px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-muted">
                                        Esc
                                    </button>
                                </div>
                            </div>

                            {/* Edit Block Form (Inline Modal?) */}
                            {isEditingBlock && (
                                <div className={cn("mb-6 p-4 rounded-xl border animate-in slide-in-from-top-2",
                                    isLight ? "bg-white" : (theme === 'red' ? "bg-white border-red-100" : "bg-card")
                                )}>
                                    <h3 className="text-sm font-bold mb-3">Editar Bloque</h3>
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <label className="text-xs text-muted-foreground font-bold uppercase">Nombre</label>
                                            <input
                                                value={blockFormName}
                                                onChange={e => setBlockFormName(e.target.value)}
                                                className="w-full mt-1 px-3 py-2 bg-background border rounded-lg text-sm focus:ring-2 ring-primary/20 outline-none"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground font-bold uppercase">Color</label>
                                            <div className="mt-1 flex gap-2">
                                                <input type="color" value={blockFormColor} onChange={e => setBlockFormColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditingBlock(false)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">Cancelar</button>
                                            <button onClick={handleUpdateBlock} disabled={!blockFormName.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50">Guardar</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Add Option */}
                        <div className="flex gap-3 mb-6">
                            <input
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddOption()}
                                placeholder="Nueva opción..."
                                className="flex-1 px-4 py-2 bg-background border rounded-lg text-sm focus:ring-2 ring-primary/20 outline-none"
                                autoFocus
                            />
                            <input
                                type="color"
                                value={newItemColor}
                                onChange={e => setNewItemColor(e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border p-0"
                            />
                            <button
                                onClick={handleAddOption}
                                disabled={!newItemName.trim() || isAdding}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                            >
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Añadir
                            </button>
                        </div>

                        {/* Options List */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {items.map(item => (
                                <div key={item.id} className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border transition-colors group",
                                    isLight ? "bg-white border-zinc-200" : (theme === 'red' ? "bg-white border-red-100" : "bg-card hover:border-primary/50")
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <button onClick={() => handleDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {items.length === 0 && !loading && (
                                <div className="col-span-full py-12 text-center text-muted-foreground text-sm italic border border-dashed rounded-xl">
                                    No hay opciones definidas.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
