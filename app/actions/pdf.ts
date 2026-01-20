'use server';

import puppeteer from 'puppeteer';

export async function generateDailyReportPDF(date: string, tenantId: string) {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Development URL - In Prod this should be dynamic based on headers or ENV
        // Hardcoding localhost:3000 for local dev request
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const url = `${baseUrl}/report-render/daily/${date}?tenantId=${tenantId}`;

        console.log(`[PDF] Generando PDF desde: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle0' });

        // Add some style injection if needed for print media
        await page.addStyleTag({ content: '@page { size: A4; margin: 0; }' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0px',
                right: '0px',
                bottom: '0px',
                left: '0px'
            }
        });

        await browser.close();

        // Convert to Base64 to send back to client
        const base64 = Buffer.from(pdfBuffer).toString('base64');
        return { success: true, pdf: base64 };

    } catch (error: any) {
        console.error('[PDF] Error generating report:', error);
        return { success: false, error: error.message };
    }
}
