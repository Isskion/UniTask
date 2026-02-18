"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from "@/lib/utils";
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import {
    collection, query, where, getDocs, addDoc, updateDoc,
    doc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DocumentType } from '@/types';
import {
    Plus, Search, Edit2, Trash2, Save, X,
    CheckSquare, FileText, Info, Image as ImageIcon
} from 'lucide-react';

export default function DocumentTypesManager() {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { t } = useLanguage();
    const { showToast } = useToast();
    const { tenantId } = useAuth();

    // State
    const [types, setTypes] = useState<DocumentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<DocumentType>>({
        code: '',
        name: '',
        description: '',
        isProjectChecklist: false,
        isImage: false
    });

    // Load Data
    useEffect(() => {
        if (!tenantId) return;
        loadTypes();
    }, [tenantId]);

    const loadTypes = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'document_types'),
                where('tenantId', '==', tenantId),
                where('isActive', '==', true)
                // orderBy('code', 'asc') // Temporarily removed to rule out Index issues
            );
            const snap = await getDocs(q);
            setTypes(snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentType)));
        } catch (error) {
            console.error("Error loading document types:", error);
            showToast("UniTask", "Error loading types", "error");
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleEdit = (type: DocumentType) => {
        setEditingId(type.id);
        setFormData({
            code: type.code,
            name: type.name,
            description: type.description,
            isProjectChecklist: type.isProjectChecklist,
            isImage: type.isImage || false
        });
        setIsCreating(false);
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            code: '',
            name: '',
            description: '',
            isProjectChecklist: false,
            isImage: false
        });
        setIsCreating(true);
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsCreating(false);
        setFormData({});
    };

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            showToast("UniTask", "Code and Name are required", "error");
            return;
        }

        try {
            if (isCreating) {
                await addDoc(collection(db, 'document_types'), {
                    ...formData,
                    tenantId,
                    isActive: true,
                    createdAt: serverTimestamp()
                });
                showToast("UniTask", "Document Type Created", "success");
            } else if (editingId) {
                const ref = doc(db, 'document_types', editingId);
                await updateDoc(ref, {
                    ...formData
                });
                showToast("UniTask", "Document Type Updated", "success");
            }
            handleCancel();
            await loadTypes();
        } catch (error: any) {
            console.error("Error saving:", error);
            alert(`Error detallado: ${error.code} - ${error.message}`);
            showToast("UniTask", `Failed to save: ${error.code}`, "error");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this type?")) return;
        try {
            const ref = doc(db, 'document_types', id);
            await updateDoc(ref, { isActive: false });
            showToast("UniTask", "Deleted", "success");
            await loadTypes();
        } catch (error) {
            console.error("Error deleting:", error);
            showToast("UniTask", "Failed to delete", "error");
        }
    };

    // Filter
    const filteredTypes = types.filter(t =>
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const bgColor = isLight ? "bg-white" : "bg-black/20";
    const borderColor = isLight ? "border-zinc-200" : "border-white/10";
    const textColor = isLight ? "text-zinc-900" : "text-white";

    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className={cn("text-2xl font-bold", textColor)}>Tipos de Documento</h1>
                    <p className="text-muted-foreground text-sm">Gestión de tipos de minutas y checklist de proyectos</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Nuevo Tipo
                </button>
            </div>

            {/* List & Form Container */}
            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Left: List */}
                <div className={cn("flex-[2] flex flex-col rounded-xl border overflow-hidden", bgColor, borderColor)}>
                    <div className={cn("p-4 border-b", borderColor)}>
                        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border", isLight ? "bg-zinc-50" : "bg-white/5", borderColor)}>
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar por código o nombre..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {loading ? (
                            <div className="text-center p-8 text-muted-foreground">Cargando...</div>
                        ) : filteredTypes.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground">No hay tipos definidos</div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase text-muted-foreground bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3">Código</th>
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3 text-center">Proyecto?</th>
                                        <th className="px-4 py-3 text-center">Imagen?</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTypes.map(type => (
                                        <tr key={type.id} className={cn("border-b last:border-0 hover:bg-muted/50 transition-colors", borderColor)}>
                                            <td className="px-4 py-3 font-mono text-xs">{type.code}</td>
                                            <td className="px-4 py-3 font-medium">{type.name}</td>
                                            <td className="px-4 py-3 text-center">
                                                {type.isProjectChecklist && (
                                                    <CheckSquare className="w-4 h-4 text-green-500 mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {type.isImage && (
                                                    <ImageIcon className="w-4 h-4 text-blue-500 mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => handleEdit(type)} className="p-2 hover:text-primary transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(type.id)} className="p-2 hover:text-destructive transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Right: Form (Overlay or Side Panel when creating/editing) */}
                {(isCreating || editingId) && (
                    <div className={cn("flex-1 rounded-xl border p-6 flex flex-col gap-4 h-fit max-h-[85vh] overflow-y-auto", bgColor, borderColor)}>
                        <h3 className={cn("font-bold text-lg flex items-center gap-2", textColor)}>
                            {isCreating ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                            {isCreating ? "Crear Nuevo Tipo" : "Editar Tipo"}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Código</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="ej. SCOPE"
                                    className={cn("w-full px-3 py-2 rounded-lg border text-sm", isLight ? "bg-white" : "bg-black/20", borderColor)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Nombre</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="ej. Definición de Alcance"
                                    className={cn("w-full px-3 py-2 rounded-lg border text-sm", isLight ? "bg-white" : "bg-black/20", borderColor)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Descripción (Memo)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    placeholder="Explica qué tipo de información se espera..."
                                    className={cn("w-full px-3 py-2 rounded-lg border text-sm resize-none", isLight ? "bg-white" : "bg-black/20", borderColor)}
                                />
                            </div>

                            <div className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                                <input
                                    type="checkbox"
                                    id="chkProject"
                                    checked={formData.isProjectChecklist || false}
                                    onChange={e => setFormData({ ...formData, isProjectChecklist: e.target.checked })}
                                    className="w-3 h-3 text-primary rounded border-gray-300 focus:ring-primary"
                                />
                                <label htmlFor="chkProject" className="text-sm cursor-pointer select-none flex-1 leading-tight">
                                    <span className="font-bold block text-primary text-xs">Check de Proyecto</span>
                                    <span className="text-[10px] text-muted-foreground">Requisito clave para el Checklist del Proyecto.</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-blue-500/30 bg-blue-500/5">
                                <input
                                    type="checkbox"
                                    id="chkImage"
                                    checked={formData.isImage || false}
                                    onChange={e => setFormData({ ...formData, isImage: e.target.checked })}
                                    className="w-3 h-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="chkImage" className="text-sm cursor-pointer select-none flex-1 leading-tight">
                                    <span className="font-bold block text-blue-500 text-xs">Información en Imagen/PDF</span>
                                    <span className="text-[10px] text-muted-foreground">Se aporta como archivo adjunto en vez de extraer texto.</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dashed">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                            >
                                <Save className="w-4 h-4" /> Guardar
                            </button>
                        </div>
                    </div>
                )}

                {(!isCreating && !editingId) && (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50 border-2 border-dashed rounded-xl p-8">
                        <FileText className="w-12 h-12 mb-4" />
                        <p className="text-center">Selecciona un tipo para editar o crea uno nuevo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
