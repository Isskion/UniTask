'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UniLeakNote, UniLeakFolder } from '@/types';
import { getProjectNotes, getProjectFolders, saveNote, saveFolder, deleteNote } from '@/lib/unileaks';
import UniLeaksEditor from '@/components/unileaks/UniLeaksEditor';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Folder, FileText, Plus, Loader2, Lock, Globe, Users, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoveryNotesPanelProps {
    tenantId: string;
    projectId: string;
    uid: string;
    isInternalViewer: boolean;
    initialNotes?: UniLeakNote[];
    collapsed: boolean;
    onToggleCollapse: () => void;
    onActiveNoteChange: (note: UniLeakNote | null) => void;
}

// Widget de Unileaks embebido en el módulo de Discovery: consulta y edición real de notas
// (reutiliza el editor Tiptap completo de la app), scopeado al proyecto activo, con creación
// de notas nuevas eligiendo carpeta y selección de texto para asignar a una respuesta.
export default function DiscoveryNotesPanel({
    tenantId, projectId, uid, isInternalViewer, initialNotes, collapsed, onToggleCollapse, onActiveNoteChange
}: DiscoveryNotesPanelProps) {
    const [notes, setNotes] = useState<UniLeakNote[]>(initialNotes || []);
    const [folders, setFolders] = useState<UniLeakFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeNote, setActiveNote] = useState<UniLeakNote | null>(null);
    const [newNoteFolderId, setNewNoteFolderId] = useState<string>('');
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'dirty' | 'error'>('idle');
    // La lista/buscador se colapsa sola al abrir una nota para dejar sitio al editor;
    // el usuario la puede reabrir manualmente para buscar o cambiar de nota.
    const [listExpanded, setListExpanded] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [notesData, foldersData] = await Promise.all([
                getProjectNotes(tenantId, projectId, uid, isInternalViewer),
                getProjectFolders(tenantId, projectId),
            ]);
            notesData.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
            setNotes(notesData);
            setFolders(foldersData);
        } catch (error) {
            console.error('[Discovery] Error cargando notas/carpetas de Unileaks:', error);
        } finally {
            setLoading(false);
        }
    }, [tenantId, projectId, uid, isInternalViewer]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const selectNote = (note: UniLeakNote | null) => {
        setActiveNote(note);
        onActiveNoteChange(note);
        // Al abrir una nota (existente o nueva), colapsar la lista para maximizar el espacio de escritura.
        if (note) setListExpanded(false);
    };

    const handleNewNote = () => {
        const newNote: UniLeakNote = {
            id: '',
            title: '',
            content: '',
            projectId,
            tenantId,
            userId: uid,
            isPublic: false,
            isInternal: isInternalViewer,
            folderId: newNoteFolderId || null,
            createdAt: null,
            updatedAt: null,
        };
        selectNote(newNote);
    };

    const handleCreateFolder = async () => {
        const name = prompt('Nombre de la nueva carpeta:');
        if (!name?.trim()) return;
        try {
            const id = await saveFolder({ name: name.trim(), parentId: null, projectId, tenantId });
            const newFolder = { id, name: name.trim(), parentId: null, projectId, tenantId, createdAt: null, updatedAt: null } as UniLeakFolder;
            setFolders(prev => [...prev, newFolder]);
            setNewNoteFolderId(id);
        } catch (error) {
            console.error('[Discovery] Error creando carpeta:', error);
            alert('No se pudo crear la carpeta.');
        }
    };

    const handleSaveSuccess = (savedNote: UniLeakNote) => {
        setNotes(prev => {
            const exists = prev.some(n => n.id === savedNote.id);
            const next = exists ? prev.map(n => n.id === savedNote.id ? savedNote : n) : [savedNote, ...prev];
            return next.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
        });
        selectNote(savedNote);
    };

    const handleDeleteSuccess = (noteId: string) => {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        selectNote(null);
    };

    const handleSetVisibility = async (isPublic: boolean, isInternal: boolean) => {
        if (!activeNote) return;
        if (!activeNote.id) {
            const updated = { ...activeNote, isPublic, isInternal };
            setActiveNote(updated);
            onActiveNoteChange(updated);
            return;
        }
        try {
            await saveNote({ id: activeNote.id, isPublic, isInternal });
            const updated = { ...activeNote, isPublic, isInternal };
            setNotes(prev => prev.map(n => n.id === activeNote.id ? updated : n));
            selectNote(updated);
        } catch (error) {
            console.error('[Discovery] Error actualizando visibilidad de la nota:', error);
            alert('No se pudo actualizar la visibilidad de la nota.');
        }
    };

    const handleDeleteActiveNote = async () => {
        if (!activeNote?.id) return;
        if (!confirm('¿Eliminar esta nota permanentemente?')) return;
        try {
            await deleteNote(activeNote.id);
            handleDeleteSuccess(activeNote.id);
        } catch (error) {
            console.error('[Discovery] Error eliminando nota:', error);
            alert('No se pudo eliminar la nota.');
        }
    };

    if (collapsed) {
        return (
            <button
                onClick={onToggleCollapse}
                className="w-10 shrink-0 border-r border-border bg-card flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors"
                title="Expandir Unileaks"
            >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground [writing-mode:vertical-rl]">Unileaks</span>
            </button>
        );
    }

    const query = searchQuery.trim().toLowerCase();
    const filteredNotes = query ? notes.filter(n => (n.title || '').toLowerCase().includes(query)) : notes;

    const notesByFolder = new Map<string, UniLeakNote[]>();
    const rootNotes: UniLeakNote[] = [];
    filteredNotes.forEach(n => {
        if (n.folderId) {
            const list = notesByFolder.get(n.folderId) || [];
            list.push(n);
            notesByFolder.set(n.folderId, list);
        } else {
            rootNotes.push(n);
        }
    });

    return (
        <div className="w-1/2 border-r border-border bg-card flex flex-col h-full min-w-0">
            <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <h2 className="text-sm font-bold text-foreground truncate">Unileaks</h2>
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </div>
                <button onClick={onToggleCollapse} className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Colapsar panel">
                    <ChevronLeft className="w-4 h-4" />
                </button>
            </div>

            {listExpanded ? (
                <div className="border-b border-border shrink-0 flex flex-col">
                    <div className="p-3 pb-2 flex items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar nota por título..."
                                className="w-full bg-muted border border-border rounded-lg pl-8 pr-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        {activeNote && (
                            <button onClick={() => setListExpanded(false)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" title="Colapsar lista">
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="px-3 pb-3 flex items-center gap-2">
                        <select
                            value={newNoteFolderId}
                            onChange={(e) => setNewNoteFolderId(e.target.value)}
                            className="flex-1 min-w-0 bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                            title="Carpeta destino de la nueva nota"
                        >
                            <option value="">Sin carpeta (raíz)</option>
                            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <button onClick={handleCreateFolder} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" title="Nueva carpeta">
                            <Folder className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleNewNote} className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0" title="Nueva nota en la carpeta seleccionada">
                            <Plus className="w-3.5 h-3.5" /> Nota
                        </button>
                    </div>

                    <div className="overflow-y-auto max-h-[40vh] py-2">
                        {!loading && notes.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-4">Este proyecto no tiene notas todavía.</p>
                        )}
                        {!loading && notes.length > 0 && filteredNotes.length === 0 && (
                            <p className="text-xs text-muted-foreground italic text-center py-4">No se encontraron notas para "{searchQuery}".</p>
                        )}
                        {rootNotes.length > 0 && (
                            <NoteGroup title={null} notes={rootNotes} activeNoteId={activeNote?.id || null} onSelect={selectNote} />
                        )}
                        {folders.map(folder => {
                            const list = notesByFolder.get(folder.id);
                            if (!list?.length) return null;
                            return <NoteGroup key={folder.id} title={folder.name} notes={list} activeNoteId={activeNote?.id || null} onSelect={selectNote} />;
                        })}
                    </div>
                </div>
            ) : (
                <div className="border-b border-border shrink-0 flex items-center justify-between px-3 py-2 bg-muted/20">
                    <button onClick={() => setListExpanded(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors min-w-0" title="Buscar / cambiar de nota">
                        <Search className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[220px]">{activeNote?.title || 'Buscar o cambiar de nota'}</span>
                        <ChevronDown className="w-3 h-3 shrink-0" />
                    </button>
                    <button onClick={handleNewNote} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors shrink-0" title="Nueva nota">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0">
                {activeNote ? (
                    <div className="flex flex-col h-full">
                        <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-muted/30">
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleSetVisibility(false, false)} className={cn("p-1.5 rounded-lg transition-colors", !activeNote.isPublic && !activeNote.isInternal ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted")} title="Privada">
                                    <Lock className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleSetVisibility(false, true)} className={cn("p-1.5 rounded-lg transition-colors", activeNote.isInternal && !activeNote.isPublic ? "bg-amber-500/20 text-amber-600" : "text-muted-foreground hover:bg-muted")} title="Equipo del tenant">
                                    <Users className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleSetVisibility(true, false)} className={cn("p-1.5 rounded-lg transition-colors", activeNote.isPublic ? "bg-emerald-500/20 text-emerald-600" : "text-muted-foreground hover:bg-muted")} title="Pública">
                                    <Globe className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                    {autoSaveStatus === 'saving' ? 'Guardando...' : autoSaveStatus === 'saved' ? 'Guardado' : autoSaveStatus === 'dirty' ? 'Sin guardar' : ''}
                                </span>
                                {activeNote.id && (
                                    <button onClick={handleDeleteActiveNote} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar nota">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <UniLeaksEditor
                                note={activeNote}
                                onSaveSuccess={handleSaveSuccess}
                                onDeleteSuccess={handleDeleteSuccess}
                                onAutoSaveStatusChange={setAutoSaveStatus}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-2">
                        <FileText className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">Selecciona una nota de la lista o crea una nueva para este proyecto.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function NoteGroup({ title, notes, activeNoteId, onSelect }: { title: string | null; notes: UniLeakNote[]; activeNoteId: string | null; onSelect: (n: UniLeakNote) => void }) {
    const [expanded, setExpanded] = useState(true);
    return (
        <div className="px-2">
            {title !== null && (
                <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-1.5 px-1.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <Folder className="w-3 h-3 text-primary/70" />
                    <span className="truncate">{title}</span>
                </button>
            )}
            {expanded && notes.map(note => (
                <button
                    key={note.id}
                    onClick={() => onSelect(note)}
                    className={cn(
                        "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5",
                        note.id === activeNoteId ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted",
                        title !== null && "ml-4"
                    )}
                >
                    <FileText className="w-3 h-3 shrink-0 opacity-60" />
                    <span className="truncate flex-1">{note.title || 'Sin título'}</span>
                    {note.isPublic ? <Globe className="w-3 h-3 text-emerald-500 shrink-0" /> : note.isInternal ? <Users className="w-3 h-3 text-amber-500 shrink-0" /> : <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
                </button>
            ))}
        </div>
    );
}
