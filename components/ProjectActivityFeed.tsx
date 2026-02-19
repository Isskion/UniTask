"use client";

import { safeParseDate } from "@/lib/date-utils";
import { useEffect, useState, forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { TimelineEvent } from "@/types";
import { getProjectTimeline, trashTimelineEvent, createTimelineEvent } from "@/lib/updates";
import { format, isSameDay, isToday, isYesterday, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, MessageCircle, AlertCircle, CheckCircle, Clock, Trash2, Search, Download, Loader2, Calendar, ArrowRight, Plus, Paperclip, X, Send, Image as ImageIcon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { useFileUploader } from "@/hooks/useFileUploader";

import { useAuth } from "@/context/AuthContext";
import HighlightText from "./ui/HighlightText";

interface ProjectActivityFeedProps {
    projectId: string;
    projectTenantId?: string; // Specific tenant of the project
    projectName?: string;
    searchQuery?: string;
}

export interface ProjectActivityFeedHandle {
    copyResults: () => void;
}

const ProjectActivityFeed = forwardRef<ProjectActivityFeedHandle, ProjectActivityFeedProps>(({ projectId, projectTenantId, projectName = "Project", searchQuery = "" }, ref) => {
    const { theme } = useTheme();
    const { tenantId, user } = useAuth(); // Get Tenant Context
    const isLight = theme === 'light';
    const { showToast } = useToast();
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [fullHistoryLoaded, setFullHistoryLoaded] = useState(false);
    const [fetchingHistory, setFetchingHistory] = useState(false);

    // New Entry Form State
    const [showNewEntry, setShowNewEntry] = useState(false);
    const [newNotes, setNewNotes] = useState("");
    const [newType, setNewType] = useState<'daily' | 'decision' | 'alert'>('daily');
    const [newAttachments, setNewAttachments] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { uploadFile, uploading: isUploading, progress: uploadProgress } = useFileUploader();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadTimeline(false);
    }, [projectId, tenantId]);

    // Trigger Full History Load when searching
    useEffect(() => {
        if (searchQuery && !fullHistoryLoaded && !fetchingHistory) {
            loadTimeline(true);
        }
    }, [searchQuery, fullHistoryLoaded, fetchingHistory]);

    const loadTimeline = async (loadFull: boolean) => {
        if (loadFull) {
            setFetchingHistory(true);
        } else {
            setLoading(true);
        }

        const limitCount = loadFull ? -1 : 50;

        try {
            const targetTenantId = projectTenantId || tenantId || "1";
            const data = await getProjectTimeline(projectId, targetTenantId, limitCount, projectName);

            setEvents(data);

            if (loadFull) {
                setFullHistoryLoaded(true);
            }
        } catch (e) {
            console.error("Failed to load timeline", e);
        } finally {
            setLoading(false);
            setFetchingHistory(false);
        }
    };

    // Filter Events based on Search Query
    const filteredEvents = events.filter(event => {
        if (!searchQuery) return true;
        const lowerQ = searchQuery.toLowerCase();
        return (
            (event.content.notes?.toLowerCase().includes(lowerQ)) ||
            (event.authorName?.toLowerCase().includes(lowerQ)) ||
            (event.content.nextSteps?.some(step => step.toLowerCase().includes(lowerQ)))
        );
    });

    // Expose Copy Function
    useImperativeHandle(ref, () => ({
        copyResults: () => {
            if (filteredEvents.length === 0) {
                showToast("Clipboard", "No results to copy", "warning");
                return;
            }

            const header = `SEARCH RESULTS: "${searchQuery}"\nPROJECT: ${projectName}\nDATE: ${new Date().toLocaleDateString()}\n----------------------------------------\n\n`;

            const content = filteredEvents.map(u => {
                const activityDate = safeParseDate(u.date);
                const date = activityDate ? format(activityDate, 'dd/MM/yyyy HH:mm') : 'Unknown Date';
                const author = u.authorName || 'System';
                let text = `[${date}] ${author}:\n${u.content.notes || ''}\n`;

                if (u.content.nextSteps && u.content.nextSteps.length > 0) {
                    text += `ACTIONS: \n${u.content.nextSteps.map(s => ` - ${s}`).join('\n')}\n`;
                }
                return text;
            }).join('\n----------------------------------------\n\n');

            navigator.clipboard.writeText(header + content)
                .then(() => showToast("Clipboard", "Results copied to clipboard", "success"))
                .catch(() => showToast("Error", "Could not copy to clipboard", "error"));
        }
    }));

    // Group by Date for the "Day Header" effect
    const grouped = filteredEvents.reduce((acc, event) => {
        const activityDate = safeParseDate(event.date);
        const dateKey = activityDate ? format(activityDate, 'yyyy-MM-dd') : 'unknown';
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, TimelineEvent[]>);

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    // Shared upload helper
    const uploadSingleFile = async (file: File) => {
        const targetTenantId = projectTenantId || tenantId || "1";
        const path = `tenants/${targetTenantId}/projects/${projectId}/attachments`;
        const result = await uploadFile(file, path);
        if (result) {
            setNewAttachments(prev => [...prev, result.url]);
        }
    };

    const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        await uploadSingleFile(e.target.files[0]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Drag-and-drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        // Handle dropped files (images, PDFs, .eml, .msg)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                await uploadSingleFile(e.dataTransfer.files[i]);
            }
            return;
        }

        // Handle dropped text (email chain pasted as text)
        const droppedText = e.dataTransfer.getData('text/plain');
        if (droppedText) {
            setNewNotes(prev => prev ? prev + '\n\n---\n\n' + droppedText : droppedText);
        }
    };

    // Paste handler for images from clipboard
    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) await uploadSingleFile(file);
                return;
            }
        }
        // If no image, let normal paste behavior happen (text goes into textarea)
    };

    const handleSubmitEntry = async () => {
        if (!user || !newNotes.trim()) return;
        setSubmitting(true);
        try {
            const targetTenantId = projectTenantId || tenantId || "1";
            const contentPayload: TimelineEvent['content'] = {
                notes: newNotes.trim(),
            };
            if (newAttachments.length > 0) {
                contentPayload.attachments = newAttachments;
            }
            await createTimelineEvent(projectId, targetTenantId, {
                projectId,
                date: new Date(),
                authorId: user.uid,
                authorName: user.displayName || 'User',
                type: newType,
                content: contentPayload,
            });
            showToast("Seguimiento", "Entrada creada correctamente", "success");
            setNewNotes("");
            setNewType('daily');
            setNewAttachments([]);
            setShowNewEntry(false);
            loadTimeline(false);
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo crear la entrada", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-10 flex justify-center text-zinc-500"><Loader2 className="animate-spin w-6 h-6" /></div>;
    }

    if (events.length === 0) {
        return (
            <div className="p-10 text-center border border-dashed border-white/10 rounded-xl m-4">
                <p className="text-zinc-500">No activity recorded for this project.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 max-w-3xl mx-auto pb-20">

            {/* New Entry Button / Form */}
            {!showNewEntry ? (
                <button
                    onClick={() => setShowNewEntry(true)}
                    className={cn(
                        "w-full border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 text-sm font-bold transition-all",
                        isLight
                            ? "border-zinc-300 text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
                            : "border-white/10 text-zinc-500 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5"
                    )}
                >
                    <Plus className="w-4 h-4" />
                    Añadir Entrada / Adjuntar Email
                </button>
            ) : (
                <div className={cn("border rounded-xl overflow-hidden shadow-lg animate-in slide-in-from-top-2 duration-300",
                    isLight ? "bg-white border-zinc-200" : "bg-card border-white/10"
                )}>
                    <div className={cn("p-3 border-b flex items-center justify-between",
                        isLight ? "bg-zinc-50" : "bg-muted/30"
                    )}>
                        <div className="flex items-center gap-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest">Nueva Entrada</h4>
                            <select
                                value={newType}
                                onChange={e => setNewType(e.target.value as any)}
                                className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded-md border",
                                    isLight ? "bg-white border-zinc-300" : "bg-zinc-800 border-white/10 text-zinc-300"
                                )}
                            >
                                <option value="daily">Update</option>
                                <option value="decision">Decisión</option>
                                <option value="alert">Alerta</option>
                            </select>
                        </div>
                        <button
                            onClick={() => { setShowNewEntry(false); setNewNotes(""); setNewAttachments([]); }}
                            className="p-1 hover:bg-muted rounded-full transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div
                        ref={dropZoneRef}
                        className={cn("p-4 space-y-3 transition-all", isDragging && "bg-indigo-500/10 ring-2 ring-indigo-500/50 ring-inset")}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onPaste={handlePaste}
                    >
                        {isDragging && (
                            <div className="text-center py-6 text-indigo-400 text-sm font-bold animate-pulse">
                                Suelta aquí para adjuntar...
                            </div>
                        )}
                        <textarea
                            value={newNotes}
                            onChange={e => setNewNotes(e.target.value)}
                            placeholder="Pega la cadena de emails aquí o escribe notas... También puedes arrastrar archivos."
                            rows={6}
                            className={cn("w-full rounded-lg border p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all",
                                isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-white/5 text-zinc-200"
                            )}
                        />

                        {/* Attachments Preview */}
                        {newAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {newAttachments.map((url, idx) => (
                                    <div key={idx} className="relative group w-20 h-14 rounded-lg overflow-hidden border border-white/10 bg-zinc-900">
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setNewAttachments(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*,application/pdf,.eml,.msg"
                                    onChange={handleAttachFile}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                                        isLight
                                            ? "border-zinc-300 text-zinc-600 hover:bg-zinc-100"
                                            : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    {isUploading ? (
                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {Math.round(uploadProgress)}%</>
                                    ) : (
                                        <><Paperclip className="w-3.5 h-3.5" /> Adjuntar</>
                                    )}
                                </button>
                                <span className="text-[10px] text-zinc-500">
                                    {newAttachments.length > 0 && `${newAttachments.length} archivo(s)`}
                                </span>
                            </div>
                            <button
                                onClick={handleSubmitEntry}
                                disabled={submitting || !newNotes.trim()}
                                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                    submitting || !newNotes.trim()
                                        ? "bg-zinc-600 text-zinc-400 cursor-not-allowed"
                                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                                )}
                            >
                                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                Publicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {sortedDates.map(dateKey => {
                const group = grouped[dateKey];

                let dateLabel = "Fecha desconocida";
                const dateObj = dateKey !== 'unknown' ? new Date(dateKey) : null;

                if (dateObj && isValid(dateObj)) {
                    dateLabel = format(dateObj, "EEEE d 'of' MMMM", { locale: es });
                    if (isToday(dateObj)) dateLabel = "Hoy";
                    if (isYesterday(dateObj)) dateLabel = "Ayer";
                }

                return (
                    <div key={dateKey} className="relative pl-6 border-l-2 border-white/10 space-y-6">
                        <div className={cn("absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 box-content", isLight ? "bg-white border-zinc-400" : "bg-background border-zinc-600")} />

                        <h3 className={cn("text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2", isLight ? "text-zinc-600" : "text-zinc-400")}>
                            <Calendar className="w-4 h-4" />
                            {dateLabel}
                            {dateObj && isValid(dateObj) && isToday(dateObj) && <span className="bg-red-500 text-white text-[10px] px-2 rounded-full normal-case">In Progress</span>}
                        </h3>

                        <div className="grid gap-4">
                            {group.map(event => (
                                <TimelineCard key={event.id} event={event} isLight={isLight} searchQuery={searchQuery} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export default ProjectActivityFeed;

// Local HighlightText removed in favor of shared component in @/components/ui/HighlightText

function TimelineCard({ event, isLight, searchQuery }: { event: TimelineEvent, isLight: boolean, searchQuery?: string }) {
    return (
        <div className={cn("border rounded-xl p-5 hover:bg-opacity-80 transition-colors shadow-sm relative overflow-hidden group",
            isLight ? "bg-white border-zinc-200 hover:bg-zinc-50" : "bg-card/30 border-white/5 hover:bg-card/50"
        )}>
            {/* Top Right Actions: Badge & Trash */}
            <div className="absolute top-2 right-2 flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                {/* Trash Action (Soft Delete) */}
                <TrashButton event={event} isLight={isLight} />

                {/* Type Badge */}
                {event.type === 'weekly' && <span className="text-xs font-mono text-muted-foreground bg-black/5 px-1.5 py-0.5 rounded">SUMMARY</span>}
                {event.type === 'daily' && <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">DAILY</span>}
            </div>

            {/* Header: Author */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                    {event.authorName?.[0] || 'S'}
                </div>
                <span className={cn("text-xs font-medium", isLight ? "text-zinc-700" : "text-zinc-400")}>
                    <HighlightText text={event.authorName || 'System'} highlight={searchQuery} />
                </span>
                <span className={cn("text-[10px]", isLight ? "text-zinc-500" : "text-zinc-500")}>
                    • {(() => {
                        const d = safeParseDate(event.date);
                        return (d && isValid(d)) ? format(d, 'HH:mm') : '';
                    })()}
                </span>
            </div>

            {/* Content: Notes */}
            {event.content.notes && (
                <div className={cn("text-sm leading-relaxed mb-4 font-light",
                    isLight ? "text-zinc-900" : "text-zinc-200",
                    // If HTML (heuristic), remove whitespace-pre-wrap to let HTML control layout
                    /<[a-z][\s\S]*>/i.test(event.content.notes) ? "prose prose-sm max-w-none" : "whitespace-pre-wrap"
                )}>
                    {/<[a-z][\s\S]*>/i.test(event.content.notes) ? (
                        <div dangerouslySetInnerHTML={{ __html: event.content.notes }} />
                    ) : (
                        <HighlightText text={event.content.notes} highlight={searchQuery} />
                    )}
                </div>
            )}

            {/* Content: Tasks / Next Steps */}
            {event.content.nextSteps && event.content.nextSteps.length > 0 && (
                <div className={cn("rounded-lg p-3 space-y-2 border", isLight ? "bg-zinc-50 border-zinc-200" : "bg-muted/30 border-white/5")}>
                    <h4 className={cn("text-[10px] uppercase font-bold flex items-center gap-2", isLight ? "text-zinc-600" : "text-muted-foreground")}>
                        <ArrowRight className="w-3 h-3" /> Key Actions
                    </h4>
                    <ul className="space-y-1.5">
                        {event.content.nextSteps.map((step, i) => (
                            <li key={i} className={cn("text-xs flex items-start gap-2", isLight ? "text-zinc-800" : "text-zinc-300")}>
                                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                <HighlightText text={step} highlight={searchQuery} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Content: Attachments */}
            {
                event.content.attachments && event.content.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {event.content.attachments.map((url, idx) => (
                            <div key={idx} className="relative group rounded-lg overflow-hidden border border-zinc-800 w-24 h-16 bg-zinc-900 cursor-pointer">
                                <img
                                    src={url}
                                    alt="Attachment"
                                    className="w-full h-full object-cover"
                                    onClick={() => window.open(url, '_blank')}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[10px] text-white font-medium">View</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
}

function TrashButton({ event, isLight }: { event: TimelineEvent, isLight: boolean }) {
    const { user, userRole } = useAuth();
    const { showToast } = useToast();
    const [deleting, setDeleting] = useState(false);
    // Dynamic import removed, using top-level import
    // const { trashTimelineEvent } = require("@/lib/updates");

    const canTrash = user && (user.uid === event.authorId || ['superadmin', 'app_admin', 'global_pm'].includes(userRole || ''));

    if (!canTrash) return null;

    const handleTrash = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Mover a la papelera?")) return;

        setDeleting(true);
        try {
            await trashTimelineEvent(event.id!, user!.uid);
            showToast("Papelera", "Elemento movido a la papelera", "success");
            // Force clear cache or simple reload
            window.location.reload();
        } catch (error) {
            console.error(error);
            showToast("Error", "No se pudo borrar", "error");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <button
            onClick={handleTrash}
            disabled={deleting}
            className={cn("p-1.5 rounded-md transition-colors",
                isLight ? "text-zinc-400 hover:text-red-500 hover:bg-red-50"
                    : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            )}
            title="Mover a Papelera"
        >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
    );
}

// Ensure Trash2 and Loader2 are imported (Loader2 is, Trash2 needs check)
