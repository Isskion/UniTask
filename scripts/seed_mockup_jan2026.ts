/**
 * SCRIPT: seed_mockup_jan2026.ts
 * DESCRIPTION: Generates a "Mockup Product" project and populates it with 
 * realistic daily updates and tasks for January 2026.
 * 
 * USAGE: npx ts-node scripts/seed_mockup_jan2026.ts
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// FORCE CJS require for firebase-admin to avoid ESM/Interop issues
const admin = require('firebase-admin');

import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ENV
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Init Firebase
if (!admin.apps.length) {
    try {
        const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({
                projectId: "minuta-f75a4"
            });
        }
    } catch (e) {
        admin.initializeApp({
            projectId: "minuta-f75a4"
        });
    }
}

const db = admin.firestore();

// --- CONFIGURATION ---
const PROJECT_CODE = "MOCKUP";
const PROJECT_NAME = "Mockup Product";
// [FIX] Use CORRECT Tenant ID found via debug script
const TENANT_ID = "2";
const START_DATE = new Date("2026-01-01");
const END_DATE = new Date("2026-01-31");
// [FIX] User ID for visibility
const USER_ID = "uw3iVoNRc9MRkaXsjiU0ugSLoDL2";

// --- DATA GENERATORS ---

const projectId = "mockup-product-2026";

interface DailyContent {
    notes: string;
    tasks: { title: string; type: string }[];
    status: string;
}

function getContentForDate(date: Date): DailyContent {
    const day = date.getDate();
    const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat

    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return { notes: "", tasks: [], status: "Off" };
    }

    // Story Arc: Building a SaaS Product
    // Week 1 (1-4): Planning & Requirements
    if (day <= 4) {
        if (day === 1) return {
            notes: "Kickoff meeting with stakeholders. Defined core MVP requirements. Focus on User Auth and Dashboard.",
            tasks: [{ title: "Draft MVP Requirements", type: "planning" }, { title: "Setup Repo", type: "dev" }],
            status: "Planning"
        };
        if (day === 2) return {
            notes: "Finalized database schema drafts. Reviewing UI kits for the dashboard.",
            tasks: [{ title: "Design DB Schema", type: "design" }],
            status: "Planning"
        };
    }

    // Week 2 (5-11): Design & Prototyping
    if (day >= 5 && day <= 11) {
        if (day === 5) return {
            notes: "Started high-fidelity mockups for the main dashboard. Team agreed on 'Dark Mode' default.",
            tasks: [{ title: "Mockup Dashboard", type: "design" }, { title: "Select UI Library", type: "dev" }],
            status: "Design"
        };
        if (day === 6) return { notes: "", tasks: [], status: "Off" }; // Holiday in Spain usually, but let's stick to simple logic
        if (day === 7) return {
            notes: "Reviewing comprehensive design system tokens. Colors approved.",
            tasks: [{ title: "Define Design Tokens", type: "design" }],
            status: "Design"
        };
        if (day === 8) return {
            notes: "Prototyping user flows for registration and login. Identifying edge cases in password recovery.",
            tasks: [{ title: "Prototype Auth Flow", type: "design" }],
            status: "Design"
        };
    }

    // Week 3 (12-18): Core Development
    if (day >= 12 && day <= 18) {
        if (day === 12) return {
            notes: "Dev environment setup complete. CI/CD pipelines initialized. Hello World deployed.",
            tasks: [{ title: "Init CI/CD", type: "devops" }],
            status: "Dev"
        };
        if (day === 13) return {
            notes: "Implemented Authentication service. JWT handling needs optimization.",
            tasks: [{ title: "Implement Auth API", type: "dev" }],
            status: "Dev"
        };
        if (day === 15) return {
            notes: "Database migration scripts running successfully. Seeding initial test data.",
            tasks: [{ title: "Create Seed Data", type: "dev" }],
            status: "Dev"
        };
    }

    // Week 4 (19-25): Feature Implementation
    if (day >= 19 && day <= 25) {
        if (day === 19) return {
            notes: "Dashboard widgets components created. Connecting to real API endpoints.",
            tasks: [{ title: "Build Chart Widgets", type: "dev" }],
            status: "Dev"
        };
        if (day === 21) return {
            notes: "Reporting module backbone is ready. PDF export is tricky, investigating libraries.",
            tasks: [{ title: "Research PDF Libs", type: "research" }],
            status: "Dev"
        };
        if (day === 23) return {
            notes: "Fixed layout issues on mobile devices. Navigation bar is now responsive.",
            tasks: [{ title: "Fix Mobile Nav", type: "css" }],
            status: "Dev"
        };
    }

    // Week 5 (26-31): QA & Polish
    if (day >= 26) {
        if (day === 27) return {
            notes: "Internal demo went well. Feedback: increase font size on KPI cards.",
            tasks: [{ title: "Adjust KPI Font Size", type: "design" }],
            status: "QA"
        };
        if (day === 29) return {
            notes: "Performance tuning. Reduced bundle size by 20%. Loading state animations added.",
            tasks: [{ title: "Optimize Bundle", type: "dev" }],
            status: "QA"
        };
        if (day === 30) return {
            notes: "Preparing for public beta launch. Documentation first draft complete.",
            tasks: [{ title: "Write User Docs", type: "docs" }],
            status: "QA"
        };
    }

    // default filler
    return {
        notes: "Routine progress on assigned tasks. Sync with team.",
        tasks: [],
        status: "Active"
    };
}


async function seed() {
    console.log("=== STARTING MOCKUP SEEDING (JAN 2026) ===");
    console.log("Tenant ID:", TENANT_ID);
    console.log("User ID:", USER_ID);

    // 1. Create/Ensure Project
    const projectRef = db.collection("projects").doc(projectId);
    const existingProject = await projectRef.get();

    if (!existingProject.exists) {
        console.log(`Creating project: ${PROJECT_NAME}...`);
        await projectRef.set({
            id: projectId,
            code: PROJECT_CODE,
            name: PROJECT_NAME,
            clientName: "Internal Lab",
            status: "active",
            health: "healthy",
            tenantId: TENANT_ID,
            teamIds: [USER_ID], // Ensure visibility
            isActive: true,
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-01-01")),
            lastUpdate: admin.firestore.Timestamp.fromDate(new Date("2026-01-31")),
            description: "A visionary project to demonstrate the capabilities of our new framework."
        });
    } else {
        console.log(`Project ${PROJECT_NAME} exists. Updating team link...`);
        // Update teamIds just in case
        await projectRef.update({
            teamIds: admin.firestore.FieldValue.arrayUnion(USER_ID),
            tenantId: TENANT_ID // Ensure tenant is correct
        });
    }

    // 2. Iterate Days
    let currentDate = new Date(START_DATE);
    const batchSize = 400;
    let batch = db.batch();
    let opCount = 0;

    while (currentDate <= END_DATE) {
        const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const content = getContentForDate(currentDate);

        if (content.status === "Off") {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }

        console.log(`Processing ${dateStr}...`);

        // A. Daily Status (formerly Bitácora)
        // [FIX] Use 'journal_entries' and Tenant Prefix ID
        const docId = `${TENANT_ID}_${dateStr}`;
        const dailyRef = db.collection("journal_entries").doc(docId);

        const dailyDoc = await dailyRef.get();
        let projects: any[] = [];

        if (dailyDoc.exists) {
            projects = dailyDoc.data().projects || [];
        }

        // Remove existing entry for this project if present to avoid dupes/stale data
        projects = projects.filter((p: any) => p.projectId !== projectId);

        // Add new entry
        projects.push({
            projectId: projectId,
            name: PROJECT_NAME,
            pmNotes: content.notes,
            conclusions: "",
            nextSteps: "",
            status: "active",
            blocks: [
                {
                    id: `block-${Date.now()}`,
                    content: content.notes,
                    type: "notes"
                }
            ]
        });

        // Set Daily Doc directly (safety measure vs batch for this critical part)
        // We use set with merge to preserve other tenant data IF the ID was shared (it isn't now)
        // But since ID is unique to tenant now, we can be safer.
        await dailyRef.set({
            id: docId,
            date: dateStr,
            tenantId: TENANT_ID,
            projects: projects,
            updatedAt: admin.firestore.Timestamp.now(),
            createdAt: dailyDoc.exists ? dailyDoc.data().createdAt : admin.firestore.Timestamp.now()
        }, { merge: true });


        // B. Tasks
        for (const taskDef of content.tasks) {
            const taskRef = db.collection("tasks").doc();
            const taskData = {
                id: taskRef.id,
                title: taskDef.title,
                projectId: projectId,
                tenantId: TENANT_ID,
                status: "completed",
                priority: "medium",
                createdAt: admin.firestore.Timestamp.fromDate(currentDate),
                updatedAt: admin.firestore.Timestamp.fromDate(currentDate),
                friendlyId: `${PROJECT_CODE}-${dateStr.replace(/-/g, '').slice(2)}-${Math.floor(Math.random() * 100)}`,
                isActive: true,
                createdBy: USER_ID, // Assigned to user
                assignedTo: USER_ID,

                // V3 fields
                sprintId: "sprint-jan-2026",
                type: "task"
            };

            batch.set(taskRef, taskData);
            opCount++;
        }

        if (opCount >= batchSize) {
            await batch.commit();
            batch = db.batch();
            opCount = 0;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (opCount > 0) {
        await batch.commit();
    }

    // 3. Create Sprint
    console.log("Creating Sprint...");
    await db.collection("sprints").doc("sprint-jan-2026").set({
        id: "sprint-jan-2026",
        name: "Sprint January 2026",
        startDate: admin.firestore.Timestamp.fromDate(START_DATE),
        endDate: admin.firestore.Timestamp.fromDate(END_DATE),
        status: "closed",
        tenantId: TENANT_ID,
        goal: "Launch MVP Mockup",
        createdAt: admin.firestore.Timestamp.now()
    });

    console.log("=== SEEDING COMPLETE ===");
}

seed().catch(console.error);
