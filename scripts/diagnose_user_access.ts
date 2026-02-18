import { db } from "../lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Tenant 3 ID
const TENANT_ID = "3";
const TARGET_EMAIL = "cursoiadaniel@gmail.com"; // Assuming email, need to confirm UID if possible

async function diagnose() {
    console.log(`--- Diagnostic for Tenant ${TENANT_ID} ---`);

    // 1. Find User by Email to get UID
    console.log(`\nfinding user ${TARGET_EMAIL}...`);
    // Note: 'users' collection is global in this architecture
    const usersSnap = await getDocs(query(collection(db, "users"), where("email", "==", TARGET_EMAIL)));

    if (usersSnap.empty) {
        console.error("❌ User not found!");
        return;
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    console.log(`✅ User Found: ${userDoc.id}`);
    console.log(`   Role: ${userData.roleLevel}`);
    console.log(`   TenantId: ${userData.tenantId}`);
    console.log(`   AccessScopes:`, JSON.stringify(userData.accessScopes, null, 2));


    // 2. Fetch Projects in Tenant 3
    console.log(`\nFetching Projects in Tenant ${TENANT_ID}...`);
    // Note: Using the Hard Isolation path
    const projectsRef = collection(db, `tenants/${TENANT_ID}/projects`);
    const projectsSnap = await getDocs(projectsRef);

    if (projectsSnap.empty) {
        console.log("⚠️ No projects found in this tenant.");
    } else {
        projectsSnap.docs.forEach(p => {
            const data = p.data();
            console.log(`\nProject: ${data.name} (${p.id})`);
            console.log(`   Region: ${data.regionId}`);
            console.log(`   Division: ${data.divisionId}`);
            console.log(`   Acitve: ${data.isActive}`);
            console.log(`   TeamIds:`, data.teamIds || []);

            // Check Access
            const regionMatch = userData.accessScopes?.regionIds?.includes('*') || userData.accessScopes?.regionIds?.includes(data.regionId);
            const divisionMatch = userData.accessScopes?.divisionIds?.includes('*') || userData.accessScopes?.divisionIds?.includes(data.divisionId);
            const teamMatch = data.teamIds?.includes(userDoc.id);

            console.log(`   [ACCESS CHECK]`);
            console.log(`      Region Match: ${regionMatch}`);
            console.log(`      Division Match: ${divisionMatch}`);
            console.log(`      Team Match: ${teamMatch}`);

            if (userData.roleLevel >= 80) {
                console.log("      => ACCESS GRANTED (Admin)");
            } else if (teamMatch) {
                console.log("      => ACCESS GRANTED (Team Member)");
            } else if (regionMatch && divisionMatch) {
                console.log("      => ACCESS GRANTED (Scopes)");
            } else {
                console.log("      => ❌ ACCESS DENIED");
            }
        });
    }
}

diagnose().catch(console.error);
