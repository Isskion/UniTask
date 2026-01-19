const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log("📄 Generating PDF Manual...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Path to the HTML file (Current Conversation)
    const htmlPath = String.raw`C:\Users\daniel.delamo\.gemini\antigravity\brain\98bffcc3-1bce-4cff-badf-0d2aeccc89b5\MANUAL_USUARIO.html`;
    const pdfPath = String.raw`C:\Users\daniel.delamo\.gemini\antigravity\brain\98bffcc3-1bce-4cff-badf-0d2aeccc89b5\UniTask_Manual_Usuario.pdf`;

    // Load local file
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

    // Print to PDF
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20mm',
            bottom: '20mm',
            left: '20mm',
            right: '20mm'
        }
    });

    console.log(`✅ PDF Created: ${pdfPath}`);
    await browser.close();
})();
