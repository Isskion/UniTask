"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, FileText, Trash2, Printer, Upload, FileUp, Loader2 } from 'lucide-react';
import { analyzeDocumentStructure, AnalysisResult } from '@/app/actions/analyze-document';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { ReportTemplate, ReportType } from '@/types/reports';
import ReportTemplateEditor from './ReportTemplateEditor';
import VisualTemplateDesigner from './VisualTemplateDesigner';
import { format } from 'date-fns';

export default function ReportManagement() {
    const { user, tenantId } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newType, setNewType] = useState<ReportType>('daily_minute');

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
            const q = query(collection(db, 'report_templates'), where('tenantId', '==', tenantId));
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

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            const newTemplate: Omit<ReportTemplate, 'id'> = {
                tenantId: tenantId!,
                name: newName,
                type: newType,
                description: newDesc || `Plantilla de tipo ${newType}`,
                config: analysisResult?.structure
                    ? { structure: analysisResult.structure, visualZones: visualZones }
                    : { structure: { header: [], body: [], footer: [] }, visualZones: visualZones },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'report_templates'), newTemplate);
            showToast(t('common.success'), t('reports.created'), 'success');
            setIsCreating(false);
            setNewName("");
            fetchTemplates();
        } catch (e) {
            console.error(e);
            showToast(t('common.error'), t('reports.create_error'), 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('reports.delete_confirm'))) return;
        try {
            await deleteDoc(doc(db, 'report_templates', id));
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
                    <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
                    <p className="text-muted-foreground">{t('reports.subtitle')}</p>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-background border border-border p-6 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold mb-4">{t('reports.new_template')}</h2>

                        <div className="space-y-6">

                            {/* Import Zone */}
                            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={fileInputRef}
                                    accept=".pdf,.docx"
                                    onChange={handleFileChange}
                                />
                                {isAnalyzing ? (
                                    <div className="flex flex-col items-center gap-3 animate-pulse">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        <p className="text-sm font-medium text-primary">{t('reports.analyzing')}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-3 bg-secondary rounded-full mb-3">
                                            <Upload className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm font-bold text-foreground">{t('reports.import_from_doc')}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{t('reports.import_hint')}</p>
                                    </>
                                )}
                            </div>

                            <div className="space-y-4">
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

                                <div className="flex gap-2 justify-end mt-6">
                                    <button
                                        onClick={() => setIsCreating(false)}
                                        className="px-4 py-2 text-muted-foreground hover:text-foreground font-bold text-sm"
                                    >
                                        {t('reports.cancel')}
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!newName.trim()}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {t('reports.create')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isVisualEditorOpen && (
                <VisualTemplateDesigner
                    fileUrl={fileDataUrl}
                    initialZones={visualZones}
                    onSave={(zones) => {
                        setVisualZones(zones);
                        setIsVisualEditorOpen(false);
                        showToast(t('reports.design_saved'), t('reports.zones_updated'), "success");
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
