import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export async function sendChatMessage(history: ChatMessage[], newMessage: string, userId: string, tenantId: string, userRole: string = "user") {
    try {
        const chatFn = httpsCallable(functions, 'chat');
        const result = await chatFn({
            history,
            newMessage
        });

        return result.data as { success: boolean; text?: string; error?: string };
    } catch (e: any) {
        console.error("Chat Error:", e);
        return { success: false, text: undefined, error: e.message || "Failed to generate response." };
    }
}
