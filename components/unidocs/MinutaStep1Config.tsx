"use client";

// UniDocs V2.4 — Paso 1: Configuración
// Título, fecha, plantillas y selección/orden de notas

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UniDocsTemplate, UniDocsMinuta, UniLeakNote } from "@/types/unidocs";
import { Loader2, GripVertical, ChevronRight, CheckSquare, Square, FileText, FileType, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MinutaStep1ConfigProps {
    projectId: string;
    folderId: string | null;
    tenantId: string;
    templates: UniDocsTemplate[];
    minuta: UniDocsMinuta;
    onChange: (updates: Partial<UniDocsMinuta>) => void;
    onNext: () => void;
}

export default function MinutaStep1Config({
    projectId,
    folderId,
    tenantId,
    templates,
    minuta,
    onChange,
    onNext,
}: MinutaStep1ConfigProps) {
    const [notes, setNotes] = useState<UniLeakNote[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(true);

    // Drag state for reordering selected notes
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const bodyTemplates = templates.filter(t => (t.templateType ?? "body") === "body");
    const coverTemplates = templates.filter(t => t.templateType === "cover");

    // Load notes for this project/folder
    useEffect(() => {
        let isMounted = true;
        const loadNotes = async () => {
            setLoadingNotes(true);
            try {
                let q;
                if (folderId) {
                    q = query(
                        collection(db, "unileaks_notes"),
                        where("projectId", "==", projectId),
                        where("folderId", "==", folderId),
                        where("tenantId", "==", tenantId),
                    );
                } else {
                    q = query(
                        collection(db, "unileaks_notes"),
                        where("projectId", "==", projectId),
                        where("tenantId", "==", tenantId),
                    );
                }
                const snap = await getDocs(q);
                if (isMounted) {
                    setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as UniLeakNote)));
                }
            } catch (e) {
                console.error("[Minuta Step1] Error loading notes:", e);
            } finally {
                if (isMounted) setLoadingNotes(false);
            }
        };
        loadNotes();
        return () => { isMounted = false; };
    }, [projectId, folderId, tenantId]);

    const toggleNote = (note: UniLeakNote) => {
        const isSelected = minuta.orderedNoteIds.includes(note.id);
        if (isSelected) {
            onChange({
                notes: minuta.notes.filter(n => n.id !== note.id),
                orderedNoteIds: minuta.orderedNoteIds.filter(id => id !== note.id),
            });
        } else {
            onChange({
                notes: [...minuta.notes, note],
                orderedNoteIds: [...minuta.orderedNoteIds, note.id],
            });
        }
    };

    // Drag & drop reordering of selected notes
    const handleDragStart = (index: number) => setDragIndex(index);
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };
    const handleDrop = (index: number) => {
        if (dragIndex === null || dragIndex === index) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }
        const newOrder = [...minuta.orderedNoteIds];
        const [moved] = newOrder.splice(dragIndex, 1);
        newOrder.splice(index, 0, moved);
        onChange({ orderedNoteIds: newOrder });
        setDragIndex(null);
        setDragOverIndex(null);
    };

    const orderedSelectedNotes = minuta.orderedNoteIds
        .map(id => minuta.notes.find(n => n.id === id))
        .filter(Boolean) as UniLeakNote[];

    const canProceed = minuta.title.trim() !== "" && minuta.bodyTemplateId !== "" && minuta.orderedNoteIds.length > 0;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Left: Minuta config */}
                    <div className="space-y-5">
                        <div>
                            <h3 className="text-sm font-bold text-foreground mb-4">Configuración de la minuta</h3>

                            {/* Title */}
                            <div className="mb-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Título de la minuta *</label>
                                <input
                                    value={minuta.title}
                                    onChange={e => onChange({ title: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                                    placeholder="Ej: Minuta Reunión Kick-off"
                                />
                            </div>

                            {/* Date */}
                            <div className="mb-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha de la reunión</label>
                                <input
                                    value={minuta.meetingDate}
                                    onChange={e => onChange({ meetingDate: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                                    placeholder="Ej: 9 de marzo de 2026"
                                />
                            </div>

                            {/* Body template Section */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">1. Plantilla de Cuerpo *</label>
                                    <span className="text-[10px] text-primary font-bold">OBLIGATORIO</span>
                                </div>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                    {bodyTemplates.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => onChange({ bodyTemplateId: t.id })}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                                                minuta.bodyTemplateId === t.id
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border bg-card hover:border-primary/40"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                                    minuta.bodyTemplateId === t.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                                                )}>
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold truncate">{t.name}</span>
                                            </div>
                                            {minuta.bodyTemplateId === t.id && <Check className="w-4 h-4 text-primary" />}
                                        </button>
                                    ))}
                                    {bodyTemplates.length === 0 && (
                                        <div className="p-4 text-center border border-dashed rounded-xl">
                                            <p className="text-xs text-muted-foreground">No hay plantillas de cuerpo.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cover template Section */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">2. Plantilla de Portada</label>
                                    {minuta.coverTemplateId ? (
                                        <button 
                                            onClick={() => onChange({ coverTemplateId: null })}
                                            className="text-[10px] text-destructive hover:underline font-bold"
                                        >
                                            QUITAR PORTADA
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground font-medium">OPCIONAL</span>
                                    )}
                                </div>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                    {coverTemplates.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => onChange({ coverTemplateId: t.id })}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                                                minuta.coverTemplateId === t.id
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border bg-card hover:border-primary/40"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                                    minuta.coverTemplateId === t.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                                                )}>
                                                    <FileType className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold truncate">{t.name}</span>
                                            </div>
                                            {minuta.coverTemplateId === t.id && <Check className="w-4 h-4 text-primary" />}
                                        </button>
                                    ))}
                                    {coverTemplates.length === 0 && (
                                        <div className="p-4 text-center border border-dashed rounded-xl">
                                            <p className="text-xs text-muted-foreground">No hay plantillas de portada.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Page break toggle */}
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div
                                    onClick={() => onChange({ pageBreakBetweenNotes: !minuta.pageBreakBetweenNotes })}
                                    className={cn(
                                        "w-9 h-5 rounded-full transition-colors relative",
                                        minuta.pageBreakBetweenNotes ? "bg-primary" : "bg-secondary"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                                        minuta.pageBreakBetweenNotes ? "translate-x-4" : "translate-x-0.5"
                                    )} />
                                </div>
                                <span className="text-sm text-foreground">Separar notas con salto de página</span>
                            </label>
                        </div>

                        {/* Selected notes — reorderable */}
                        {orderedSelectedNotes.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    Orden de las notas ({orderedSelectedNotes.length})
                                </h4>
                                <div className="space-y-1">
                                    {orderedSelectedNotes.map((note, index) => (
                                        <div
                                            key={note.id}
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragOver={e => handleDragOver(e, index)}
                                            onDrop={() => handleDrop(index)}
                                            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-lg border transition-all cursor-grab",
                                                dragOverIndex === index ? "border-primary bg-primary/10" : "border-border"
                                            )}
                                        >
                                            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="text-xs font-medium text-foreground flex-1 truncate">{note.title || "Sin título"}</span>
                                            <span className="text-[10px] text-muted-foreground shrink-0">{index + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Note selection */}
                    <div>
                        <h3 className="text-sm font-bold text-foreground mb-4">
                            Seleccionar notas
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                                {minuta.orderedNoteIds.length} seleccionadas
                            </span>
                        </h3>

                        {loadingNotes ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : notes.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <p className="text-sm">No hay notas en esta carpeta.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                                {notes.map(note => {
                                    const isSelected = minuta.orderedNoteIds.includes(note.id);
                                    return (
                                        <button
                                            key={note.id}
                                            onClick={() => toggleNote(note)}
                                            className={cn(
                                                "w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                                                isSelected
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border bg-card hover:border-primary/40"
                                            )}
                                        >
                                            {isSelected
                                                ? <CheckSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                : <Square className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                            }
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{note.title || "Sin título"}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
                                                    dangerouslySetInnerHTML={{ __html: note.content?.replace(/<[^>]+>/g, ' ').slice(0, 120) || '' }}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex justify-end">
                <button
                    onClick={onNext}
                    disabled={!canProceed}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continuar <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
