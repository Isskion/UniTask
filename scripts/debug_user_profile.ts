
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const USER_ID = "6C9ZN0mfngNb5gIAWw1EMSaQcRR2";

async function debugProfile() {
    console.log(`--- Debugging Profile for User ${USER_ID} ---`);
    try {
        const userRef = doc(db, "users", USER_ID);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.error("❌ User Profile Not Found!");
            return;
        }

        const data = userSnap.data();
        console.log("✅ Profile Data:", JSON.stringify(data, null, 2));

        console.log("\n--- Field Types ---");
        console.log(`tenantId: '${data.tenantId}' (Type: ${typeof data.tenantId})`);
        console.log(`roleLevel: ${data.roleLevel} (Type: ${typeof data.roleLevel})`);
        console.log(`syncId: ${data.syncId} (Type: ${typeof data.syncId})`);

        if (data.syncId && typeof data.syncId === 'object' && 'seconds' in data.syncId) {
            console.log(`Timestamp Detected! syncId.toMillis(): ${data.syncId.toMillis()}`);
        } else {
            console.log(`syncId is NOT a Timestamp object.`);
        }

    } catch (error) {
        console.error("Error reading profile:", error);
    }
}

debugProfile();
