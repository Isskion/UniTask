"use client";

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from "@/lib/utils";
import {
    Search, Plus, Trash2, Copy, Check, Clock, User, Tag,
    FolderGit2, Lightbulb, BookMarked, ChevronRight, X, Link as LinkIcon, Share2
} from 'lucide-react';
import { getShareUrl, copyToClipboard } from '@/lib/share';
import { AttachmentManager } from './AttachmentManager';
import RichTextEditor from './RichTextEditor';
import {
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
    doc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getActiveProjects } from '@/lib/projects'; // Import helper
import { KnowledgeEntry, ChangeLogEntry, Project, getRoleLevel } from '@/types'; // Import getRoleLevel
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { safeParseDate } from "@/lib/date-utils";

export interface KnowledgeBaseProps {
    type: 'lesson_learned' | 'solution_record' | 'product_proposal' | 'manual';
    initialId?: string | null;
}

export function KnowledgeBase({ type, initialId }: KnowledgeBaseProps) {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { t } = useLanguage();
    const { showToast } = useToast();
    const { user, tenantId, userRole } = useAuth();

    // State
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [alert, setAlert] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        projectId: '',
        tags: [] as string[],
        attachments: [] as string[]
    });
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);

    // Load data
    useEffect(() => {
        if (!tenantId) return;
        loadEntries();
        loadProjects();
    }, [tenantId, type]);

    // Handle initialId for deep linking
    useEffect(() => {
        if (initialId && entries.length > 0) {
            const entry = entries.find(e => e.id === initialId);
            if (entry) {
                setSelectedEntry(entry);
                setFormData({
                    title: entry.title,
                    content: entry.content,
                    projectId: entry.projectId || "",
                    tags: entry.tags || [],
                    attachments: entry.attachments || []
                });
            }
        }
    }, [initialId, entries]);

    const loadEntries = async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, 'knowledge_entries'),
                where('tenantId', '==', tenantId),
                where('type', '==', type),
                where('isActive', '==', true),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeEntry));
            setEntries(items);

            // Extract all unique tags
            const tags = new Set<string>();
            items.forEach(e => e.tags?.forEach(tag => tags.add(tag)));
            setAllTags(Array.from(tags).sort());
        } catch (error: any) {
            console.error('Error loading entries:', error);
            showToast("UniTask", t('common.error'), "error");
        } finally {
            setLoading(false);
        }
    };

    const loadProjects = async () => {
        if (!tenantId) return;
        try {
            // [MODIFIED] Filter by user assignment if not admin
            const roleLvl = getRoleLevel(userRole);
            const projectsList = await getActiveProjects(tenantId, user?.uid, roleLvl);
            setProjects(projectsList);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };


    // Filtered entries
    const filteredEntries = useMemo(() => {
        if (!searchQuery.trim()) return entries;
        const q = searchQuery.toLowerCase();
        return entries.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.content.toLowerCase().includes(q) ||
            e.tags?.some(tag => tag.toLowerCase().includes(q))
        );
    }, [entries, searchQuery]);

    // Tag suggestions
    const tagSuggestions = useMemo(() => {
        if (!tagInput.trim()) return allTags.slice(0, 5);
        const q = tagInput.toLowerCase();
        return allTags.filter(t => t.toLowerCase().includes(q)).slice(0, 5);
    }, [allTags, tagInput]);

    // Select entry
    const handleSelect = (entry: KnowledgeEntry) => {
        setSelectedEntry(entry);
        setIsNew(false);
        setFormData({
            title: entry.title,
            content: entry.content,
            projectId: entry.projectId || '',
            tags: entry.tags || [],
            attachments: entry.attachments || []
        });
    };

    // New entry
    const handleNew = () => {
        setSelectedEntry(null);
        setIsNew(true);
        setFormData({
            title: '',
            content: '',
            projectId: '',
            tags: [],
            attachments: []
        });
    };

    // Add tag
    const handleAddTag = (tag: string) => {
        const trimmed = tag.trim();
        if (trimmed && !formData.tags.includes(trimmed)) {
            setFormData({ ...formData, tags: [...formData.tags, trimmed] });
            // Also add to allTags if new
            if (!allTags.includes(trimmed)) {
                setAllTags([...allTags, trimmed].sort());
            }
        }
        setTagInput('');
        setShowTagSuggestions(false);
    };

    // Remove tag
    const handleRemoveTag = (tag: string) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    };

    // Help fix for security: Strip HTML for clipboard and preview (v13.3.0 Robust)
    const stripHtml = (htmlContent: string) => {
        if (!htmlContent) return "";

        let text = htmlContent;

        // 1. Replace <img> tags (both raw and escaped) with [Imagen]
        text = text.replace(/<img[^>]*>/gi, '[Imagen]');
        text = text.replace(/&lt;img[^&gt;]*&gt;/gi, '[Imagen]');

        // 2. Convert common block elements to newlines
        text = text.replace(/<\/p>|<\/div>|<br\s*\/?>|<li>/gi, '\n');
        text = text.replace(/&lt;\/p&gt;|&lt;\/div&gt;|&lt;br\s*\/&gt;|&lt;li&gt;/gi, '\n');

        // 3. Remove all other tags (both raw and escaped)
        text = text.replace(/<[^>]*>/g, '');
        text = text.replace(/&lt;[^&gt;]*&gt;/g, '');

        // 4. Manual entity cleanup
        text = text.replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");

        // 5. Final trim and whitespace cleanup
        const result = text.trim().replace(/\n{3,}/g, '\n\n');

        // Add a small marker to verify the fix is active
        return "[SECURE-V3] " + result;
    };

    // Save entry
    const handleSave = async () => {
        if (!formData.title.trim()) {
            showToast("UniTask", t('task_manager.title_required') || "Título requerido", "error");
            return;
        }

        setSaving(true);
        try {
            const changeLogEntry: ChangeLogEntry = {
                userId: user?.uid || '',
                userName: user?.displayName || 'Unknown',
                timestamp: new Date().toISOString(),
                action: isNew ? 'created' : 'updated',
                changes: isNew ? 'Entrada creada' : 'Entrada actualizada'
            };

            if (isNew) {
                // Create new entry
                const newEntry: Omit<KnowledgeEntry, 'id'> = {
                    type,
                    title: formData.title,
                    content: formData.content,
                    projectId: formData.projectId || null,
                    tags: formData.tags,
                    attachments: formData.attachments,
                    createdBy: user?.uid || '',
                    createdByName: user?.displayName || 'Unknown',
                    createdAt: serverTimestamp(),
                    changelog: [changeLogEntry],
                    tenantId: tenantId!,
                    isActive: true
                };

                const docRef = await addDoc(collection(db, 'knowledge_entries'), newEntry);
                showToast("UniTask", t('common.success') || "Guardado", "success");

                // Refresh and select new entry
                await loadEntries();
                const created = { ...newEntry, id: docRef.id } as KnowledgeEntry;
                setSelectedEntry(created);
                setIsNew(false);
            } else if (selectedEntry) {
                // Update existing
                const docRef = doc(db, 'knowledge_entries', selectedEntry.id);
                const existingChangelog = selectedEntry.changelog || [];

                await updateDoc(docRef, {
                    title: formData.title,
                    content: formData.content,
                    projectId: formData.projectId || null,
                    tags: formData.tags,
                    attachments: formData.attachments,
                    updatedBy: user?.uid,
                    updatedByName: user?.displayName,
                    updatedAt: serverTimestamp(),
                    changelog: [...existingChangelog, changeLogEntry]
                });

                showToast("UniTask", t('common.success') || "Guardado", "success");
                await loadEntries();
            }
        } catch (error: any) {
            console.error('Error saving:', error);
            showToast("UniTask", error.message || t('common.error'), "error");
        } finally {
            setSaving(false);
        }
    };

    // Delete entry
    const handleDelete = async () => {
        if (!selectedEntry) return;
        if (!window.confirm(t('knowledge_base.delete_confirm') || "¿Eliminar esta entrada?")) return;

        try {
            const docRef = doc(db, 'knowledge_entries', selectedEntry.id);
            await updateDoc(docRef, { isActive: false });
            showToast("UniTask", t('common.success') || "Eliminado", "success");
            setSelectedEntry(null);
            setIsNew(false);
            await loadEntries();
        } catch (error: any) {
            console.error('Error deleting:', error);
            showToast("UniTask", error.message || t('common.error'), "error");
        }
    };

    // Copy content
    const handleCopy = async () => {
        const plainContent = stripHtml(formData.content);
        const text = `# ${formData.title}\n\n${plainContent}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        showToast("UniTask", t('common.copied') || "Copiado", "success");
        setTimeout(() => setCopied(false), 2000);
    };

    const title = type === 'lesson_learned'
        ? (t('knowledge_base.lessons_learned') || 'Lecciones Aprendidas')
        : (t('knowledge_base.solution_records') || 'Registros de Soluciones');

    const Icon = type === 'lesson_learned' ? Lightbulb : BookMarked;

    return (
        <div className="flex h-full overflow-hidden">
            {/* LEFT: List Panel */}
            <div className={cn(
                "w-80 flex-shrink-0 flex flex-col border-r",
                isLight ? "bg-white border-zinc-200" : "bg-card border-white/5"
            )}>
                {/* Header */}
                <div className={cn(
                    "p-4 border-b flex items-center justify-between",
                    isLight ? "border-zinc-200" : "border-white/5"
                )}>
                    <div className="flex items-center gap-2">
                        <Icon className={cn("w-5 h-5", isLight ? "text-primary" : "text-primary")} />
                        <h2 className={cn("font-bold", isLight ? "text-zinc-900" : "text-white")}>{title}</h2>
                        <span className="text-xs text-muted-foreground">({filteredEntries.length})</span>
                    </div>
                    <button
                        onClick={handleNew}
                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title={t('knowledge_base.new_entry') || 'Nueva Entrada'}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border",
                        isLight ? "bg-zinc-50 border-zinc-200" : "bg-black/20 border-white/10"
                    )}>
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={t('knowledge_base.search_placeholder') || "Buscar..."}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    {/* Bulk Copy Button */}
                    {filteredEntries.length > 0 && (
                        <button
                            onClick={() => {
                                const header = `KNOWLEDGE BASE EXPORT (V13.3.0 SECURED): "${title}"\nFILTER: "${searchQuery}"\nDATE: ${new Date().toLocaleDateString()}\n----------------------------------------\n\n`;
                                const content = filteredEntries.map(e => {
                                    const creationDate = safeParseDate(e.createdAt);
                                    const date = creationDate ? format(creationDate, 'dd/MM/yyyy') : 'Unknown Date';
                                    const tags = e.tags && e.tags.length > 0 ? `\nTags: ${e.tags.join(', ')}` : '';
                                    const plainContent = stripHtml(e.content);
                                    return `[${date}] ${e.title}\nBy: ${e.createdByName || 'Unknown'}\n\n${plainContent}${tags}`;
                                }).join('\n\n----------------------------------------\n\n');

                                navigator.clipboard.writeText(header + content);
                                showToast("UniTask", `Copiadas ${filteredEntries.length} entradas al portapapeles`, "success");
                            }}
                            className={cn(
                                "w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                                isLight
                                    ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"
                                    : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                            )}
                            title="Copiar todas las entradas filtradas"
                        >
                            <Copy className="w-3 h-3" />
                            {t('common.copy')} ({filteredEntries.length})
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <p className="text-center text-muted-foreground p-4">{t('common.loading')}</p>
                    ) : filteredEntries.length === 0 ? (
                        <p className="text-center text-muted-foreground p-4">
                            {t('knowledge_base.no_entries') || "No hay entradas registradas"}
                        </p>
                    ) : (
                        filteredEntries.map(entry => (
                            <button
                                key={entry.id}
                                onClick={() => handleSelect(entry)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border transition-all",
                                    selectedEntry?.id === entry.id
                                        ? "bg-primary/10 border-primary/30"
                                        : isLight
                                            ? "bg-white border-zinc-100 hover:border-zinc-300"
                                            : "bg-black/10 border-white/10 hover:border-white/10"
                                )}
                            >
                                <p className={cn(
                                    "font-medium text-sm truncate",
                                    isLight ? "text-zinc-900" : "text-white"
                                )}>{entry.title}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {stripHtml(entry.content).slice(0, 80)}...
                                </p>
                                {entry.tags?.length > 0 && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                        {entry.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                                {tag}
                                            </span>
                                        ))}
                                        {entry.tags.length > 3 && (
                                            <span className="text-[10px] text-muted-foreground">+{entry.tags.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT: Detail Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {!selectedEntry && !isNew ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <Icon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>{t('task_manager.select_task') || "Selecciona una entrada"}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className={cn(
                            "p-4 border-b flex items-center justify-between",
                            isLight ? "border-zinc-200" : "border-white/5"
                        )}>
                            <span className={cn(
                                "text-sm font-bold",
                                isLight ? "text-zinc-900" : "text-white"
                            )}>
                                {isNew ? (t('knowledge_base.new_entry') || 'Nueva Entrada') : formData.title}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    title={t('knowledge_base.copy_content') || "Copiar Contenido"}
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                                {!isNew && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Title */}
                            <div>
                                <label className={cn("text-xs font-bold uppercase block mb-2", isLight ? "text-zinc-500" : "text-white/70")}>
                                    {t('common.name') || "Título"}
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Escribe el título..."
                                    className={cn(
                                        "w-full px-4 py-3 rounded-lg border text-sm font-medium",
                                        isLight
                                            ? "bg-white border-zinc-200 text-zinc-900 focus:ring-2 focus:ring-primary/30"
                                            : "bg-black/20 border-white/10 text-white focus:ring-2 focus:ring-primary/30"
                                    )}
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className={cn("text-xs font-bold uppercase block mb-2", isLight ? "text-zinc-500" : "text-white/70")}>
                                    {t('task_manager.description') || "Contenido"}
                                </label>
                                <RichTextEditor
                                    content={formData.content}
                                    onChange={(html: string) => setFormData({ ...formData, content: html })}
                                    placeholder="Escribe el contenido detallado..."
                                    storagePath={`tenants/${tenantId}/knowledge/${isNew ? 'temp' : selectedEntry?.id || 'unknown'}`}
                                    className="min-h-[300px]"
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className={cn("text-xs font-bold uppercase block mb-2", isLight ? "text-zinc-500" : "text-white/70")}>
                                    <Tag className="w-3 h-3 inline mr-1" /> Tags
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                                        >
                                            {tag}
                                            <button onClick={() => handleRemoveTag(tag)} className="hover:text-primary/70">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => {
                                            setTagInput(e.target.value);
                                            setShowTagSuggestions(true);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && tagInput.trim()) {
                                                e.preventDefault();
                                                handleAddTag(tagInput);
                                            }
                                        }}
                                        onFocus={() => setShowTagSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                                        placeholder="Escribe un tag y pulsa Enter..."
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg border text-sm",
                                            isLight
                                                ? "bg-white border-zinc-200 text-zinc-900"
                                                : "bg-black/20 border-white/10 text-white"
                                        )}
                                    />
                                    {/* Tag suggestions dropdown */}
                                    {showTagSuggestions && tagSuggestions.length > 0 && (
                                        <div className={cn(
                                            "absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-10",
                                            isLight ? "bg-white border-zinc-200" : "bg-zinc-900 border-white/10"
                                        )}>
                                            {tagSuggestions.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => handleAddTag(tag)}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 text-sm hover:bg-primary/10 first:rounded-t-lg last:rounded-b-lg",
                                                        isLight ? "text-zinc-900" : "text-white"
                                                    )}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Project Link (Optional) */}
                            <div>
                                <label className={cn("text-xs font-bold uppercase block mb-2", isLight ? "text-zinc-500" : "text-white/70")}>
                                    <FolderGit2 className="w-3 h-3 inline mr-1" /> {t('task_manager.assigned_project') || "Proyecto (Opcional)"}
                                </label>
                                <select
                                    value={formData.projectId}
                                    onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-sm",
                                        isLight
                                            ? "bg-white border-zinc-200 text-zinc-900"
                                            : "bg-black/20 border-white/10 text-white"
                                    )}
                                >
                                    <option value="">Sin proyecto asociado</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Attachments */}
                            <AttachmentManager
                                attachments={formData.attachments}
                                onAttachmentsChange={(urls) => setFormData({ ...formData, attachments: urls })}
                                storagePath={`tenants/${tenantId}/knowledge/${isNew ? 'temp' : selectedEntry?.id || 'unknown'}`}
                                className="pt-2"
                            />

                            {/* Audit Info */}
                            {!isNew && selectedEntry && (
                                <div className={cn(
                                    "p-4 rounded-lg border",
                                    isLight ? "bg-zinc-50 border-zinc-200" : "bg-black/20 border-white/5"
                                )}>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-3">
                                        {t('knowledge_base.changelog') || "Historial"}
                                    </p>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <User className="w-3 h-3" />
                                            <span>{t('knowledge_base.created_by') || "Creado por"}: <strong className="text-foreground">{selectedEntry.createdByName}</strong></span>
                                            <Clock className="w-3 h-3 ml-2" />
                                            <span>
                                                {format(safeParseDate(selectedEntry.createdAt) || new Date(), 'dd MMM yyyy HH:mm', { locale: es })}
                                            </span>
                                        </div>
                                        {selectedEntry.updatedBy && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <User className="w-3 h-3" />
                                                <span>{t('knowledge_base.updated_by') || "Modificado por"}: <strong className="text-foreground">{selectedEntry.updatedByName}</strong></span>
                                                <Clock className="w-3 h-3 ml-2" />
                                                <span>
                                                    {format(safeParseDate(selectedEntry.updatedAt) || new Date(), 'dd MMM yyyy HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                        )}
                                        {/* Change log entries */}
                                        {selectedEntry.changelog?.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
                                                <p className="text-[10px] uppercase text-muted-foreground mb-2">Cambios recientes</p>
                                                {selectedEntry.changelog.slice(-3).reverse().map((log, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-muted-foreground py-1">
                                                        <ChevronRight className="w-3 h-3" />
                                                        <span>{log.userName}: {log.action}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className={cn(
                            "p-4 border-t flex justify-end gap-3",
                            isLight ? "border-zinc-200" : "border-white/5"
                        )}>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {t('common.save') || "Guardar"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
