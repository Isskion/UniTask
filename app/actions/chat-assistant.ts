import { auth } from "@/lib/firebase";

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export async function sendChatMessage(history: ChatMessage[], newMessage: string, userId: string, tenantId: string, userRole: string = "user") {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("User not authenticated");

        const token = await currentUser.getIdToken();
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const region = "europe-west1"; // Match deployed function region

        // Construct URL for Cloud Function
        // Deployed at: https://europe-west1-minuta-f75a4.cloudfunctions.net/chat
        const url = `https://${region}-${projectId}.cloudfunctions.net/chat`;

        console.log("SENDING CHAT TO:", url);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                history,
                newMessage
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = "Unknown error";
            try {
                const errJson = JSON.parse(errorText);
                errorMessage = errJson.error || errorText;
            } catch (e) {
                errorMessage = errorText;
            }
            throw new Error(`Server Error (${response.status}): ${errorMessage}`);
        }

        const data = await response.json();
        return data as { success: boolean; text?: string; error?: string };

    } catch (e: any) {
        console.error("Chat Error:", e);
        return { success: false, text: undefined, error: e.message || "Failed to generate response." };
    }
}
