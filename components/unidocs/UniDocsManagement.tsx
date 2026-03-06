"use client";

import React, { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Edit2, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { UniDocsTemplate, TemplateBlock, PageMargins, DEFAULT_PAGE_MARGINS } from '@/types/unidocs';
import UniDocsTemplateDesigner from './UniDocsTemplateDesigner';

export default function UniDocsManagement() {
    const { tenantId } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [templates, setTemplates] = useState<UniDocsTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    // Designer state
    const [designerOpen, setDesignerOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<UniDocsTemplate | null>(null);

    useEffect(() => {
        if (tenantId) fetchTemplates();
    }, [tenantId]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'unidocs_templates'), where('tenantId', '==', tenantId));
            const snap = await getDocs(q);
            setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as UniDocsTemplate)));
        } catch (e) {
            console.error(e);
            showToast(t('common.error'), t('reports.load_error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: { name: string; description: string; blocks: TemplateBlock[]; pageMargins: PageMargins }) => {
        try {
            if (editingTemplate) {
                // Update existing
                await updateDoc(doc(db, 'unidocs_templates', editingTemplate.id), {
                    name: data.name,
                    description: data.description,
                    blocks: data.blocks,
                    pageMargins: data.pageMargins,
                    updatedAt: serverTimestamp(),
                });
                showToast('Actualizada', 'La plantilla se ha actualizado correctamente.', 'success');
            } else {
                // Create new
                await addDoc(collection(db, 'unidocs_templates'), {
                    tenantId: tenantId!,
                    name: data.name,
                    description: data.description,
                    blocks: data.blocks,
                    pageMargins: data.pageMargins,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                showToast('Creada', 'La plantilla se ha creado correctamente.', 'success');
            }

            setDesignerOpen(false);
            setEditingTemplate(null);
            fetchTemplates();
        } catch (e) {
            console.error(e);
            showToast(t('common.error'), 'No se pudo guardar la plantilla.', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) return;
        try {
            await deleteDoc(doc(db, 'unidocs_templates', id));
            setTemplates(prev => prev.filter(t => t.id !== id));
            showToast('Eliminada', 'La plantilla ha sido eliminada.', 'success');
        } catch (e) {
            console.error(e);
            showToast(t('common.error'), 'No se pudo eliminar la plantilla.', 'error');
        }
    };

    const handleEdit = (template: UniDocsTemplate) => {
        setEditingTemplate(template);
        setDesignerOpen(true);
    };

    const handleCreateNew = () => {
        setEditingTemplate(null);
        setDesignerOpen(true);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">UniDocs</h1>
                    <p className="text-muted-foreground">Diseña plantillas de documento y úsalas para imprimir desde cualquier módulo</p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
                >
                    <Plus className="w-4 h-4" /> Nueva Plantilla
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4 group hover:border-primary/50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="p-3 bg-secondary/50 rounded-lg">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <button onClick={() => handleDelete(template.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">{template.name}</h3>
                                <p className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded inline-block mb-2">
                                    {(template.blocks || []).length} bloques
                                </p>
                                {template.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                                )}
                            </div>
                            <div className="mt-auto pt-4 border-t border-border">
                                <button
                                    onClick={() => handleEdit(template)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-xs font-bold transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Editar Diseño
                                </button>
                            </div>
                        </div>
                    ))}

                    {templates.length === 0 && (
                        <div className="col-span-full py-16 text-center">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                            <p className="text-muted-foreground font-medium mb-2">No hay plantillas todavía</p>
                            <p className="text-sm text-muted-foreground mb-4">Crea tu primera plantilla para empezar a imprimir documentos formateados</p>
                            <button
                                onClick={handleCreateNew}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all"
                            >
                                Crear Primera Plantilla
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Template Designer */}
            {designerOpen && (
                <UniDocsTemplateDesigner
                    initialBlocks={editingTemplate?.blocks || []}
                    initialMargins={editingTemplate?.pageMargins}
                    templateName={editingTemplate?.name || ''}
                    templateDescription={editingTemplate?.description || ''}
                    onSave={handleSave}
                    onClose={() => { setDesignerOpen(false); setEditingTemplate(null); }}
                />
            )}
        </div>
    );
}
