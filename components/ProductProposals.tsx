"use client";

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from "@/lib/utils";
import {
    Search, Plus, Trash2, Copy, Check, Clock, User, Tag,
    FolderGit2, Lightbulb, BookMarked, ChevronRight, X, Calendar, Download
} from 'lucide-react';
import { AttachmentManager } from './AttachmentManager';
import RichTextEditor from './RichTextEditor';
import {
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
    doc, serverTimestamp, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getActiveProjects } from '@/lib/projects';
import { KnowledgeEntry, ChangeLogEntry, Project, getRoleLevel } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { safeParseDate } from "@/lib/date-utils";

export function ProductProposals() {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { t } = useLanguage();
    const { showToast } = useToast();
    const { user, tenantId, userRole } = useAuth();
    const type = 'product_proposal';

    // State
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [allTags, setAllTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);
    const [isNew, setIsNew] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');

    const [copied, setCopied] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        tags: [] as string[],
        attachments: [] as string[]
    });
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);

    // Load data
    useEffect(() => {
        if (!tenantId) return;
        loadEntries();
    }, [tenantId]);

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

    // Filtered entries
    const filteredEntries = useMemo(() => {
        let filtered = entries;

        // Text Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(q) ||
                e.content.toLowerCase().includes(q) ||
                e.tags?.some(tag => tag.toLowerCase().includes(q))
            );
        }

        // Date Range Filter
        if (dateStart || dateEnd) {
            filtered = filtered.filter(e => {
                if (!e.createdAt?.toDate) return false;
                const date = safeParseDate(e.createdAt);
                if (!date) return false;

                // If only start date
                if (dateStart && !dateEnd) {
                    return date >= startOfDay(parseISO(dateStart));
                }

                // If only end date
                if (!dateStart && dateEnd) {
                    return date <= endOfDay(parseISO(dateEnd));
                }

                // Both
                if (dateStart && dateEnd) {
                    return isWithinInterval(date, {
                        start: startOfDay(parseISO(dateStart)),
                        end: endOfDay(parseISO(dateEnd))
                    });
                }

                return true;
            });
        }

        return filtered;
    }, [entries, searchQuery, dateStart, dateEnd]);

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

        return result;
    };

    // Save entry
    const handleSave = async () => {
        if (!formData.title.trim()) {
            showToast("UniTask", t('task_manager.title_required') || "Título requerido", "error");
            return;
        }

        try {
            const changeLogEntry: ChangeLogEntry = {
                userId: user?.uid || '',
                userName: user?.displayName || 'Unknown',
                timestamp: new Date().toISOString(),
                action: isNew ? 'created' : 'updated',
                changes: isNew ? 'Propuesta creada' : 'Propuesta actualizada'
            };

            if (isNew) {
                // Create new entry
                const newEntry: Omit<KnowledgeEntry, 'id'> = {
                    type,
                    title: formData.title,
                    content: formData.content,
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
        const text = `# ${formData.title}\n\n${formData.content}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        showToast("UniTask", t('common.copied') || "Copiado", "success");
        setTimeout(() => setCopied(false), 2000);
    };

    // Export to Text File
    const handleExport = () => {
        if (filteredEntries.length === 0) return;

        const header = `PRODUCT PROPOSALS EXPORT\nFILTER: "${searchQuery}"\nDATE RANGE: ${dateStart || 'Any'} to ${dateEnd || 'Any'}\nGENERATED: ${new Date().toLocaleString()}\n========================================\n\n`;
        const content = filteredEntries.map(e => {
            const creationDate = safeParseDate(e.createdAt);
            const date = creationDate ? format(creationDate, 'dd/MM/yyyy HH:mm') : 'Unknown Date';
            const tags = e.tags && e.tags.length > 0 ? `\nTags: ${e.tags.join(', ')}` : '';
            const plainContent = stripHtml(e.content);
            return `Title: ${e.title}\nDate: ${date}\nAuthor: ${e.createdByName || 'Unknown'}\n----------------------------------------\n${plainContent}${tags}\n`;
        }).join('\n========================================\n\n');

        const element = document.createElement("a");
        const file = new Blob([header + content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `proposals_export_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        document.body.removeChild(element);

        showToast("UniTask", "Archivo exportado correctamente", "success");
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* LEFT: List Panel */}
            <div className={cn(
                "w-96 flex-shrink-0 flex flex-col border-r", // Increased width for filters
                isLight ? "bg-white border-zinc-200" : "bg-card border-white/5"
            )}>
                {/* Header */}
                <div className={cn(
                    "p-4 border-b flex items-center justify-between",
                    isLight ? "border-zinc-200" : "border-white/5"
                )}>
                    <div className="flex items-center gap-2">
                        <Lightbulb className={cn("w-5 h-5 text-yellow-500")} />
                        <h2 className={cn("font-bold", isLight ? "text-zinc-900" : "text-white")}>
                            {t('knowledge_base.product_proposals') || "Propuestas de Producto"}
                        </h2>
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

                {/* Filters */}
                <div className="p-3 space-y-2 border-b border-dashed border-white/5">
                    {/* Text Search */}
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

                    {/* Date Filters */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Desde</label>
                            <input
                                type="date"
                                value={dateStart}
                                onChange={e => setDateStart(e.target.value)}
                                className={cn(
                                    "w-full px-2 py-1.5 rounded-lg border text-xs",
                                    isLight ? "bg-zinc-50 border-zinc-200" : "bg-black/20 border-white/10 text-white"
                                )}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Hasta</label>
                            <input
                                type="date"
                                value={dateEnd}
                                onChange={e => setDateEnd(e.target.value)}
                                className={cn(
                                    "w-full px-2 py-1.5 rounded-lg border text-xs",
                                    isLight ? "bg-zinc-50 border-zinc-200" : "bg-black/20 border-white/10 text-white"
                                )}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    {filteredEntries.length > 0 && (
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => {
                                    const header = `PRODUCT PROPOSALS LIST\n----------------------------------------\n\n`;
                                    const content = filteredEntries.map(e => `[${e.createdByName}] ${e.title}`).join('\n');
                                    navigator.clipboard.writeText(header + content);
                                    showToast("UniTask", `Lista copiada (${filteredEntries.length} items)`, "success");
                                }}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors border",
                                    isLight
                                        ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"
                                        : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                                )}
                                title="Copiar lista al portapapeles"
                            >
                                <Copy className="w-3 h-3" /> Copy
                            </button>
                            <button
                                onClick={handleExport}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors border",
                                    isLight
                                        ? "bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200"
                                        : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                                )}
                                title="Exportar detalle a fichero texto"
                            >
                                <Download className="w-3 h-3" /> Export
                            </button>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <p className="text-center text-muted-foreground p-4">{t('common.loading')}</p>
                    ) : filteredEntries.length === 0 ? (
                        <p className="text-center text-muted-foreground p-4 text-xs">
                            {t('knowledge_base.no_entries') || "No hay propuestas que coincidan con los filtros"}
                        </p>
                    ) : (
                        filteredEntries.map(entry => (
                            <button
                                key={entry.id}
                                onClick={() => handleSelect(entry)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border transition-all relative group",
                                    selectedEntry?.id === entry.id
                                        ? "bg-primary/10 border-primary/30"
                                        : isLight
                                            ? "bg-white border-zinc-100 hover:border-zinc-300"
                                            : "bg-black/10 border-white/5 hover:border-white/10"
                                )}
                            >
                                <p className={cn(
                                    "font-medium text-sm truncate pr-16",
                                    isLight ? "text-zinc-900" : "text-white"
                                )}>{entry.title}</p>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                    {format(safeParseDate(entry.createdAt) || new Date(), 'dd/MM/yyyy')} by {entry.createdByName}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate opacity-70 italic mt-0.5">
                                    {stripHtml(entry.content).slice(0, 60)}...
                                </p>

                                {entry.tags?.length > 0 && (
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                        {entry.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                                {tag}
                                            </span>
                                        ))}
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
                            <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-30 text-yellow-500" />
                            <p>{t('task_manager.select_task') || "Selecciona una propuesta"}</p>
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
                                {isNew ? (t('knowledge_base.new_entry') || 'Nueva Propuesta') : (formData.title || 'Mejoras...')}
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
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">

                            {/* Read-Only Creator Info (If viewing existing) */}
                            {!isNew && selectedEntry && (
                                <div className="flex items-center gap-4 p-4 rounded-xl border bg-black/5 dark:bg-white/5 border-dashed border-zinc-300 dark:border-white/10">
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase font-bold text-muted-foreground">Propuesta creada por</div>
                                        <div className="font-bold text-sm">{selectedEntry.createdByName || 'Unknown'}</div>
                                    </div>
                                    <div className="ml-auto text-right">
                                        <div className="text-xs uppercase font-bold text-muted-foreground">Fecha</div>
                                        <div className="font-mono text-sm text-foreground">
                                            {selectedEntry.createdAt?.toDate
                                                ? format(safeParseDate(selectedEntry.createdAt) || new Date(), 'dd MMM yyyy, HH:mm')
                                                : '-'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className={cn("text-xs font-bold uppercase block mb-2", isLight ? "text-zinc-500" : "text-white/70")}>
                                    {t('common.name') || "Nombre de la Propuesta"}
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Ej. Integración con Google Calendar..."
                                    className={cn(
                                        "w-full px-4 py-3 rounded-lg border text-lg font-bold shadow-sm transition-all focus:scale-[1.01]",
                                        isLight
                                            ? "bg-white border-zinc-200 text-zinc-900 focus:ring-2 focus:ring-yellow-500/30"
                                            : "bg-black/20 border-white/10 text-white focus:ring-2 focus:ring-yellow-500/30"
                                    )}
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className={cn("text-xs font-bold uppercase block mb-2", isLight ? "text-zinc-500" : "text-white/70")}>
                                    <Tag className="w-3 h-3 inline mr-1" /> Tags / Categorías
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-xs font-medium border border-yellow-500/20"
                                        >
                                            {tag}
                                            <button onClick={() => handleRemoveTag(tag)} className="hover:text-yellow-800 dark:hover:text-yellow-300">
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
                                        placeholder="+ Añadir etiqueta..."
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

                            {/* Content */}
                            <div>
                                <label className={cn("text-xs font-bold uppercase block mb-2", isLight ? "text-zinc-500" : "text-white/70")}>
                                    {t('task_manager.description') || "Descripción detallada de la propuesta"}
                                </label>
                                <RichTextEditor
                                    content={formData.content}
                                    onChange={(html: string) => setFormData({ ...formData, content: html })}
                                    placeholder="Describe la funcionalidad, el valor que aporta y los casos de uso..."
                                    storagePath={`tenants/${tenantId}/knowledge/${isNew ? 'temp' : selectedEntry?.id || 'unknown'}`}
                                    className="min-h-[300px]"
                                />
                            </div>

                            {/* Images / Attachments */}
                            <AttachmentManager
                                attachments={formData.attachments}
                                onAttachmentsChange={(urls) => setFormData({ ...formData, attachments: urls })}
                                storagePath={`tenants/${tenantId}/knowledge/${isNew ? 'temp' : selectedEntry?.id || 'unknown'}`}
                                className="pt-4"
                            />

                        </div>

                        {/* Footer Actions */}
                        <div className={cn(
                            "p-4 border-t flex items-center justify-end gap-3",
                            isLight ? "bg-white border-zinc-200" : "bg-card border-white/5"
                        )}>
                            <button
                                onClick={() => setSelectedEntry(null)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    isLight
                                        ? "hover:bg-zinc-100 text-zinc-600"
                                        : "hover:bg-white/10 text-zinc-400 hover:text-white"
                                )}
                            >
                                {t('common.cancel') || "Cancelar"}
                            </button>
                            <button
                                onClick={handleSave}
                                className={cn(
                                    "px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95",
                                    "bg-yellow-500 text-black hover:bg-yellow-400"
                                )}
                            >
                                {isNew ? (t('common.create') || "Crear Propuesta") : (t('common.save') || "Guardar Cambios")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
