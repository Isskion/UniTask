import { useState, useRef, useEffect } from "react";
import { Project, UniLeakNote, UniLeakFolder } from "@/types";
import { Plus, Folder, FileText, ChevronRight, ChevronLeft, ChevronDown, Lock, Globe, Users, MoreVertical, Edit2, Trash2, Loader2, BookMarked, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NoteOwnerInfo } from "@/lib/unileaks";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLanguage } from "@/context/LanguageContext";
import UniLeaksSearch from "./UniLeaksSearch";

interface UniLeaksSidebarProps {
    railExpanded: boolean;
    isPinned: boolean;
    onTogglePin: () => void;
    onToggleRail?: () => void;
    projects: Project[];
    activeProjectId: string;
    onProjectChange: (pid: string) => void;
    notes: UniLeakNote[];
    folders: UniLeakFolder[];
    activeNoteId: string | null;
    onNoteSelect: (note: UniLeakNote) => void;
    onNewNote: (folderId: string | null) => void;
    onUpdateNote: (noteId: string, name: string) => void;
    onDuplicateNote: (note: UniLeakNote) => void;
    onDeleteNote: (noteId: string) => void;
    onCreateFolder: (name: string, parentId: string | null) => void;
    onUpdateFolder: (folderId: string, name: string) => void;
    onDeleteFolder: (folderId: string) => void;
    onMoveNote: (noteId: string, folderId: string | null) => void;
    onMoveFolder: (folderId: string, parentId: string | null) => void;
    loading: boolean;
    usersMap?: Map<string, NoteOwnerInfo>;
    currentUserId?: string;
    onSearchToggle?: (isOpen: boolean) => void;
}

type ContextMenuState = {
    visible: boolean;
    x: number;
    y: number;
    targetId: string | null;
    targetType: 'root' | 'folder' | 'note';
};

