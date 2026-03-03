import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, query, where, getDocs, getDoc, serverTimestamp, deleteDoc, orderBy } from "firebase/firestore";
import { MoscowRequirement } from "@/types";

const COLLECTION = "moscow_requirements";

export async function getProjectRequirements(tenantId: string, projectId: string): Promise<MoscowRequirement[]> {
    const q = query(
        collection(db, COLLECTION),
        where("tenantId", "==", tenantId),
        where("projectId", "==", projectId),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MoscowRequirement));
}

export async function getNextSequentialNumber(tenantId: string, projectId: string, moduleCode: string): Promise<number> {
    const q = query(
        collection(db, COLLECTION),
        where("tenantId", "==", tenantId),
        where("projectId", "==", projectId),
        where("moduleCode", "==", moduleCode)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 1;

    let maxSeq = 0;
    snap.docs.forEach(d => {
        const data = d.data();
        if (data.sequentialNumber > maxSeq) maxSeq = data.sequentialNumber;
    });
    return maxSeq + 1;
}

export function formatMoscowId(moduleCode: string, seqNumber: number): string {
    const mod = moduleCode.padStart(2, "0");
    const seq = String(seqNumber).padStart(5, "0");
    return `${mod}-${seq}`;
}

export async function saveRequirement(data: Partial<MoscowRequirement>): Promise<string> {
    if (data.id) {
        const ref = doc(db, COLLECTION, data.id);
        const { id, ...rest } = data;
        await updateDoc(ref, { ...rest, updatedAt: serverTimestamp() });
        return data.id;
    } else {
        const ref = await addDoc(collection(db, COLLECTION), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return ref.id;
    }
}

export async function deleteRequirement(requirementId: string): Promise<void> {
    const ref = doc(db, COLLECTION, requirementId);
    await deleteDoc(ref);
}
