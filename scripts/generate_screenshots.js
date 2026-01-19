const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
// Use the session specific path
const OUTPUT_DIR = String.raw`C:\Users\daniel.delamo\.gemini\antigravity\brain\c3985009-85a6-4852-b6be-eea25b4ee3c0\screenshots`;

// Create subdirectories
const SUBDIRS = [
    '01-introduction', '02-navigation', '03-daily-followup', '04-task-management',
    '05-dashboard', '06-projects', '07-admin-users', '08-admin-roles',
    '09-admin-projects', '10-admin-master-data', '11-multi-tenancy', '12-advanced-tools'
];

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
SUBDIRS.forEach(subdir => {
    const fullPath = path.join(OUTPUT_DIR, subdir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    console.log("🚀 Starting Comprehensive Manual Screenshot Generation (Fixed)...");
    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: { width: 1440, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const capture = async (folder, filename, viewMode, actions = async () => { }, noAuth = false) => {
        const page = await browser.newPage();
        try {
            console.log(`📸 Processing: ${folder}/${filename}...`);
            await page.setViewport({ width: 1440, height: 900 });

            // XPath Helper
            const $x = async (expression) => {
                // Puppeteer v23+ uses specialized selector syntax or we fallback to evaluate
                // But specifically for text search:
                try {
                    const elements = await page.$$(`xpath/${expression}`);
                    return elements;
                } catch (e) {
                    // Fallback for older versions if xpath/... is not supported?
                    return await page.$x(expression).catch(() => []);
                }
            };

            if (!noAuth) {
                await page.evaluateOnNewDocument((vm) => {
                    // Inject DEV-ONLY bypass trigger
                    localStorage.setItem('TEST_MODE', 'true');
                    if (vm) localStorage.setItem('daily_view_mode', vm);
                    localStorage.setItem('theme', 'light');
                }, viewMode);
            }

            await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
            await sleep(3000);

            // Pass the custom $x helper to the action
            await actions(page, $x);

            const fullPath = path.join(OUTPUT_DIR, folder, filename);
            await page.screenshot({ path: fullPath, fullPage: false });

        } catch (e) {
            console.error(`⚠️ Error ${filename}:`, e.message);
        } finally {
            await page.close();
        }
    };

    try {
        // --- 01 INTRODUCTION ---
        console.log("🟦 Processing: 1. Introduction...");
        await capture('01-introduction', '01-login-screen.png', '', async () => { }, true);
        await capture('01-introduction', '02-google-auth-popup.png', '', async (page) => {
            const btn = await page.$('button');
            if (btn) await btn.hover();
        }, true);
        await capture('01-introduction', '04-initial-dashboard.png', 'dashboard');

        // --- 02 NAVIGATION ---
        console.log("🟦 Processing: 2. Navigation...");
        await capture('02-navigation', '05-sidebar-menu.png', 'dashboard');
        await capture('02-navigation', '06-command-menu.png', 'dashboard', async (page) => {
            await page.keyboard.down('Alt');
            await page.keyboard.press('S');
            await page.keyboard.up('Alt');
            await sleep(500);
            await page.keyboard.type('Tarea');
            await sleep(500);
        });
        await capture('02-navigation', '07-user-profile-menu.png', 'dashboard', async (page) => {
            const avatar = await page.$('.w-8.h-8.rounded-full');
            if (avatar) await avatar.click();
            await sleep(500);
        });

        // --- 03 DAILY FOLLOW UP ---
        console.log("🟦 Processing: 3. Daily Follow Up...");
        await capture('03-daily-followup', '08-daily-followup-overview.png', 'daily-followup');
        await capture('03-daily-followup', '09-date-selector.png', 'daily-followup', async (page) => {
            const picker = await page.$('button[role="combobox"]');
            if (picker) await picker.click();
            await sleep(500);
        });
        await capture('03-daily-followup', '10-notes-field-autosave.png', 'daily-followup', async (page) => {
            const textarea = await page.$('textarea');
            if (textarea) {
                await textarea.type('Nota de ejemplo...');
                await sleep(500);
            }
        });
        await capture('03-daily-followup', '11-ai-analyze-button.png', 'daily-followup', async (page, $x) => {
            const [btn] = await $x("//button[contains(., 'Analizar con IA')]");
            if (btn) await btn.hover();
        });
        await capture('03-daily-followup', '13-pdf-scan-modal.png', 'daily-followup', async (page, $x) => {
            const [btn] = await $x("//button[contains(@title, 'Escanear PDF')]");
            if (btn) await btn.click();
            await sleep(1000);
        });
        await capture('03-daily-followup', '14-tasks-table.png', 'daily-followup', async (page) => {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await sleep(500);
        });
        await capture('03-daily-followup', '15-move-tasks-modal.png', 'daily-followup', async (page, $x) => {
            const [btn] = await $x("//button[contains(., 'Mover Tareas')]");
            if (btn) await btn.click();
            await sleep(1000);
        });

        // --- 04 TASK MANAGEMENT ---
        console.log("🟦 Processing: 4. Task Management...");
        await capture('04-task-management', '16-global-tasks-view.png', 'tasks');
        await capture('04-task-management', '17-new-task-button.png', 'tasks', async (page, $x) => {
            const [fab] = await $x("//button[contains(., 'Nueva Tarea')]");
            if (fab) await fab.hover();
        });
        await capture('04-task-management', '18-task-creation-form.png', 'tasks', async (page, $x) => {
            const [fab] = await $x("//button[contains(., 'Nueva Tarea')]");
            if (fab) await fab.click();
            await sleep(1000);
        });

        // --- 05 DASHBOARD ---
        console.log("🟦 Processing: 5. Dashboard...");
        await capture('05-dashboard', '22-dashboard-full-view.png', 'dashboard');
        await capture('05-dashboard', '23-period-selector.png', 'dashboard', async (page, $x) => {
            const [btn] = await $x("//button[contains(., 'MES')]");
            if (btn) await btn.hover();
        });
        await capture('05-dashboard', '25-multiline-chart-tooltip.png', 'dashboard', async (page) => {
            const chart = await page.$('div.recharts-responsive-container');
            if (chart) {
                const box = await chart.boundingBox();
                if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await sleep(500);
            }
        });

        // --- 06 PROJECTS ---
        console.log("🟦 Processing: 6. Projects...");
        await capture('06-projects', '28-projects-list.png', 'projects');
        await capture('06-projects', '29-project-update-form.png', 'projects', async (page, $x) => {
            const [btn] = await $x("//button[contains(., 'Actualizar')]");
            if (btn) await btn.click();
            await sleep(1000);
        });

        // --- 07 USERS ---
        console.log("🟦 Processing: 7. Users...");
        await capture('07-admin-users', '31-users-management.png', 'users');
        await capture('07-admin-users', '34-edit-user-modal.png', 'users', async (page) => {
            const avatar = await page.$('.w-10.h-10');
            if (avatar) await avatar.click();
            await sleep(1000);
        });

        // --- 08 ROLES ---
        console.log("🟦 Processing: 8. Roles...");
        await capture('08-admin-roles', '36-roles-hierarchy-table.png', 'user-roles');

        // --- 10 MASTER DATA ---
        console.log("🟦 Processing: 10. Master Data...");
        await capture('10-admin-master-data', '43-master-data-overview.png', 'admin-task-master');
        await capture('10-admin-master-data', '45-create-dynamic-block.png', 'admin-task-master', async (page, $x) => {
            const [btn] = await $x("//button[contains(., 'Nuevo')]");
            if (btn) await btn.click();
            await sleep(1000);
        });

        console.log("✅ All scenarios completed.");

    } catch (e) {
        console.error("Critical Error", e);
    }
    await browser.close();
})();
