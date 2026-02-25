"use client";

import React, { useState } from 'react';
import { UniDocsTemplate, UniDocsLayout, TextOverlay } from '@/types/unidocs';
import { WidgetSuggestion } from '@/app/actions/unidocs';
import { Save, X, MoveUp, MoveDown, Trash2, Plus, LayoutTemplate, AlignJustify, ArrowDownFromLine, Settings2, Maximize2, Bold, Italic, Underline, Type } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { cn } from "@/lib/utils";
import VisualTemplateDesigner from './UniDocsDesigner';

interface UniDocsEditorProps {
    template: UniDocsTemplate;
    onClose: () => void;
    onUpdate: () => void;
}

type SectionKey = 'header' | 'body' | 'footer';

export default function UniDocsEditor({ template, onClose, onUpdate }: UniDocsEditorProps) {
    const { showToast } = useToast();

    // Initial State: Support both old (flat) and new (structured) formats gracefully
    const initialStructure = template.config?.structure || {
        header: [],
        body: template.config?.widgets || [], // Fallback for old templates
        footer: []
    };

    const defaultLayout: UniDocsLayout = { firstPageEnabled: false, lastPageEnabled: false };

    const [structure, setStructure] = useState<{ header: WidgetSuggestion[], body: WidgetSuggestion[], footer: WidgetSuggestion[] }>(initialStructure);
    const [visualZones, setVisualZones] = useState<any[]>(template.config?.visualZones || []);
    const [layout, setLayout] = useState<UniDocsLayout>(template.layout || defaultLayout);
    const [activeTab, setActiveTab] = useState<SectionKey | 'layout'>('layout');
    const [saving, setSaving] = useState(false);
    const [isVisualDesignerOpen, setIsVisualDesignerOpen] = useState(false);

    const setLayoutField = <K extends keyof UniDocsLayout>(key: K, value: UniDocsLayout[K]) =>
        setLayout(prev => ({ ...prev, [key]: value }));

    const handleSave = async (updatedZones?: any[], margins?: { headerMm: number; footerMm: number }) => {
        setSaving(true);
        try {
            const zonesToSave = updatedZones ?? visualZones;
            const layoutToSave = margins
                ? { ...layout, headerMarginMm: margins.headerMm, footerMarginMm: margins.footerMm }
                : layout;
            await updateDoc(doc(db, 'unidocs_templates', template.id), {
                config: { ...template.config, structure, visualZones: zonesToSave },
                layout: layoutToSave,
                updatedAt: serverTimestamp()
            });
            if (margins) {
                setLayout(prev => ({ ...prev, headerMarginMm: margins.headerMm, footerMarginMm: margins.footerMm }));
            }
            showToast("Guardado", "Plantilla actualizada correctamente", "success");
            onUpdate();
            if (!updatedZones) onClose();
        } catch (e) {
            console.error(e);
            showToast("Error", "No se pudo guardar la plantilla", "error");
        } finally {
            setSaving(false);
        }
    };

    const currentWidgets = activeTab !== 'layout' ? structure[activeTab] : [];

    const updateCurrentWidgets = (newWidgets: WidgetSuggestion[]) => {
        if (activeTab !== 'layout') {
            setStructure(prev => ({ ...prev, [activeTab]: newWidgets }));
        }
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
                    <div className="flex items-center gap-3">
                        {template.sourceFileUrl && (
                            <button
                                onClick={() => setIsVisualDesignerOpen(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-all border border-primary/20"
                                title="Editar zonas directamente sobre el documento"
                            >
                                <Maximize2 className="w-4 h-4" />
                                Diseñador Visual
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border bg-muted/10 px-6 pt-2 gap-1">
                    <button
                        onClick={() => setActiveTab('layout')}
                        className={cn("px-4 py-2 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2",
                            activeTab === 'layout' ? "bg-background border-t border-x border-border text-primary" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        Estructura
                    </button>
                    <button
                        onClick={() => setActiveTab('header')}
                        className={cn("px-4 py-2 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2",
                            activeTab === 'header' ? "bg-background border-t border-x border-border text-primary" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Header
                    </button>
                    <button
                        onClick={() => setActiveTab('body')}
                        className={cn("px-4 py-2 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2",
                            activeTab === 'body' ? "bg-background border-t border-x border-border text-primary" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Cuerpo del Reporte
                    </button>
                    <button
                        onClick={() => setActiveTab('footer')}
                        className={cn("px-4 py-2 text-sm font-bold rounded-t-lg transition-all flex items-center gap-2",
                            activeTab === 'footer' ? "bg-background border-t border-x border-border text-primary" : "text-muted-foreground hover:bg-muted/50")}
                    >
                        Footer
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-muted/5">

                    {/* ===== LAYOUT TAB ===== */}
                    {activeTab === 'layout' && (
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-primary">
                                <strong>📄 Estructura del documento</strong> — Configura la cabecera, pie y páginas especiales que aparecerán al imprimir desde UniLeaks.
                            </div>

                            {/* Global Header */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground flex items-center gap-2">📌 Cabecera del documento</label>
                                <p className="text-xs text-muted-foreground">Aparece en la parte superior de todas las páginas.</p>
                                <textarea
                                    rows={3}
                                    value={layout.headerHtml ?? ''}
                                    onChange={e => setLayoutField('headerHtml', e.target.value)}
                                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 text-foreground text-sm focus:outline-none focus:border-primary font-mono"
                                    placeholder="Ej: <b>Primagas Energía S.A.U.</b> | Confidencial"
                                />
                            </div>

                            {/* Global Footer */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground flex items-center gap-2">📎 Pie de documento</label>
                                <p className="text-xs text-muted-foreground">Aparece al final de todas las páginas.</p>
                                <textarea
                                    rows={3}
                                    value={layout.footerHtml ?? ''}
                                    onChange={e => setLayoutField('footerHtml', e.target.value)}
                                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 text-foreground text-sm focus:outline-none focus:border-primary font-mono"
                                    placeholder="Ej: CONFIDENCIAL · Generado por UniTask"
                                />
                            </div>

                            {/* Page Numbers */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!layout.showPageNumbers}
                                    onChange={e => setLayoutField('showPageNumbers', e.target.checked)}
                                    className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm font-medium">Mostrar numeración de páginas</span>
                            </label>

                            <hr className="border-border" />

                            {/* Margins */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground flex items-center gap-2">📏 Márgenes de cabecera y pie</label>
                                <p className="text-xs text-muted-foreground">Define el espacio reservado (en mm) para que los logos y el pie no se superpongan al texto en páginas sucesivas.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">Margen superior (mm)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={80}
                                            value={layout.headerMarginMm ?? 25}
                                            onChange={e => setLayoutField('headerMarginMm', Number(e.target.value))}
                                            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">Margen inferior (mm)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={80}
                                            value={layout.footerMarginMm ?? 20}
                                            onChange={e => setLayoutField('footerMarginMm', Number(e.target.value))}
                                            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-border" />

                            {/* Text Overlays */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Type className="w-4 h-4 text-primary" /> Textos superpuestos
                                </label>
                                <p className="text-xs text-muted-foreground">Añade textos fijos como nombre del documento, información fiscal, avisos legales, etc. Aparecen sobre el PDF.</p>

                                {(layout.textOverlays || []).map((overlay, idx) => (
                                    <div key={overlay.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-muted-foreground">Texto #{idx + 1}</span>
                                            <button
                                                onClick={() => {
                                                    const newOverlays = (layout.textOverlays || []).filter((_, i) => i !== idx);
                                                    setLayoutField('textOverlays', newOverlays);
                                                }}
                                                className="text-destructive hover:bg-destructive/10 p-1 rounded"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Text content */}
                                        <input
                                            value={overlay.text}
                                            onChange={e => {
                                                const newOverlays = [...(layout.textOverlays || [])];
                                                newOverlays[idx] = { ...newOverlays[idx], text: e.target.value };
                                                setLayoutField('textOverlays', newOverlays);
                                            }}
                                            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                            placeholder="Ej: NIF: B12345678 · Información confidencial"
                                        />

                                        {/* Formatting row */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Font */}
                                            <select
                                                value={overlay.fontFamily}
                                                onChange={e => {
                                                    const newOverlays = [...(layout.textOverlays || [])];
                                                    newOverlays[idx] = { ...newOverlays[idx], fontFamily: e.target.value };
                                                    setLayoutField('textOverlays', newOverlays);
                                                }}
                                                className="bg-secondary/50 border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                                            >
                                                <option value="Inter">Inter</option>
                                                <option value="Arial">Arial</option>
                                                <option value="Times New Roman">Times New Roman</option>
                                                <option value="Courier New">Courier New</option>
                                                <option value="Georgia">Georgia</option>
                                            </select>

                                            {/* Size */}
                                            <input
                                                type="number"
                                                min={6}
                                                max={36}
                                                value={overlay.fontSize}
                                                onChange={e => {
                                                    const newOverlays = [...(layout.textOverlays || [])];
                                                    newOverlays[idx] = { ...newOverlays[idx], fontSize: Number(e.target.value) };
                                                    setLayoutField('textOverlays', newOverlays);
                                                }}
                                                className="w-14 bg-secondary/50 border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                                                title="Tamaño (pt)"
                                            />

                                            {/* Bold */}
                                            <button
                                                onClick={() => {
                                                    const newOverlays = [...(layout.textOverlays || [])];
                                                    newOverlays[idx] = { ...newOverlays[idx], fontWeight: overlay.fontWeight === 'bold' ? 'normal' : 'bold' };
                                                    setLayoutField('textOverlays', newOverlays);
                                                }}
                                                className={`p-1.5 rounded border transition-all ${overlay.fontWeight === 'bold' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/30'}`}
                                                title="Negrita"
                                            >
                                                <Bold className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Italic */}
                                            <button
                                                onClick={() => {
                                                    const newOverlays = [...(layout.textOverlays || [])];
                                                    newOverlays[idx] = { ...newOverlays[idx], fontStyle: overlay.fontStyle === 'italic' ? 'normal' : 'italic' };
                                                    setLayoutField('textOverlays', newOverlays);
                                                }}
                                                className={`p-1.5 rounded border transition-all ${overlay.fontStyle === 'italic' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/30'}`}
                                                title="Cursiva"
                                            >
                                                <Italic className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Underline */}
                                            <button
                                                onClick={() => {
                                                    const newOverlays = [...(layout.textOverlays || [])];
                                                    newOverlays[idx] = { ...newOverlays[idx], textDecoration: overlay.textDecoration === 'underline' ? 'none' : 'underline' };
                                                    setLayoutField('textOverlays', newOverlays);
                                                }}
                                                className={`p-1.5 rounded border transition-all ${overlay.textDecoration === 'underline' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/30'}`}
                                                title="Subrayado"
                                            >
                                                <Underline className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Color */}
                                            <input
                                                type="color"
                                                value={overlay.color}
                                                onChange={e => {
                                                    const newOverlays = [...(layout.textOverlays || [])];
                                                    newOverlays[idx] = { ...newOverlays[idx], color: e.target.value };
                                                    setLayoutField('textOverlays', newOverlays);
                                                }}
                                                className="w-7 h-7 rounded border border-border cursor-pointer"
                                                title="Color"
                                            />
                                        </div>

                                        {/* Position & Page Scope */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">Posición X (%)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={overlay.position.x}
                                                    onChange={e => {
                                                        const newOverlays = [...(layout.textOverlays || [])];
                                                        newOverlays[idx] = { ...newOverlays[idx], position: { ...overlay.position, x: Number(e.target.value) } };
                                                        setLayoutField('textOverlays', newOverlays);
                                                    }}
                                                    className="w-full bg-secondary/50 border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">Posición Y (%)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={overlay.position.y}
                                                    onChange={e => {
                                                        const newOverlays = [...(layout.textOverlays || [])];
                                                        newOverlays[idx] = { ...newOverlays[idx], position: { ...overlay.position, y: Number(e.target.value) } };
                                                        setLayoutField('textOverlays', newOverlays);
                                                    }}
                                                    className="w-full bg-secondary/50 border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">Páginas</label>
                                                <select
                                                    value={overlay.pageScope}
                                                    onChange={e => {
                                                        const newOverlays = [...(layout.textOverlays || [])];
                                                        newOverlays[idx] = { ...newOverlays[idx], pageScope: e.target.value as 'all' | 'first' | 'last' };
                                                        setLayoutField('textOverlays', newOverlays);
                                                    }}
                                                    className="w-full bg-secondary/50 border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                                                >
                                                    <option value="all">Todas</option>
                                                    <option value="first">Solo primera</option>
                                                    <option value="last">Solo última</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        const newOverlay: TextOverlay = {
                                            id: crypto.randomUUID(),
                                            text: '',
                                            fontFamily: 'Inter',
                                            fontSize: 9,
                                            fontWeight: 'normal',
                                            fontStyle: 'normal',
                                            textDecoration: 'none',
                                            color: '#333333',
                                            position: { x: 5, y: 95 },
                                            pageScope: 'all',
                                        };
                                        setLayoutField('textOverlays', [...(layout.textOverlays || []), newOverlay]);
                                    }}
                                    className="w-full py-3 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all font-bold text-sm"
                                >
                                    <Plus className="w-4 h-4" /> Añadir texto
                                </button>
                            </div>

                            <hr className="border-border" />

                            {/* First Page */}
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer mb-3">
                                    <input
                                        type="checkbox"
                                        checked={layout.firstPageEnabled}
                                        onChange={e => setLayoutField('firstPageEnabled', e.target.checked)}
                                        className="w-4 h-4 accent-primary"
                                    />
                                    <span className="text-sm font-bold">📃 Primera página especial</span>
                                </label>
                                {layout.firstPageEnabled && (
                                    <div className="ml-7 space-y-4 border-l-2 border-primary/20 pl-4">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground block mb-1">Cabecera de la primera página</label>
                                            <textarea
                                                rows={2}
                                                value={layout.firstPageHeaderHtml ?? ''}
                                                onChange={e => setLayoutField('firstPageHeaderHtml', e.target.value)}
                                                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                                                placeholder="Ej: Acta de Reunión — Proyecto Alpha"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground block mb-1">Asistentes (uno por línea)</label>
                                            <textarea
                                                rows={4}
                                                value={(layout.firstPageAssistants ?? []).join('\n')}
                                                onChange={e => setLayoutField('firstPageAssistants', e.target.value.split('\n').filter(Boolean))}
                                                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                                                placeholder={"Juan García\nMaría López\nPedro Martínez"}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground block mb-1">Bloque extra (HTML libre)</label>
                                            <textarea
                                                rows={2}
                                                value={layout.firstPageExtraHtml ?? ''}
                                                onChange={e => setLayoutField('firstPageExtraHtml', e.target.value)}
                                                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                                                placeholder="Ej: logo grande, recuadro de introducción..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Last Page */}
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer mb-3">
                                    <input
                                        type="checkbox"
                                        checked={layout.lastPageEnabled}
                                        onChange={e => setLayoutField('lastPageEnabled', e.target.checked)}
                                        className="w-4 h-4 accent-primary"
                                    />
                                    <span className="text-sm font-bold">📋 Última página especial</span>
                                </label>
                                {layout.lastPageEnabled && (
                                    <div className="ml-7 border-l-2 border-primary/20 pl-4">
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">Bloque de cierre / firmas</label>
                                        <textarea
                                            rows={3}
                                            value={layout.lastPageFooterHtml ?? ''}
                                            onChange={e => setLayoutField('lastPageFooterHtml', e.target.value)}
                                            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                                            placeholder="Ej: Firma del cliente: ___________   Firma del responsable: ___________"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== WIDGET TABS (header / body / footer) ===== */}
                    {activeTab !== 'layout' && (
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
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-background flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{structure.header.length + structure.body.length + structure.footer.length}</span> elementos totales
                        {layout.headerHtml && <span className="ml-2 text-primary">· Cabecera ✓</span>}
                        {layout.footerHtml && <span className="ml-1 text-primary">· Pie ✓</span>}
                        {layout.firstPageEnabled && <span className="ml-1 text-primary">· 1ª pág ✓</span>}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground">Cancelar</button>
                        <button
                            onClick={() => handleSave()}
                            disabled={saving}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2"
                        >
                            {saving ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                            Guardar Plantilla
                        </button>
                    </div>
                </div>
            </div>

            {/* Visual Designer Modal */}
            {isVisualDesignerOpen && (
                <VisualTemplateDesigner
                    fileUrl={template.sourceFileUrl}
                    initialZones={visualZones}
                    onSave={async (newZones, margins) => {
                        setVisualZones(newZones);
                        setIsVisualDesignerOpen(false);
                        await handleSave(newZones, margins);
                    }}
                    onClose={() => setIsVisualDesignerOpen(false)}
                />
            )}
        </div>
    );
}
