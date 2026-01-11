import { db } from "@/lib/firebase";
import { doc, runTransaction, setDoc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { Tenant } from "@/types";

/**
 * Gets the next auto-incremental Tenant ID via transaction.
 * Ensures no duplicates even with concurrent creations.
 */
export const getNextTenantId = async (): Promise<string> => {
    const counterRef = doc(db, "system", "counters");

    try {
        return await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            let nextId: number;

            if (!counterDoc.exists()) {
                // Initialize if missing. Start at 2 because 1 is reserved/taken.
                nextId = 2;
                transaction.set(counterRef, { tenants: nextId });
            } else {
                const current = counterDoc.data().tenants || 1;
                nextId = current + 1;
                transaction.update(counterRef, { tenants: nextId });
            }

            return nextId.toString();
        });
    } catch (error) {
        console.error("Error generating Tenant ID:", error);
        throw error;
    }
};

/**
 * Creates a new Tenant with an auto-assigned ID.
 */
export const createTenant = async (data: Omit<Tenant, "id">): Promise<string> => {
    try {
        const id = await getNextTenantId();

        await setDoc(doc(db, "tenants", id), {
            ...data,
            id: id,
            createdAt: new Date().toISOString()
        });

        return id;
    } catch (error) {
        console.error("Error creating tenant:", error);
        throw error;
    }
};

export const getTenants = async (): Promise<Tenant[]> => {
    const q = query(collection(db, "tenants"), orderBy("name"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tenant));
};
