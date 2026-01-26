import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, serverTimestamp, orderBy } from "firebase/firestore";
import { ExportTemplate } from "@/types";

const COLLECTION = "export_templates";

export const ExportTemplateService = {
    /**
     * Create a new template
     */
    create: async (template: Omit<ExportTemplate, "id" | "createdAt">): Promise<string> => {
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...template,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    },

    /**
     * Get templates for a specific tenant and entity type
     */
    list: async (tenantId: string, entity: "task" | "project" = "task"): Promise<ExportTemplate[]> => {
        const q = query(
            collection(db, COLLECTION),
            where("tenantId", "==", tenantId),
            where("entity", "==", entity),
            orderBy("name", "asc")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ExportTemplate));
    },

    /**
     * Update an existing template
     */
    update: async (id: string, updates: Partial<ExportTemplate>) => {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, { ...updates });
    },

    /**
     * Delete a template
     */
    delete: async (id: string) => {
        await deleteDoc(doc(db, COLLECTION, id));
    }
};