export default function UniLeaksSidebar({
    railExpanded,
    isPinned,
    onTogglePin,
    projects,
    activeProjectId,
    onProjectChange,
    notes,
    folders,
    activeNoteId,
    onNoteSelect,
    onNewNote,
    onUpdateNote,
    onDuplicateNote,
    onDeleteNote,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    onMoveNote,
    onMoveFolder,
    loading,
    usersMap,
    currentUserId,
    onSearchToggle
}: UniLeaksSidebarProps) {
    const { t } = useLanguage();
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, targetId: null, targetType: 'root' });
    const [isRenaming, setIsRenaming] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const { tenantId } = useAuth();
    const [tenantLogo, setTenantLogo] = useState<string | null>(null);

    // Fetch Tenant Logo
    useEffect(() => {
        let isMounted = true;
        const fetchTenantLogo = async () => {
            if (!tenantId || tenantId === "unknown" || tenantId === "__DENY__") return;
            try {
                const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
                if (isMounted && tenantDoc.exists()) {
                    const data = tenantDoc.data();
                    if (data.logos && data.logos.length > 0) {
                        const principal = data.logos.find((l: any) => l.label?.toLowerCase().includes('principal'));
                        setTenantLogo(principal?.url || data.logos[0].url);
                    } else if (data.logoUrl) {
                        setTenantLogo(data.logoUrl);
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    if (err.code !== 'permission-denied') {
                        console.error("Error fetching tenant logo in UniLeaksSidebar:", err);
                    }
                }
            }
        };
        fetchTenantLogo();
        return () => { isMounted = false; };
    }, [tenantId]);

    // Context Menu Handling
    useEffect(() => {
        const handleClickOutside = () => setContextMenu({ ...contextMenu, visible: false });
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [contextMenu]);

    useEffect(() => {
        if (isRenaming && renameInputRef.current) {
            renameInputRef.current.focus();
        }
    }, [isRenaming]);

    const handleContextMenu = (e: React.MouseEvent, type: 'root' | 'folder' | 'note', id: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            targetId: id,
            targetType: type
        });
    };

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    // Drag & Drop Handlers
    const handleDragStart = (e: React.DragEvent, type: 'note' | 'folder', id: string) => {
        e.dataTransfer.setData("type", type);
        e.dataTransfer.setData("id", id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolder(folderId);
    };

    const handleDragLeave = () => {
        setDragOverFolder(null);
    };

    const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolder(null);

        const type = e.dataTransfer.getData("type") as 'note' | 'folder';
        const id = e.dataTransfer.getData("id");

        if (!id) return;

        if (type === 'note') {
            onMoveNote(id, targetFolderId);
        } else if (type === 'folder') {
            // No permitir mover una carpeta a sí misma
            if (id === targetFolderId) return;
            onMoveFolder(id, targetFolderId);
        }
    };

    const handleRenameSubmit = (folderId: string) => {
        if (renameValue.trim() && folders.find(f => f.id === folderId)?.name !== renameValue) {
            onUpdateFolder(folderId, renameValue.trim());
        }
        setIsRenaming(null);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent, folderId: string) => {
        if (e.key === "Enter") handleRenameSubmit(folderId);
        if (e.key === "Escape") setIsRenaming(null);
    };

    const startRename = (id: string, currentName: string) => {
        setRenameValue(currentName);
        setIsRenaming(id);
        setContextMenu({ ...contextMenu, visible: false });
    };

    const handleRenameNoteSubmit = (noteId: string) => {
        if (renameValue.trim() && notes.find(n => n.id === noteId)?.title !== renameValue) {
            onUpdateNote(noteId, renameValue.trim());
        }
        setIsRenaming(null);
    };

    const handleRenameNoteKeyDown = (e: React.KeyboardEvent, noteId: string) => {
        if (e.key === "Enter") handleRenameNoteSubmit(noteId);
        if (e.key === "Escape") setIsRenaming(null);
    };

    // Visibility logic: In this version, we want to see all folders even if they are empty
    const isFolderVisible = (folderId: string): boolean => {
        return true;
    };

    // Recursive rendering
    const renderTree = (parentId: string | null = null, depth: number = 0) => {
        const renderFolders = folders
            .filter(f => (f.parentId || null) == (parentId || null))
            .filter(f => isFolderVisible(f.id))
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        const renderNotes = notes
            .filter(n => (n.folderId || null) == (parentId || null))
            .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

        if (renderFolders.length === 0 && renderNotes.length === 0 && depth > 0) {
            return (
                <div
                    onDragOver={(e) => handleDragOver(e, parentId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, parentId)}
                    className={cn(
                        "text-xs text-muted-foreground italic py-1 flex items-center gap-2 relative z-10 transition-colors",
                        dragOverFolder === parentId && "bg-primary/20 rounded"
                    )}
                    style={{ paddingLeft: `${depth * 32 + 12}px` }}
                >
                    <div className="w-5 h-5 shrink-0" />
                    <span>Carpeta vacía</span>
                </div>
            );
        }

        // Combine and sort: notes first, then folders
        const combined = [
            ...renderNotes.map(n => ({ ...n, type: 'note' as const })),
            ...renderFolders.map(f => ({ ...f, type: 'folder' as const }))
        ];

        return (
            <div className="flex flex-col">
                {combined.map(item => {
                    if (item.type === 'folder') {
                        const folder = item as UniLeakFolder;
                        const isDraggingOver = dragOverFolder === folder.id;
                        return (
                            <div key={`folder-${folder.id}`} className="flex flex-col w-full">
                                <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                                    onDragOver={(e) => handleDragOver(e, folder.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, folder.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-lg cursor-pointer group text-sm transition-colors relative z-10 min-w-0",
                                        isRenaming === folder.id && "bg-muted",
                                        isDraggingOver && "bg-primary/30 scale-[1.02] shadow-sm ring-2 ring-primary/20"
                                    )}
                                    style={{ paddingLeft: `${depth * 32 + 12}px` }}
                                    onClick={() => toggleFolder(folder.id)}
                                    onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                                >
                                    <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5" onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}>
                                        {expandedFolders.has(folder.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    <Folder className="w-4 h-4 text-primary/70 shrink-0" />
                                    {isRenaming === folder.id ? (
                                        <input
                                            ref={renameInputRef}
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={() => handleRenameSubmit(folder.id)}
                                            onKeyDown={(e) => handleRenameKeyDown(e, folder.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 bg-background border border-primary px-2 py-0.5 rounded text-foreground text-xs outline-none focus:ring-1 focus:ring-primary w-full"
                                        />
                                    ) : (
                                        <span className="text-foreground font-medium flex-1 select-none whitespace-nowrap leading-tight" title={folder.name}>{folder.name}</span>
                                    )}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center shrink-0 bg-background/95 backdrop-blur-sm px-1 py-0.5 rounded-md shadow-sm border border-border/50">
                                        <div className="mr-1 h-5 flex items-center">
                                            <UniLeaksSearch scope="folder" contextId={folder.id} notesToSearch={notes} onResultClick={onNoteSelect} onToggleOpen={onSearchToggle} />
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onNewNote(folder.id);
                                                setExpandedFolders(prev => new Set(prev).add(folder.id));
                                            }}
                                            className="p-1 hover:bg-muted text-muted-foreground hover:text-primary rounded transition-colors"
                                            title="Nueva Nota aquí"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const name = prompt("Nombre de la subcarpeta:");
                                                if (name) {
                                                    onCreateFolder(name, folder.id);
                                                    setExpandedFolders(prev => new Set(prev).add(folder.id));
                                                }
                                            }}
                                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                            title="Nueva Subcarpeta"
                                        >
                                            <Folder className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleContextMenu(e, 'folder', folder.id); }}
                                            className="p-1 hover:bg-muted text-muted-foreground rounded"
                                            title="Opciones"
                                        >
                                            <MoreVertical className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                {expandedFolders.has(folder.id) && (
                                    <div className="flex flex-col mt-0.5 relative">
                                        <div
                                            className="absolute top-0 bottom-0 w-px bg-border pointer-events-none z-0"
                                            style={{ left: `${depth * 32 + 22}px` }}
                                        />
                                        {renderTree(folder.id, depth + 1)}
                                    </div>
                                )}
                            </div>
                        );
                    } else {
                        const note = item as UniLeakNote;
                        const isActive = note.id === activeNoteId;
                        return (
                            <div
                                key={`note-${note.id || 'new'}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, 'note', note.id)}
                                onClick={() => onNoteSelect(note)}
                                onContextMenu={(e) => handleContextMenu(e, 'note', note.id)}
                                className={cn(
                                    "flex flex-col gap-1 py-1.5 pr-2 rounded-lg cursor-pointer transition-all group border relative z-10",
                                    isActive ? "bg-primary/10 border-primary/20" : "hover:bg-muted/50 border-transparent text-muted-foreground hover:text-foreground",
                                    isRenaming === note.id && "bg-muted"
                                )}
                                style={{ paddingLeft: `${depth * 32 + 12}px` }}
                            >
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div> {/* Spacer matching chevron size */}
                                        {/* Owner Avatar for public notes from other users */}
                                        {note.isPublic && currentUserId && note.userId !== currentUserId && usersMap?.has(note.userId) && (() => {
                                            const owner = usersMap.get(note.userId)!;
                                            return (
                                                <span title={`Compartido por ${owner.displayName}`} className="shrink-0">
                                                    {owner.photoURL ? (
                                                        <img
                                                            src={owner.photoURL}
                                                            alt={owner.displayName}
                                                            className="w-5 h-5 rounded-full object-cover border border-border"
                                                        />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold border border-primary/30">
                                                            {owner.displayName.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </span>
                                            );
                                        })()}
                                        <FileText className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />

                                        {isRenaming === note.id ? (
                                            <input
                                                ref={renameInputRef}
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={() => handleRenameNoteSubmit(note.id)}
                                                onKeyDown={(e) => handleRenameNoteKeyDown(e, note.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex-1 bg-background border border-primary px-2 py-0.5 rounded text-foreground text-xs outline-none focus:ring-1 focus:ring-primary w-full"
                                            />
                                        ) : (
                                            <span className={cn("text-sm select-none flex-1 whitespace-nowrap leading-tight", isActive && "text-primary font-medium")} title={note.title || "Nueva Nota..."}>
                                                {note.title || "Nueva Nota..."}
                                            </span>
                                        )}
                                    </div>
                                    {!isRenaming && (
                                        note.isPublic ? (
                                            <span title={t('unileaks.visibility.public')}><Globe className="w-3 h-3 text-emerald-500 shrink-0 opacity-70" /></span>
                                        ) : note.isInternal ? (
                                            <span title={t('unileaks.visibility.internal')}><Users className="w-3 h-3 text-amber-500 shrink-0 opacity-70" /></span>
                                        ) : (
                                            <span title={t('unileaks.visibility.private')}><Lock className="w-3 h-3 text-muted-foreground/60 shrink-0" /></span>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    }
                })}
            </div>
        );
    };

    return (
        <div 
            className={cn(
                "border-r border-border bg-card flex flex-col h-full shrink-0 relative select-none transition-all duration-300",
                railExpanded ? "w-fit min-w-[260px] max-w-[500px]" : "w-[52px] items-center"
            )} 
            ref={sidebarRef}
        >
            {!railExpanded ? (
                <div className="flex flex-col items-center py-4 gap-4 w-full">
                    <button 
                        className="p-2 hover:bg-muted rounded-lg transition-colors group" 
                        title="Fijar Explorador"
                        onClick={onTogglePin}
                    >
                        <Folder className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                    </button>
                    <div className="w-6 h-px bg-border/60" />
                    <button 
                        className="p-2 hover:bg-primary/10 rounded-lg transition-colors group" 
                        onClick={() => onNewNote(null)} 
                        title="Nueva Nota Raíz"
                    >
                        <Plus className="w-5 h-5 text-primary" />
                    </button>
                    <button 
                        className="p-2 hover:bg-muted rounded-lg transition-colors group mt-2" 
                        onClick={onTogglePin} 
                        title="Fijar Explorador"
                    >
                        <BookMarked className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                    </button>
                </div>
            ) : (
                <>
                    {/* Project Selector */}
                    <div className="p-4 border-b border-border bg-background z-10 shrink-0">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Folder className="w-3 h-3" />
                            Proyecto
                        </label>
                        <div className="relative">
                            <select
                                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground appearance-none focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                                value={activeProjectId}
                                onChange={(e) => onProjectChange(e.target.value)}
                            >
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

            {/* Header Toolbar */}
            <div className="p-4 flex flex-col gap-3 shrink-0 border-b border-border/40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {tenantLogo ? (
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm shrink-0 border border-border">
                                <img src={tenantLogo} alt="Tenant Logo" className="max-w-full max-h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <FileText className="w-4 h-4 text-primary" />
                            </div>
                        )}
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-tight">Base de<br />Conocimiento</span>
                    </div>
                    <button onClick={onTogglePin} className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors" title={isPinned ? "Desfijar explorador" : "Fijar explorador"}>
                        <Pin className={cn("w-5 h-5 transition-transform", !isPinned && "-rotate-45")} />
                    </button>
                </div>
                <div className="flex items-center justify-between w-full mt-1">
                    <div className="flex-1 min-w-0 h-8 flex items-center">
                        <UniLeaksSearch scope="global" contextId={null} notesToSearch={notes} onResultClick={onNoteSelect} onToggleOpen={onSearchToggle} />
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                        <button
                            onClick={() => {
                                const name = prompt("Nombre de la nueva carpeta:");
                                if (name) onCreateFolder(name, null);
                            }}
                            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors bg-muted/30 border border-border/50"
                            title="Nueva Carpeta Raíz"
                        >
                            <Folder className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onNewNote(null)}
                            className="p-1.5 hover:bg-primary/20 text-muted-foreground hover:text-primary rounded-lg transition-colors bg-primary/10 border border-primary/20"
                            title="Nueva Nota Raíz"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tree Content */}
            <div
                className="flex-1 overflow-auto w-max min-w-full px-4 pt-3 pb-8 relative group/sidebar-content"
                onDragOver={(e) => handleDragOver(e, null)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
                onContextMenu={(e) => {
                    if (e.target === e.currentTarget) handleContextMenu(e, 'root', null);
                }}
            >
                {/* 
                    Dynamic Frame: This replaces the previous absolute inset-0 div.
                    It wraps the entire list and grows with it.
                */}
                <div 
                    className={cn(
                        "h-fit w-max min-w-full rounded-xl border-2 transition-all duration-200 p-2 pb-6 space-y-1 relative",
                        dragOverFolder === null 
                            ? "bg-primary/10 border-primary/40 ring-4 ring-primary/10" 
                            : "bg-primary/5 border-primary/20",
                        loading && "border-transparent bg-transparent"
                    )}
                >
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
                            <span>Cargando conocimiento...</span>
                        </div>
                    ) : folders.length === 0 && notes.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-xs italic flex flex-col items-center gap-3">
                            <BookMarked className="w-8 h-8 opacity-20" />
                            <div className="max-w-[12rem]">Este proyecto no tiene contenido aún. Comienza creando una nota o carpeta.</div>
                        </div>
                    ) : (
                        renderTree(null, 0)
                    )}
                </div>
            </div>
            </>
            )}

            {/* Context Menu Overlay */}
            {contextMenu.visible && (
                <div
                    className="fixed z-50 bg-popover border border-border rounded-lg shadow-2xl py-1 min-w-[160px] text-sm overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing immediately when clicking inside
                >
                    {/* Root level options */}
                    {contextMenu.targetType === 'root' && (
                        <>
                            <button className="w-full text-left px-4 py-2 hover:bg-muted text-popover-foreground flex items-center gap-2" onClick={() => {
                                const name = prompt("Nombre de la nueva carpeta:");
                                if (name) onCreateFolder(name, null);
                                setContextMenu({ ...contextMenu, visible: false });
                            }}>
                                <Folder className="w-4 h-4" /> Nueva Carpeta
                            </button>
                            <button className="w-full text-left px-4 py-2 hover:bg-muted text-popover-foreground flex items-center gap-2" onClick={() => {
                                onNewNote(null);
                                setContextMenu({ ...contextMenu, visible: false });
                            }}>
                                <FileText className="w-4 h-4" /> Nueva Nota
                            </button>
                        </>
                    )}

                    {/* Folder level options */}
                    {contextMenu.targetType === 'folder' && (
                        <>
                            <button className="w-full text-left px-4 py-2 hover:bg-muted text-primary flex items-center gap-2" onClick={() => {
                                onNewNote(contextMenu.targetId);
                                if (contextMenu.targetId) setExpandedFolders(prev => new Set(prev).add(contextMenu.targetId!));
                                setContextMenu({ ...contextMenu, visible: false });
                            }}>
                                <FileText className="w-4 h-4" /> Nueva Nota
                            </button>
                            <button className="w-full text-left px-4 py-2 hover:bg-muted text-popover-foreground flex items-center gap-2" onClick={() => {
                                const name = prompt("Nombre de la subcarpeta:");
                                if (name) onCreateFolder(name, contextMenu.targetId);
                                if (contextMenu.targetId) setExpandedFolders(prev => new Set(prev).add(contextMenu.targetId!));
                                setContextMenu({ ...contextMenu, visible: false });
                            }}>
                                <Folder className="w-4 h-4" /> Nueva Subcarpeta
                            </button>
                            <div className="border-t border-border my-1" />
                            <button className="w-full text-left px-4 py-2 hover:bg-muted text-popover-foreground flex items-center gap-2" onClick={() => {
                                const folder = folders.find(f => f.id === contextMenu.targetId);
                                if (folder && contextMenu.targetId) startRename(contextMenu.targetId, folder.name);
                            }}>
                                <Edit2 className="w-4 h-4" /> Renombrar
                            </button>
                            <button className="w-full text-left px-4 py-2 hover:bg-muted text-popover-foreground flex items-center gap-2" onClick={() => {
                                const folderId = contextMenu.targetId;
                                if (!folderId) return;
                                // Simple list move for now as per user request "acción para mover de sitio"
                                const otherFolders = folders.filter(f => f.id !== folderId);
                                const options = ["Raíz", ...otherFolders.map(f => f.name)];
                                const choice = prompt(`Mover a:\n${options.map((o, i) => `${i}: ${o}`).join('\n')}`);
                                if (choice !== null) {
                                    const idx = parseInt(choice);
                                    if (idx === 0) onMoveFolder(folderId, null);
                                    else if (idx > 0 && idx < options.length) onMoveFolder(folderId, otherFolders[idx - 1].id);
                                }
                                setContextMenu({ ...contextMenu, visible: false });
                            }}>
                                <Plus className="w-4 h-4 rotate-45" /> Mover a...
                            </button>
                            <button className="w-full text-left px-4 py-2 hover:bg-destructive/20 text-destructive flex items-center gap-2" onClick={() => {
                                if (contextMenu.targetId) {
                                    onDeleteFolder(contextMenu.targetId);
                                }
                                setContextMenu({ ...contextMenu, visible: false });
                            }}>
                                <Trash2 className="w-4 h-4" /> Eliminar Carpeta
                            </button>
                        </>
                    )}

                    {/* Note level options */}
                    {contextMenu.targetType === 'note' && (
                        <>
                            <button className="w-full text-left px-4 py-2 hover:bg-muted text-popover-foreground flex items-center gap-2" onClick={() => {
                                const noteToRename = notes.find(n => n.id === contextMenu.targetId);
                                if (noteToRename && contextMenu.targetId) {
                                    startRename(contextMenu.targetId, noteToRename.title || "Nueva Nota...");
                                }
                            }}>
                                <Edit2 className="w-4 h-4" /> Renombrar
                            </button>
                            <button className="w-full text-left px-4 py-2 hover:bg-muted text-popover-foreground flex items-center gap-2" onClick={() => {
                                const noteId = contextMenu.targetId;
                                if (!noteId) return;
                                const options = ["Raíz", ...folders.map(f => f.name)];
                                const choice = prompt(`Mover a:\n${options.map((o, i) => `${i}: ${o}`).join('\n')}`);
                                if (choice !== null) {
                                    const idx = parseInt(choice);
                                    if (idx === 0) onMoveNote(noteId, null);
                                    else if (idx > 0 && idx < options.length) onMoveNote(noteId, folders[idx - 1].id);
                                }
                                setContextMenu({ ...contextMenu, visible: false });
                            }}>
                                <Plus className="w-4 h-4 rotate-45" /> Mover a...
                            </button>
                            <button className="w-full text-left px-4 py-2 hover:bg-muted text-popover-foreground flex items-center gap-2" onClick={() => {
                                const noteToDup = notes.find(n => n.id === contextMenu.targetId);
                                if (noteToDup) onDuplicateNote(noteToDup);
                                setContextMenu({ ...contextMenu, visible: false });
                            }}>
                                <FileText className="w-4 h-4" /> Duplicar
                            </button>
                            <div className="border-t border-border my-1" />
                            <button className="w-full text-left px-4 py-2 hover:bg-destructive/20 text-destructive flex items-center gap-2" onClick={() => {
                                if (contextMenu.targetId) {
                                    if (confirm("¿Estás seguro de que deseas eliminar esta nota permanentemente?")) {
                                        onDeleteNote(contextMenu.targetId);
                                    }
                                }
                                setContextMenu({ ...contextMenu, visible: false });
                            }}>
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
