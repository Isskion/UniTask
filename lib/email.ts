import nodemailer from 'nodemailer';

// --- CONFIGURATION ---
function getTransporter() {
    const SMTP_EMAIL = process.env.SMTP_EMAIL || 'UniTaskController.noreply@gmail.com';
    const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

    console.log("📧 Email Service Call:");
    console.log("   User:", SMTP_EMAIL);
    console.log("   Pass Found:", !!SMTP_PASSWORD);

    if (!SMTP_PASSWORD) {
        throw new Error("SMTP_PASSWORD is not set in environment.");
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: SMTP_EMAIL,
            pass: SMTP_PASSWORD,
        },
    });
}

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

/**
 * Sends an email using the configured Gmail SMTP transport.
 * This must be called from a Server Component or Server Action.
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
    const SMTP_EMAIL = process.env.SMTP_EMAIL || 'UniTaskController.noreply@gmail.com';
    try {
        const transporter = getTransporter();
        const info = await transporter.sendMail({
            from: `"UniTask Controller" <${SMTP_EMAIL}>`,
            to,
            subject,
            html,
        });

        console.log("✅ Email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Error sending email:", error);
        return false;
    }
}

/**
 * Modern HTML Template wrapper
 */
export function wrapHtmlTemplate(content: string, title: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
            .header { background: #09090b; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: #fff; margin: 0; font-size: 20px; }
            .content { padding: 30px 20px; background: #fff; }
            .footer { text-align: center; font-size: 12px; color: #888; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
            .button { display: inline-block; padding: 12px 24px; background-color: #D32F2F; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${title}</h1>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} UniTask Controller. Todos los derechos reservados.
            </div>
        </div>
    </body>
    </html>
    `;
}
