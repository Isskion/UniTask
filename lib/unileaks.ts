import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, query, where, getDocs, getDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { UniLeakNote, UniLeakFolder } from "@/types";

export async function getProjectNotes(tenantId: string, projectId: string, currentUserId: string): Promise<UniLeakNote[]> {
    const q = query(
        collection(db, "unileaks_notes"),
        where("tenantId", "==", tenantId),
        where("projectId", "==", projectId)
    );
    const snap = await getDocs(q);
    const allNotes = snap.docs.map(d => ({ id: d.id, ...d.data() } as UniLeakNote));

    // Filtrar localmente por permisos de lectura: o es pública, o es del mismo usuario.
    return allNotes.filter(note => note.userId === currentUserId || note.isPublic);
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
