
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
        } else if (tenantId) {
            q = query(
                collection(db, "user_availability"),
                where("tenantId", "==", tenantId)
            );
        } else {
            // No tenantId available yet (or user has no tenant), skip query to avoid permission-denied
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as UserAvailability[];

            setAvailabilities(data);
            setLoading(false);
        }, (error) => {
            if (error.code === 'permission-denied') {
                console.log("Permission denied for availability listener (expected during logout).");
            } else {
                console.error("Error listening to availability:", error);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    const addAvailability = async (
        targetUserId: string,
        type: AvailabilityType,
        startDate: Date,
        endDate: Date,
        notes?: string,
        consumedDays?: number
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
            consumedDays: consumedDays || 0,
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
