import { db } from "./firebase";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    deleteDoc,
    serverTimestamp,
    orderBy
} from "firebase/firestore";
import { InterfaceEntry, InterfaceVersion } from "../types";

const getInterfacesRef = () => collection(db, "project_interfaces");

export const getProjectInterfaces = async (projectId: string, tenantId: string) => {
    const q = query(
        getInterfacesRef(),
        where("tenantId", "==", tenantId),
        where("projectId", "==", projectId),
        where("isActive", "==", true),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as InterfaceEntry));
};

export const saveInterface = async (projectId: string, interfaceData: Partial<InterfaceEntry>) => {
    if (interfaceData.id) {
        const { id, ...data } = interfaceData;
        await updateDoc(doc(db, "project_interfaces", id), {
            ...data,
            projectId, // Ensure projectId is preserved
            updatedAt: serverTimestamp()
        });
        return id;
    } else {
        const docRef = await addDoc(getInterfacesRef(), {
            ...interfaceData,
            projectId,
            versions: interfaceData.versions || [],
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    }
};

export const deleteInterface = async (projectId: string, interfaceId: string) => {
    await updateDoc(doc(db, "project_interfaces", interfaceId), {
        isActive: false,
        updatedAt: serverTimestamp()
    });
};

export const updateInterfaceVersions = async (projectId: string, interfaceId: string, versions: InterfaceVersion[]) => {
    await updateDoc(doc(db, "project_interfaces", interfaceId), {
        versions,
        updatedAt: serverTimestamp()
    });
};
