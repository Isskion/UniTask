"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, FileText, Trash2, Printer, Upload, FileUp, Loader2 } from 'lucide-react';
import { analyzeDocumentStructure, UniDocsAnalysisResult as AnalysisResult } from '@/app/actions/unidocs';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { UniDocsTemplate as ReportTemplate, UniDocsType as ReportType, UniDocsLayout } from '@/types/unidocs';
import ReportTemplateEditor from './UniDocsEditor';
import VisualTemplateDesigner from './UniDocsDesigner';
import { format } from 'date-fns';

export default function UniDocsManagement() {
    const { user, tenantId, userRole } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newType, setNewType] = useState<ReportType>('daily_minute');
    const [createTab, setCreateTab] = useState<'general' | 'structure'>('general');

    // Layout Config
    const defaultLayout: UniDocsLayout = { firstPageEnabled: false, lastPageEnabled: false };
    const [layout, setLayout] = useState<UniDocsLayout>(defaultLayout);
    const setLayoutField = <K extends keyof UniDocsLayout>(key: K, value: UniDocsLayout[K]) =>
        setLayout(prev => ({ ...prev, [key]: value }));

    // Import Logic
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileDataUrl, setFileDataUrl] = useState<string>("");
    const [visualZones, setVisualZones] = useState<any[]>([]);

    // Editor Logic
    const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
    const [isVisualEditorOpen, setIsVisualEditorOpen] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);

        // Read file for Visual Editor
        const reader = new FileReader();
        reader.onload = (ev) => {
            setFileDataUrl(ev.target?.result as string);
        };
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user?.uid || "system");
        formData.append('tenantId', tenantId || "1");
        formData.append('userRole', userRole || "user");

        try {
            const result = await analyzeDocumentStructure(formData);
            if (result.success) {
                setAnalysisResult(result);
                if (result.templateName) setNewName(result.templateName);
                if (result.description) setNewDesc(result.description);
                if (result.visualZones) setVisualZones(result.visualZones);
                setNewType('custom');
                showToast(t('reports.analysis_complete'), t('reports.structure_extracted'), "success");

                // Auto-open Visual Editor to confirm layout
                setIsVisualEditorOpen(true);
            } else {
                showToast(t('common.error'), result.error || t('reports.delete_error'), "error");
            }
        } catch (error) {
            console.error(error);
            showToast(t('common.error'), t('reports.load_error'), "error");
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        if (tenantId) fetchTemplates();
    }, [tenantId]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'unidocs_templates'), where('tenantId', '==', tenantId));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReportTemplate));
            setTemplates(data);
        } catch (e) {
            console.error(e);
            showToast(t('common.error'), t('reports.load_error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (zonesToSave?: any[]) => {
        if (!newName.trim()) {
            showToast('Atención', 'Escribe un nombre para la plantilla antes de guardar el diseño.', 'info');
            return;
        }
        const finalZones = zonesToSave ?? visualZones;
        try {
            const newTemplate: Omit<ReportTemplate, 'id'> = {
                tenantId: tenantId!,
                name: newName,
                type: newType,
                description: newDesc || `Plantilla de tipo ${newType}`,
                sourceFileUrl: fileDataUrl, // ← PERSIST THE BASE64 DOCUMENT DATA
                layout,
                config: analysisResult?.structure
                    ? { structure: analysisResult.structure, visualZones: finalZones }
                    : { structure: { header: [], body: [], footer: [] }, visualZones: finalZones },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'unidocs_templates'), newTemplate);
            showToast(t('common.success'), t('reports.created'), 'success');
            setIsCreating(false);
            setIsVisualEditorOpen(false);
            setNewName("");
            setNewDesc("");
            setLayout(defaultLayout);
            setCreateTab('general');
            setAnalysisResult(null);
            setVisualZones([]);
            setFileDataUrl("");
            fetchTemplates();
        } catch (e) {
            console.error(e);
            showToast(t('common.error'), t('reports.create_error'), 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('reports.delete_confirm'))) return;
        try {
            await deleteDoc(doc(db, 'unidocs_templates', id));
            setTemplates(prev => prev.filter(t => t.id !== id));
            showToast(t('common.success'), t('reports.deleted'), 'success');
        } catch (e) {
            console.error(e);
            showToast(t('common.error'), t('reports.delete_error'), 'error');
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">UniDocs</h1>
                    <p className="text-muted-foreground">Document Design & Template Management</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all"
                >
                    <Plus className="w-4 h-4" /> {t('reports.create_template')}
                </button>
            </div>

            {/* List */}
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
                            <p className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded inline-block uppercase tracking-wider mb-2">
                                {template.type.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                        </div>
                        <div className="mt-auto pt-4 border-t border-border flex gap-2">
                            <button
                                onClick={() => setEditingTemplate(template)}
                                className="flex-1 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-xs font-bold transition-colors"
                            >
                                {t('reports.edit_design')}
                            </button>
                            {/* In future this will define which template to use for the "Daily Print" button */}
                        </div>
                    </div>
                ))}

                {templates.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-secondary/10 rounded-xl border border-dashed border-border">
                        {t('reports.no_templates')}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background border border-border p-6 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">{t('reports.new_template')}</h2>
                            <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground p-1">✕</button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mb-5 bg-secondary/40 rounded-lg p-1">
                            {(['general', 'structure'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setCreateTab(tab)}
                                    className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-colors ${createTab === tab ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                                        }`}
                                >
                                    {tab === 'general' ? '📄 General' : '🗂️ Estructura'}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-y-auto flex-1 pr-1">

                            {createTab === 'general' && (
                                <div className="space-y-5">
                                    {/* Import Zone */}
                                    <div className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input type="file" className="hidden" ref={fileInputRef} accept=".pdf,.docx" onChange={handleFileChange} />
                                        {isAnalyzing ? (
                                            <div className="flex flex-col items-center gap-2 animate-pulse">
                                                <Loader2 className="w-7 h-7 text-primary animate-spin" />
                                                <p className="text-sm font-medium text-primary">{t('reports.analyzing')}</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="p-2.5 bg-secondary rounded-full mb-2">
                                                    <Upload className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-bold text-foreground">{t('reports.import_from_doc')}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{t('reports.import_hint')}</p>
                                            </>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-sm font-bold text-muted-foreground block mb-1">{t('reports.name')}</label>
                                        <input
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                                            placeholder={t('reports.name_placeholder')}
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-muted-foreground block mb-1">{t('reports.base_type')}</label>
                                        <select
                                            value={newType}
                                            onChange={e => setNewType(e.target.value as ReportType)}
                                            className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                                        >
                                            <option value="daily_minute">{t('reports.type_daily')}</option>
                                            <option value="project_status">{t('reports.type_project')}</option>
                                            <option value="custom">{t('reports.type_custom')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-muted-foreground block mb-1">Descripción (opcional)</label>
                                        <input
                                            value={newDesc}
                                            onChange={e => setNewDesc(e.target.value)}
                                            className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                                            placeholder="Para qué se usa esta plantilla..."
                                        />
                                    </div>
                                </div>
                            )}

                            {createTab === 'structure' && (
                                <div className="space-y-6">
                                    {/* Global Header */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-foreground flex items-center gap-2">📌 Cabecera del documento</label>
                                        <p className="text-xs text-muted-foreground">Aparece en la parte superior de todas las páginas (excepto si la primera página tiene su propia cabecera).</p>
                                        <textarea
                                            rows={3}
                                            value={layout.headerHtml ?? ''}
                                            onChange={e => setLayoutField('headerHtml', e.target.value)}
                                            className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 text-foreground text-sm focus:outline-none focus:border-primary font-mono"
                                            placeholder="Texto o HTML libre. Ej: <b>Primagas Energía S.A.U.</b> | Confidencial"
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
                                            placeholder="Ej: CONFIDENCIAL · Generado por UniTask · Página {n} de {total}"
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
                                                    <p className="text-xs text-muted-foreground mb-1">Lista de personas que aparecerán firmando o asistiendo en la primera página.</p>
                                                    <textarea
                                                        rows={4}
                                                        value={(layout.firstPageAssistants ?? []).join('\n')}
                                                        onChange={e => setLayoutField('firstPageAssistants', e.target.value.split('\n').filter(Boolean))}
                                                        className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                                                        placeholder="Juan García\nMaría López\nPedro Martínez"
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
                                                <p className="text-xs text-muted-foreground mb-1">Se añade al final del documento (firma, aprobación, etc.).</p>
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

                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t border-border mt-4">
                            <button
                                onClick={() => { setIsCreating(false); setCreateTab('general'); }}
                                className="px-4 py-2 text-muted-foreground hover:text-foreground font-bold text-sm"
                            >
                                {t('reports.cancel')}
                            </button>
                            <button
                                onClick={() => { void handleCreate(); }}
                                disabled={!newName.trim()}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 disabled:opacity-50"
                            >
                                {t('reports.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isVisualEditorOpen && (
                <VisualTemplateDesigner
                    fileUrl={fileDataUrl}
                    initialZones={visualZones}
                    onSave={async (zones) => {
                        setVisualZones(zones);
                        setIsVisualEditorOpen(false);
                        if (newName.trim()) {
                            // Name already filled → save directly
                            await handleCreate(zones);
                        } else {
                            // No name yet → keep create modal open for name input
                            setIsCreating(true);
                            showToast('Diseño guardado', 'Ahora escribe un nombre y haz clic en Crear para guardar la plantilla.', 'info');
                        }
                    }}
                    onClose={() => setIsVisualEditorOpen(false)}
                />
            )}

            {editingTemplate && (
                <ReportTemplateEditor
                    template={editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    onUpdate={fetchTemplates}
                />
            )}
        </div>
    );
}
