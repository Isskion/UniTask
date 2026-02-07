import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function saveAiCorrection(question: string, correction: string, userId: string, tenantId: string) {
    try {
        await addDoc(collection(db, "ai_corrections"), {
            question,
            correction,
            userId,
            tenantId,
            timestamp: serverTimestamp(),
            status: 'pending' // Can be used for human review later
        });
        return { success: true };
    } catch (error) {
        console.error("Error saving AI correction:", error);
        return { success: false, error: "Failed to save feedback" };
    }
}
