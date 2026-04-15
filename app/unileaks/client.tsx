"use client";

import { useState, useEffect, Suspense } from "react";
import UniLeaksSidebar from "@/components/unileaks/UniLeaksSidebar";
import UniLeaksEditor from "@/components/unileaks/UniLeaksEditor";
import { Project, UniLeakNote, UniLeakFolder } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getActiveProjects, filterBySAMScope } from "@/lib/projects";
import { useAccessScopes } from "@/hooks/useAccessScopes";
import { getProjectNotes, getProjectFolders, saveFolder, deleteFolder, deleteNote, saveNote, getNoteById, getUserProfilesMap, NoteOwnerInfo } from "@/lib/unileaks";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";

function UniLeaksContent() {
    const searchParams = useSearchParams();
    const queryProjectId = searchParams.get("projectId");
    const queryNoteId = searchParams.get("noteId");
    const { user, tenantId, userRole, userProfile } = useAuth();
    const { can } = usePermissions();
    const accessScopes = useAccessScopes();
    const { showToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string>("");

    const [notes, setNotes] = useState<UniLeakNote[]>([]);
    const [folders, setFolders] = useState<UniLeakFolder[]>([]);
    const [activeNote, setActiveNote] = useState<UniLeakNote | null>(null);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [usersMap, setUsersMap] = useState<Map<string, NoteOwnerInfo>>(new Map());

    // Evaluate create permission outside effect to avoid unstable function reference loops
    const canCreateProject = can('create', 'project');

    // Load Projects
    useEffect(() => {
        if (!user || !tenantId || !userProfile) {
            // If auth context is loaded but missing profile/tenant, we must still stop the global loader
            if (loadingProjects) setLoadingProjects(false);
            return;
        }
        const loadProjects = async () => {
            console.log("🚀 [UniLeaks] Starting projects load. User:", user?.uid, "Tenant:", tenantId);
            try {
                const targetTenant = tenantId || "1";
                const projs = await getActiveProjects(targetTenant);
                console.log("📦 [UniLeaks] Raw projects fetched:", projs.length);

                // Filter: superadmin/app_admin see all, others see only assigned projects
                const filteredProjs = filterBySAMScope(
                    projs.filter(p => {
                        if (userRole === 'superadmin' || userRole === 'app_admin') return true;
                        if (!userProfile?.assignedProjectIds) {
                            console.warn("⚠️ [UniLeaks] User has no assignedProjectIds in profile.");
                            return false;
                        }
                        const isAssigned = userProfile.assignedProjectIds.includes(p.id);
                        return isAssigned;
                    }),
                    accessScopes
                );
                console.log("🎯 [UniLeaks] Filtered projects:", filteredProjs.length);

                // Prevents infinite re-renders if the array content hasn't changed (since object references differ)
                setProjects(prev => {
                    if (JSON.stringify(prev.map(p => p.id)) === JSON.stringify(filteredProjs.map(p => p.id))) {
                        return prev;
                    }
                    return filteredProjs;
                });

                // Set initial active project only once
                if (!activeProjectId) {
                    if (queryProjectId && filteredProjs.some(p => p.id === queryProjectId)) {
                        setActiveProjectId(queryProjectId);
                    } else if (filteredProjs.length > 0) {
                        setActiveProjectId(filteredProjs[0].id);
                    }
                }
            } catch (e) {
                console.error("❌ [UniLeaks] Error loading projects", e);
            } finally {
                setLoadingProjects(false);
            }
        };
        loadProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, tenantId, userProfile?.assignedProjectIds?.join(','), userRole, canCreateProject]);

    // Load Notes and Folders
    useEffect(() => {
        if (!user || !tenantId || !activeProjectId) return;
        const loadData = async () => {
            setLoadingNotes(true);
            try {
                const [notesData, foldersData] = await Promise.all([
                    getProjectNotes(tenantId, activeProjectId, user.uid),
                    getProjectFolders(tenantId, activeProjectId)
                ]);

                // Sort notes by updated latest
                notesData.sort((a, b) => b.updatedAt?.toMillis() - a.updatedAt?.toMillis());
                setNotes(notesData);

                // Fetch user profiles for avatar display
                const otherUserIds = notesData
                    .filter(n => n.isPublic && n.userId !== user.uid)
                    .map(n => n.userId);
                if (otherUserIds.length > 0) {
                    const profiles = await getUserProfilesMap(otherUserIds);
                    setUsersMap(profiles);
                }
                setFolders(foldersData);

                // Si la nota activa no pertenece al nuevo proyecto, resetear
                if (activeNote && activeNote.projectId !== activeProjectId) {
                    setActiveNote(null);
                }
            } catch (error) {
                console.error("Error loading notes and folders", error);
            } finally {
                setLoadingNotes(false);
            }
        };
        loadData();
    }, [activeProjectId, user, tenantId]);

    // Handle initialNoteId for deep linking
    useEffect(() => {
        if (!user || !tenantId || !queryNoteId) return;

        const handleDeepLink = async () => {
            try {
                const note = await getNoteById(queryNoteId);
                if (note) {
                    // Si ya está cargada en el proyecto activo, simplemente seleccionarla
                    if (note.projectId === activeProjectId) {
                        setActiveNote(note);
                    } else {
                        // Cambiar al proyecto de la nota
                        setActiveProjectId(note.projectId);
                        setActiveNote(note);
                    }
                }
            } catch (error) {
                console.error("Error handling deep link", error);
            }
        };

        handleDeepLink();
    }, [user, tenantId, queryNoteId, activeProjectId]);

    const handleNoteSelect = (note: UniLeakNote) => {
        setActiveNote(note);
    };

    const handleNewNote = (folderId: string | null = null) => {
        if (!user || !tenantId || !activeProjectId) return;
        const newNote: UniLeakNote = {
            id: "", // Empty ID means unsaved new note
            title: "",
            content: "",
            projectId: activeProjectId,
            tenantId: tenantId,
            userId: user.uid,
            isPublic: false,
            folderId: folderId,
            createdAt: null,
            updatedAt: null,
        };
        setActiveNote(newNote);
    };

    const handleNoteSaveSuccess = (savedNote: UniLeakNote) => {
        // Update local list
        setNotes((prevNotes) => {
            const exists = prevNotes.some(n => n.id === savedNote.id);
            if (exists) {
                return prevNotes.map(n => n.id === savedNote.id ? savedNote : n).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            } else {
                return [savedNote, ...prevNotes];
            }
        });
        setActiveNote(savedNote);
    };

    const handleNoteDelete = (noteId: string) => {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        if (activeNote?.id === noteId) {
            setActiveNote(null);
        }
    };

    const handleUpdateNote = async (noteId: string, title: string) => {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        try {
            await saveNote({ id: noteId, title });
            setNotes(prev => prev.map(n => n.id === noteId ? { ...n, title } : n));
            if (activeNote?.id === noteId) {
                setActiveNote(prev => prev ? { ...prev, title } : null);
            }
            showToast("Nota Actualizada", "El nombre de la nota se ha guardado", "success");
        } catch (error) {
            console.error("Error updating note name:", error);
            showToast("Error", "No se pudo actualizar el nombre", "error");
        }
    };

    const handleDuplicateNote = async (noteToDuplicate: UniLeakNote) => {
        if (!user || !tenantId || !activeProjectId) return;
        try {
            const newTitle = `${noteToDuplicate.title || "Nueva Nota"} (Copia)`;
            const duplicatedNoteData: Partial<UniLeakNote> = {
                title: newTitle,
                content: noteToDuplicate.content,
                projectId: activeProjectId,
                tenantId: tenantId,
                userId: user.uid,
                isPublic: noteToDuplicate.isPublic,
                folderId: noteToDuplicate.folderId
            };

            // Delete id to force creation of a new document
            delete duplicatedNoteData.id;

            const savedId = await saveNote(duplicatedNoteData);

            const fullDuplicatedNote: UniLeakNote = {
                ...duplicatedNoteData,
                id: savedId,
                createdAt: { toMillis: () => Date.now() } as any,
                updatedAt: { toMillis: () => Date.now() } as any
            } as UniLeakNote;

            setNotes(prev => [fullDuplicatedNote, ...prev].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)));
            setActiveNote(fullDuplicatedNote);
            showToast("Nota Duplicada", "La nota se ha duplicado con éxito", "success");
        } catch (error) {
            console.error("Error duplicating note:", error);
            showToast("Error", "No se pudo duplicar la nota", "error");
        }
    };

    const executeNoteDelete = async (noteId: string) => {
        try {
            await deleteNote(noteId);
            handleNoteDelete(noteId);
            showToast("Nota Eliminada", "La nota se ha eliminado correctamente", "success");
        } catch (error) {
            console.error("Error eliminando nota:", error);
            showToast("Error", "Ocurrió un error al eliminar la nota", "error");
        }
    };

    // --- Folder Operations ---
    const handleCreateFolder = async (name: string, parentId: string | null = null) => {
        if (!user || !tenantId || !activeProjectId) return;
        try {
            const newFolder: Partial<UniLeakFolder> = {
                name,
                parentId,
                projectId: activeProjectId,
                tenantId
            };
            const id = await saveFolder(newFolder);
            setFolders(prev => [...prev, { ...newFolder, id, createdAt: { toMillis: () => Date.now() }, updatedAt: { toMillis: () => Date.now() } } as UniLeakFolder]);
            showToast("Carpeta Creada", "La carpeta se ha creado exitosamente", "success");
        } catch (error) {
            console.error("Error creating folder", error);
            showToast("Error", "No se pudo crear la carpeta", "error");
        }
    };

    const handleUpdateFolder = async (folderId: string, name: string) => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return;
        try {
            await saveFolder({ id: folderId, name });
            setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name } : f));
            showToast("Carpeta Actualizada", "El nombre se ha guardado", "success");
        } catch (error) {
            console.error("Error updating folder", error);
            showToast("Error", "No se pudo actualizar la carpeta", "error");
        }
    };

    const handleMoveNote = async (noteId: string, folderId: string | null) => {
        try {
            await saveNote({ id: noteId, folderId });
            setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId } : n));
            showToast("Nota Movida", "La nota se ha movido correctamente", "success");
        } catch (error) {
            console.error("Error moving note", error);
            showToast("Error", "No se pudo mover la nota", "error");
        }
    };

    const handleMoveFolder = async (folderId: string, parentId: string | null) => {
        // Evitar mover una carpeta dentro de sí misma o de sus hijos
        if (folderId === parentId) return;

        try {
            await saveFolder({ id: folderId, parentId });
            setFolders(prev => prev.map(f => f.id === folderId ? { ...f, parentId } : f));
            showToast("Carpeta Movida", "La carpeta se ha movido correctamente", "success");
        } catch (error) {
            console.error("Error moving folder", error);
            showToast("Error", "No se pudo mover la carpeta", "error");
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return;

        const hasNotes = notes.some(n => n.folderId === folderId);
        const hasSubfolders = folders.some(f => f.parentId === folderId);

        if (hasNotes || hasSubfolders) {
            const confirmDelete = confirm("La carpeta no está vacía. ¿Deseas eliminarla junto con TODO su contenido (notas y subcarpetas)? Esta acción no se puede deshacer.");
            if (!confirmDelete) return;

            // Función recursiva local para obtener todos los IDs de carpetas descendientes
            const getAllDescendantFolderIds = (id: string): string[] => {
                const children = folders.filter(f => f.parentId === id);
                return [id, ...children.flatMap(c => getAllDescendantFolderIds(c.id))];
            };

            const folderIdsToDelete = getAllDescendantFolderIds(folderId);

            try {
                // Eliminar todas las notas de todas esas carpetas
                const notesToDelete = notes.filter(n => n.folderId && folderIdsToDelete.includes(n.folderId));
                await Promise.all(notesToDelete.map(n => deleteNote(n.id)));

                // Eliminar todas las carpetas
                await Promise.all(folderIdsToDelete.map(id => deleteFolder(id)));

                setNotes(prev => prev.filter(n => !n.folderId || !folderIdsToDelete.includes(n.folderId)));
                setFolders(prev => prev.filter(f => !folderIdsToDelete.includes(f.id)));

                showToast("Carpeta y Contenido Eliminados", "Se ha eliminado la carpeta y todo su contenido", "success");
            } catch (error) {
                console.error("Error in recursive deletion", error);
                showToast("Error", "Hubo un error al intentar eliminar el contenido", "error");
            }
            return;
        }

        try {
            await deleteFolder(folderId);
            setFolders(prev => prev.filter(f => f.id !== folderId));
            showToast("Carpeta Eliminada", "La carpeta ha sido eliminada", "success");
        } catch (error) {
            console.error("Error deleting folder", error);
            showToast("Error", "No se pudo eliminar la carpeta", "error");
        }
    };


    if (loadingProjects) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-background text-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground selection:bg-primary/30 selection:text-primary print:h-auto print:overflow-visible">
            <div className="print:hidden h-full">
                <UniLeaksSidebar
                    projects={projects}
                    activeProjectId={activeProjectId}
                    onProjectChange={setActiveProjectId}
                    notes={notes}
                    folders={folders}
                    activeNoteId={activeNote?.id || null}
                    onNoteSelect={handleNoteSelect}
                    onNewNote={(folderId) => handleNewNote(folderId)}
                    onUpdateNote={handleUpdateNote}
                    onDuplicateNote={handleDuplicateNote}
                    onDeleteNote={executeNoteDelete}
                    onCreateFolder={handleCreateFolder}
                    onUpdateFolder={handleUpdateFolder}
                    onDeleteFolder={handleDeleteFolder}
                    onMoveNote={handleMoveNote}
                    onMoveFolder={handleMoveFolder}
                    loading={loadingNotes}
                    usersMap={usersMap}
                    currentUserId={user?.uid || ""}
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {activeNote ? (
                    <UniLeaksEditor
                        note={activeNote}
                        onSaveSuccess={handleNoteSaveSuccess}
                        onDeleteSuccess={handleNoteDelete}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <p>Selecciona una nota para editarla o crea una nueva.</p>
                        <button
                            onClick={() => handleNewNote(null)}
                            disabled={!activeProjectId}
                            className="mt-4 px-4 py-2 border border-border rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
                        >
                            Crear Nueva Nota
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function UniLeaksPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen w-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <UniLeaksContent />
        </Suspense>
    );
}
