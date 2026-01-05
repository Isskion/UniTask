"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function testServerConnection() {
    const logs: string[] = [];
    logs.push(`[Server] Iniciando prueba desde Node.js: ${process.version}`);

    try {
        const testRef = doc(db, "_diagnostic", "server_test");

        // Write Test
        logs.push("[Server] Intentando escribir...");
        await setDoc(testRef, {
            checkedAt: serverTimestamp(),
            environment: 'server-side'
        });
        logs.push("[Server] ✅ Escritura exitosa.");

        // Read Test
        logs.push("[Server] Intentando leer...");
        const snap = await getDoc(testRef);
        if (snap.exists()) {
            logs.push("[Server] ✅ Lectura exitosa.");
        } else {
            logs.push("[Server] ⚠️ Lectura vacía.");
        }

        return { success: true, logs, error: null };
    } catch (error: any) {
        logs.push(`[Server] ❌ ERROR: ${error.message}`);
        console.error("Server Diagnostic Error:", error);
        return {
            success: false,
            logs,
            error: {
                message: error.message,
                code: error.code
            }
        };
    }
}
