const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../manual_images');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    console.log("🚀 Starting Robust Screenshot Generation...");
    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: { width: 1440, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const capture = async (view, theme, filename, actions = async () => { }) => {
        const page = await browser.newPage();
        try {
            // Inject Auth & State BEFORE navigation
            await page.evaluateOnNewDocument((v, t) => {
                localStorage.setItem('TEST_MODE', 'true');
                localStorage.setItem('daily_view_mode', v);
                localStorage.setItem('theme', t);
                // Also force active tab to General by default to avoid ghosting
                localStorage.setItem('daily_active_tab', 'General');
            }, view, theme);

            await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
            await sleep(2000); // 2s hydration

            // Run Custom Actions (Clicks, etc.)
            await actions(page);

            // Take Screenshot
            const fullPath = path.join(OUTPUT_DIR, filename);
            await page.screenshot({ path: fullPath, fullPage: false });
            console.log(`📸 Captured: ${filename}`);

        } catch (e) {
            console.error(`⚠️ Error capturing ${filename}:`, e.message);
        } finally {
            await page.close();
        }
    };

    try {
        // 1. DASHBOARD
        await capture('dashboard', 'light', '01_dashboard_light.png');
        await capture('dashboard', 'red', '02_dashboard_red.png');

        // 2. MASTER DATA (Main)
        await capture('admin-task-master', 'red', '03_master_data_overview.png');

        // 3. MASTER DATA - Prioridades List
        await capture('admin-task-master', 'red', '04_master_data_priorities.png', async (page) => {
            // Click "Prioridades"
            const [el] = await page.$x("//h3[contains(text(), 'Prioridades')]");
            if (el) await el.click();
            await sleep(1000);
        });

        // 4. MASTER DATA - Edit Form
        await capture('admin-task-master', 'red', '05_master_data_edit.png', async (page) => {
            // Navigate to priorities first
            const [el] = await page.$x("//h3[contains(text(), 'Prioridades')]");
            if (el) await el.click();
            await sleep(1000);
            // Click Edit
            const [btn] = await page.$x("//button[contains(., 'Editar')]");
            if (btn) await btn.click();
            await sleep(1000);
        });

        // 5. MASTER DATA - Create Form
        await capture('admin-task-master', 'red', '06_master_data_create.png', async (page) => {
            const [el] = await page.$x("//h3[contains(text(), 'Prioridades')]");
            if (el) await el.click();
            await sleep(1000);
            const [btn] = await page.$x("//button[contains(., 'Nuevo')]");
            if (btn) await btn.click();
            await sleep(1000);
        });

        // 6. PROJECTS
        await capture('projects', 'light', '07_projects_list.png');

        // 7. NEW PROJECT FORM
        await capture('projects', 'light', '08_project_create.png', async (page) => {
            const [btn] = await page.$x("//button[contains(., 'Añadir Proyecto')]");
            if (btn) await btn.click();
            await sleep(500);
        });

        // 8. USERS
        await capture('users', 'light', '09_users_list.png');

        // 9. WEEKLY EDITOR
        await capture('editor', 'light', '10_weekly_editor.png');

        // 10. TASKS DASHBOARD
        await capture('tasks', 'light', '11_tasks_dashboard.png');

        // 11. USER ROLES
        await capture('user-roles', 'red', '12_user_roles.png');

        // 12. MOBILE DASHBOARD
        await capture('dashboard', 'light', '13_mobile_dashboard.png', async (page) => {
            await page.setViewport({ width: 375, height: 667 });
            await sleep(500);
        });

        console.log("✅ All scenarios completed.");

    } catch (error) {
        console.error("❌ Fatal:", error);
    } finally {
        await browser.close();
    }
})();
