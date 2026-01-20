"use client";

import React, { useState } from 'react';
import { ReportTemplate } from '@/types/reports';
import { WidgetSuggestion } from '@/app/actions/analyze-document';
import { Save, X, MoveUp, MoveDown, Trash2, Plus, LayoutTemplate, AlignJustify, ArrowDownFromLine } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { cn } from "@/lib/utils";

interface ReportTemplateEditorProps {
    template: ReportTemplate;
    onClose: () => void;
    onUpdate: () => void;
}

type SectionKey = 'header' | 'body' | 'footer';

export default function ReportTemplateEditor({ template, onClose, onUpdate }: ReportTemplateEditorProps) {
    const { showToast } = useToast();

    // Initial State: Support both old (flat) and new (structured) formats gracefully
    const initialStructure = template.config?.structure || {
        header: [],
        body: template.config?.widgets || [], // Fallback for old templates
        footer: []
    };

    const [structure, setStructure] = useState<{ header: WidgetSuggestion[], body: WidgetSuggestion[], footer: WidgetSuggestion[] }>(initialStructure);
    const [activeTab, setActiveTab] = useState<SectionKey>('body');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'report_templates', template.id), {
                config: { ...template.config, structure },
                updatedAt: serverTimestamp()
            });
            showToast("Guardado", "Plantilla actualizada correctamente", "success");
            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            showToast("Error", "No se pudo guardar la plantilla", "error");
        } finally {
            setSaving(false);
        }
    };

    const currentWidgets = structure[activeTab];

    const updateCurrentWidgets = (newWidgets: WidgetSuggestion[]) => {
        setStructure(prev => ({ ...prev, [activeTab]: newWidgets }));
    };

    const moveWidget = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === currentWidgets.length - 1) return;

        const newWidgets = [...currentWidgets];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newWidgets[index], newWidgets[swapIndex]] = [newWidgets[swapIndex], newWidgets[index]];
        updateCurrentWidgets(newWidgets);
    };

    const deleteWidget = (index: number) => {
        updateCurrentWidgets(currentWidgets.filter((_, i) => i !== index));
    };

    const addWidget = () => {
        updateCurrentWidgets([...currentWidgets, { type: 'paragraph', label: 'Nueva Sección', description: 'Descripción...' }]);
    };

    const updateWidget = (index: number, field: keyof WidgetSuggestion, value: string) => {
        const newWidgets = [...currentWidgets];
        newWidgets[index] = { ...newWidgets[index], [field]: value };
        updateCurrentWidgets(newWidgets);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background border border-border rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <LayoutTemplate className="w-5 h-5 text-primary" />
                            Diseñador: {template.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border bg-muted/10 px-6 pt-2 gap-1">
                    <button
                        onClick={() => setActiveTab('header')}
                        className={cn("px-4 py-2 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2", activeTab === 'header' ? "bg-background border-t border-x border-border text-primary" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Header
                    </button>
                    <button
                        onClick={() => setActiveTab('body')}
                        className={cn("px-4 py-2 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2", activeTab === 'body' ? "bg-background border-t border-x border-border text-primary" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Cuerpo del Reporte
                    </button>
                    <button
                        onClick={() => setActiveTab('footer')}
                        className={cn("px-4 py-2 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2", activeTab === 'footer' ? "bg-background border-t border-x border-border text-primary" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Footer
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                    <div className="space-y-4 max-w-4xl mx-auto">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">
                                Editando {activeTab === 'header' ? 'Cabecera' : activeTab === 'body' ? 'Contenido Principal' : 'Pie de Página'}
                            </h3>
                            <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                                {currentWidgets.length} Elementos
                            </span>
                        </div>

                        {currentWidgets.map((widget, idx) => (
                            <div key={idx} className="bg-card border border-border p-4 rounded-lg flex items-start gap-4 shadow-sm group hover:border-primary/30 transition-all">
                                {/* Drag Handles */}
                                <div className="flex flex-col gap-1 pt-1 text-muted-foreground">
                                    <button onClick={() => moveWidget(idx, 'up')} disabled={idx === 0} className="hover:text-foreground disabled:opacity-20"><MoveUp className="w-4 h-4" /></button>
                                    <button onClick={() => moveWidget(idx, 'down')} disabled={idx === currentWidgets.length - 1} className="hover:text-foreground disabled:opacity-20"><MoveDown className="w-4 h-4" /></button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Tipo Widget</label>
                                        <select
                                            value={widget.type}
                                            onChange={(e) => updateWidget(idx, 'type', e.target.value as any)}
                                            className="w-full bg-secondary/50 border border-border rounded px-2 py-1.5 text-sm font-medium focus:border-primary focus:outline-none"
                                        >
                                            <option value="header">Título / Cabecera</option>
                                            <option value="paragraph">Párrafo / Texto</option>
                                            <option value="task_list">Lista de Tareas</option>
                                            <option value="chart">Gráfico / Visualización</option>
                                            <option value="kpis">KPIs / Métricas</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Etiqueta / Título</label>
                                        <input
                                            value={widget.label}
                                            onChange={(e) => updateWidget(idx, 'label', e.target.value)}
                                            className="w-full bg-secondary/50 border border-border rounded px-2 py-1.5 text-sm font-bold focus:border-primary focus:outline-none"
                                            placeholder="Ej: Resumen Ejecutivo"
                                        />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Contenido / Descripción</label>
                                        <textarea
                                            value={widget.description}
                                            onChange={(e) => updateWidget(idx, 'description', e.target.value)}
                                            className="w-full bg-secondary/50 border border-border rounded px-2 py-1.5 text-sm font-sans resize-none h-20 focus:border-primary focus:outline-none"
                                            placeholder="Describe qué datos deben ir aquí..."
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-1">
                                    <button onClick={() => deleteWidget(idx)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Eliminar">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {currentWidgets.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/5">
                                <p>Esta sección está vacía.</p>
                                <p className="text-xs mt-1">Añade elementos estáticos o dinámicos.</p>
                            </div>
                        )}

                        <button onClick={addWidget} className="w-full py-4 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all font-bold group">
                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Añadir Elemento a {activeTab}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-background flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{structure.header.length + structure.body.length + structure.footer.length}</span> elementos totales
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground">Cancelar</button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2"
                        >
                            {saving ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                            Guardar Plantilla
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
