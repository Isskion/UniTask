import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import { UniVisioSession, TableRow } from '@/types';

const SESSIONS_COLLECTION = (projectId: string) => `projects/${projectId}/univisio_sessions`;

/**
 * Creates a new UniVisio session in the specified project.
 */
export async function saveUniVisioSession(
    projectId: string,
    data: Omit<UniVisioSession, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const collRef = collection(db, SESSIONS_COLLECTION(projectId));
    const newDocRef = doc(collRef);
    
    const { cycles, tableRows, ...rest } = data;
    
    await setDoc(newDocRef, {
        ...rest,
        cycles: JSON.stringify(cycles || []),
        tableRows: JSON.stringify(tableRows || []),
        id: newDocRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    
    return newDocRef.id;
}

/**
 * Updates an existing UniVisio session.
 */
export async function updateUniVisioSession(
    projectId: string,
    sessionId: string,
    data: Partial<UniVisioSession>
): Promise<void> {
    const docRef = doc(db, SESSIONS_COLLECTION(projectId), sessionId);
    
    const { cycles, tableRows, ...rest } = data;
    const docData: any = {
        ...rest,
        updatedAt: serverTimestamp()
    };
    
    if (cycles !== undefined) {
        docData.cycles = JSON.stringify(cycles);
    }
    if (tableRows !== undefined) {
        docData.tableRows = JSON.stringify(tableRows);
    }
    
    await setDoc(docRef, docData, { merge: true });
}

/**
 * Retrieves all UniVisio sessions for a specific project.
 */
export async function getProjectSessions(projectId: string): Promise<UniVisioSession[]> {
    const collRef = collection(db, SESSIONS_COLLECTION(projectId));
    const q = query(collRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
        const data = doc.data();
        let parsedCycles: string[][] = [];
        if (typeof data.cycles === 'string') {
            try {
                parsedCycles = JSON.parse(data.cycles);
            } catch (e) {
                console.error("Error parsing cycles from Firestore:", e);
            }
        } else if (Array.isArray(data.cycles)) {
            parsedCycles = data.cycles;
        }

        let parsedTableRows: TableRow[] = [];
        if (typeof data.tableRows === 'string') {
            try {
                parsedTableRows = JSON.parse(data.tableRows);
            } catch (e) {
                console.error("Error parsing tableRows from Firestore:", e);
            }
        } else if (Array.isArray(data.tableRows)) {
            parsedTableRows = data.tableRows;
        }
        
        return {
            ...data,
            id: doc.id,
            cycles: parsedCycles,
            tableRows: parsedTableRows,
            // Convert Timestamps to ISO strings for local state
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as UniVisioSession;
    });
}

/**
 * Deletes a UniVisio session.
 */
export async function deleteUniVisioSession(projectId: string, sessionId: string): Promise<void> {
    const docRef = doc(db, SESSIONS_COLLECTION(projectId), sessionId);
    await deleteDoc(docRef);
}
