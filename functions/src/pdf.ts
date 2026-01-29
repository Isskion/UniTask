import * as functions from "firebase-functions";


export const generatePdf = functions.runWith({
    timeoutSeconds: 300,
    memory: '2GB'
}).https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

    const { date, tenantId } = data;
    if (!date || !tenantId) throw new functions.https.HttpsError('invalid-argument', 'Missing params');

    const puppeteer = require('puppeteer');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();

        // Use standard production URL if possible, or a config
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://minuta-f75a4.web.app';
        const url = `${baseUrl}/report-render/daily?date=${date}&tenantId=${tenantId}`;

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        await page.addStyleTag({ content: '@page { size: A4; margin: 0; }' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();
        return { success: true, pdf: pdfBuffer.toString('base64') };

    } catch (e: any) {
        if (browser) await browser.close();
        console.error("PDF Error:", e);
        throw new functions.https.HttpsError('internal', "PDF Generation failed: " + e.message);
    }
});
