import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { TenantWord } from "@/types";

/**
 * Fetch all authorized words for a specific tenant.
 */
export async function getTenantWords(tenantId: string): Promise<TenantWord[]> {
    const q = query(
        collection(db, "tenant_dictionary"),
        where("tenantId", "==", tenantId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TenantWord));
}

/**
 * Add a word to the tenant's authorized dictionary.
 * Prevents duplicates by checking existing words.
 */
export async function addTenantWord(tenantId: string, word: string, userId: string): Promise<string | null> {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return null;

    // Check for duplicates
    const q = query(
        collection(db, "tenant_dictionary"),
        where("tenantId", "==", tenantId),
        where("word", "==", cleanWord)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
        return snap.docs[0].id;
    }

    const docRef = await addDoc(collection(db, "tenant_dictionary"), {
        tenantId,
        word: cleanWord,
        addedBy: userId,
        createdAt: serverTimestamp()
    });

    return docRef.id;
}

/**
 * Remove a word from the dictionary.
 */
export async function deleteTenantWord(wordId: string): Promise<void> {
    await deleteDoc(doc(db, "tenant_dictionary", wordId));
}
