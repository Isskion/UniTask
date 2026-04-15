import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, query, where, getDocs, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { UniLeakNote, UniLeakFolder } from "@/types";

export async function getProjectNotes(tenantId: string, projectId: string, currentUserId: string, isInternal: boolean = false): Promise<UniLeakNote[]> {
    const q = query(
        collection(db, "unileaks_notes"),
        where("tenantId", "==", tenantId),
        where("projectId", "==", projectId)
    );
    const snap = await getDocs(q);
    const allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() } as UniLeakNote));

    // Filtrar localmente por permisos de lectura:
    // 1. Dueño de la nota siempre ve.
    // 2. Notas públicas siempre visibles.
    // 3. Usuarios internos ven TODO en el proyecto asignado.
    return allNotes.filter(note => note.userId === currentUserId || note.isPublic || isInternal);
}

export async function getNoteById(noteId: string): Promise<UniLeakNote | null> {
    const ref = doc(db, "unileaks_notes", noteId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as UniLeakNote;
}

export async function saveNote(noteData: Partial<UniLeakNote>): Promise<string> {
    if (noteData.id) {
        // Actualizar existente
        const ref = doc(db, "unileaks_notes", noteData.id);
        await updateDoc(ref, { ...noteData, updatedAt: serverTimestamp() });
        return noteData.id;
    } else {
        // Crear nueva
        const ref = await addDoc(collection(db, "unileaks_notes"), {
            ...noteData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return ref.id;
    }
}

export async function deleteNote(noteId: string): Promise<void> {
    const ref = doc(db, "unileaks_notes", noteId);
    await deleteDoc(ref);
}

// --- Folders ---

export async function getProjectFolders(tenantId: string, projectId: string): Promise<UniLeakFolder[]> {
    const q = query(
        collection(db, "unileaks_folders"),
        where("tenantId", "==", tenantId),
        where("projectId", "==", projectId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as UniLeakFolder));
}

export async function saveFolder(folderData: Partial<UniLeakFolder>): Promise<string> {
    if (folderData.id) {
        const ref = doc(db, "unileaks_folders", folderData.id);
        await updateDoc(ref, { ...folderData, updatedAt: serverTimestamp() });
        return folderData.id;
    } else {
        const ref = await addDoc(collection(db, "unileaks_folders"), {
            ...folderData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return ref.id;
    }
}

export async function deleteFolder(folderId: string): Promise<void> {
    const ref = doc(db, "unileaks_folders", folderId);
    await deleteDoc(ref);
}

// --- User Profiles Map (for avatar display) ---

export type NoteOwnerInfo = { displayName: string; photoURL?: string };

export async function getUserProfilesMap(userIds: string[]): Promise<Map<string, NoteOwnerInfo>> {
    const uniqueIds = [...new Set(userIds)].filter(Boolean);
    const map = new Map<string, NoteOwnerInfo>();
    if (uniqueIds.length === 0) return map;

    // Fetch each user doc individually (avoids 'in' query limit of 30)
    const results = await Promise.all(
        uniqueIds.map(uid => getDoc(doc(db, "users", uid)))
    );

    results.forEach(snap => {
        if (snap.exists()) {
            const data = snap.data();
            map.set(snap.id, {
                displayName: data.displayName || "Usuario",
                photoURL: data.photoURL || undefined
            });
        }
    });

    return map;
}
