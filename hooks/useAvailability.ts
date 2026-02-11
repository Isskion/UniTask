
import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
    orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserAvailability, AvailabilityType } from "@/types/availability";
import { useAuth } from "@/context/AuthContext";

export function useAvailability(tenantId: string) {
    const [availabilities, setAvailabilities] = useState<UserAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!tenantId) return;

        let q;
        if (tenantId === "ALL") {
            q = query(collection(db, "user_availability"));
        } else {
            q = query(
                collection(db, "user_availability"),
                where("tenantId", "==", tenantId)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as UserAvailability[];

            setAvailabilities(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    const addAvailability = async (
        targetUserId: string,
        type: AvailabilityType,
        startDate: Date,
        endDate: Date,
        notes?: string
    ) => {
        if (!user) throw new Error("User not authenticated");

        await addDoc(collection(db, "user_availability"), {
            tenantId,
            userId: targetUserId,
            type,
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
            status: 'approved', // Auto-approve for now if added by admin/manager
            notes: notes || "",
            createdBy: user.uid,
            createdAt: Timestamp.now()
        });
    };

    const updateAvailability = async (id: string, data: Partial<UserAvailability>) => {
        const ref = doc(db, "user_availability", id);
        // Convert Dates to Timestamps if present
        const updateData: any = { ...data };
        if (data.startDate instanceof Date) updateData.startDate = Timestamp.fromDate(data.startDate);
        if (data.endDate instanceof Date) updateData.endDate = Timestamp.fromDate(data.endDate);

        await updateDoc(ref, updateData);
    };

    const deleteAvailability = async (id: string) => {
        await deleteDoc(doc(db, "user_availability", id));
    };

    return {
        availabilities,
        loading,
        addAvailability,
        updateAvailability,
        deleteAvailability
    };
}
