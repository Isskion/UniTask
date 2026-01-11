const {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const fs = require("fs");
const path = require("path");

const PROJECT_ID = "weekly-tracker-test";

describe("Security Rules - Masquerading \u0026 Multi-Tenancy", () => {
    let testEnv;

    beforeAll(async () => {
        // Load rules from the local file
        const rules = fs.readFileSync(
            path.resolve(__dirname, "../firestore.rules"),
            "utf8"
        );
        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: { rules },
        });
    });

    afterAll(async () => {
        await testEnv.cleanup();
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
    });

    // --- HELPER TO SETUP USER ---
    const getDb = (auth) => {
        return testEnv.authenticatedContext(auth.uid, auth).firestore();
    };

    const getAdminDb = () => {
        return testEnv.unauthenticatedContext().firestore(); // Actually need admin rights usually, but for rules testing we simulate users
    }

    // --- TESTS ---

    test("Superadmin (Tenant 1) writing to Tenant B -> ALLOW (Bypass)", async () => {
        const superAdminAuth = {
            uid: "super-user",
            role: 100, // SUPERADMIN
            tenantId: "1",
        };
        const db = getDb(superAdminAuth);

        // Attempt to write a task for Tenant B
        const docRef = db.collection("tasks").doc("task-in-B");

        await assertSucceeds(
            docRef.set({
                title: "Ghost Task",
                tenantId: "B", // Cross-tenant write
                active: true,
            })
        );
    });

    test("Standard Admin (Tenant A) writing to Tenant B -> DENY", async () => {
        const adminAuth = {
            uid: "admin-user",
            role: 80, // ADMIN
            tenantId: "A",
        };
        const db = getDb(adminAuth);

        const docRef = db.collection("tasks").doc("fraud-task");

        await assertFails(
            docRef.set({
                title: "Hacked Task",
                tenantId: "B", // Malicious Cross-tenant injection
            })
        );
    });

    test("Standard Admin (Tenant A) writing to Tenant A -> ALLOW", async () => {
        const adminAuth = {
            uid: "admin-user",
            role: 80,
            tenantId: "A",
        };
        const db = getDb(adminAuth);

        const docRef = db.collection("tasks").doc("legit-task");

        await assertSucceeds(
            docRef.set({
                title: "Legit Task",
                tenantId: "A", // Correct tenant
            })
        );
    });

    test("User (Tenant A) trying to create project -> DENY (Only Admins/PMs?)", async () => {
        // Depending on exact rules for Projects, usually Users can't create projects
        const userAuth = {
            uid: "simple-user",
            role: 20, // EQUIPO
            tenantId: "A",
        };
        const db = getDb(userAuth);

        await assertFails(
            db.collection("projects").add({
                name: "New Project",
                tenantId: "A"
            })
        );
    });
});
