import { db } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore";

async function deleteMockupTasks() {
    console.log("🚀 Starting removal of mockup tasks...");

    try {
        const tasksRef = collection(db, "tasks");
        // We look for tasks where organizationId is "1" and projectId is "mock-project" (or similar)
        // Or just search by the prefix used in mock data "MOCK"

        const q = query(tasksRef, where("projectId", "==", "mock-project"));
        const snapshot = await getDocs(q);

        console.log(`📦 Found ${snapshot.size} mockup tasks.`);

        const deletePromises = snapshot.docs.map(doc => {
            console.log(`  🗑️ Deleting task: ${doc.id} (${doc.data().friendlyId})`);
            return deleteDoc(doc.ref);
        });

        await Promise.all(deletePromises);
        console.log("✅ Mockup tasks deleted successfully.");

    } catch (error) {
        console.error("❌ Error deleting mockup tasks:", error);
    }
}

// Running as a manual trigger command would be safer, but I will provide it as a script
// that can be executed or integrated.
// For now, I will create a temporary component/button to trigger this if needed,
// or run it via a command if I have access to a script runner.
