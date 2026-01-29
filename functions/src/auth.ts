import * as functions from "firebase-functions";
import * as admin from "firebase-admin";


export const resetPassword = functions.https.onCall(async (data, context) => {
    // Public endpoint? Or Authenticated?
    // Password reset usually public (requires email).
    // so no context.auth check needed unless we restrict WHO can request resets?
    // Usually public.

    const { email } = data;
    if (!email) throw new functions.https.HttpsError('invalid-argument', 'Email required');

    // 1. Generate Link
    let link;
    try {
        link = await admin.auth().generatePasswordResetLink(email);
    } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
            return { success: false, message: "User not found" };
        }
        throw new functions.https.HttpsError('internal', "Auth Error: " + e.message);
    }

    // 2. Send Email
    // Configure Transporter (You need SMTP credentials!)
    // Using Gmail/SendGrid/etc.
    // For now we assume standard SMTP or Gmail if configured in env

    // NOTE: In production, use SendGrid/Mailgun.
    // Here we'll check if we have config variables.

    /*
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER || functions.config().smtp?.user,
            pass: process.env.SMTP_PASS || functions.config().smtp?.pass
        }
    });

    But for UniTask, do we have these env vars set?
    In `auth-actions.ts` it used `sendEmail` from `@/lib/email`.
    That file (`@/lib/email`) likely had the transporter config.
    Since I can't read that file easily during deployment (different dir), I must replicate config.
    
    If credentials are missing, we should probably fail or log link (dev mode).
    */

    const smtpUser = process.env.SMTP_USER || functions.config().smtp?.user;
    const smtpPass = process.env.SMTP_PASS || functions.config().smtp?.pass;

    if (!smtpUser || !smtpPass) {
        console.warn("SMTP Params missing. Logging link instead:", link);
        // Return success but with warning? Or just success.
        // If we can't send email, user gets nothing.
        return { success: false, message: "SMTP Integration missing. Contact Admin." };
    }

    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Or host/port if provided
        auth: { user: smtpUser, pass: smtpPass }
    });

    const htmlContent = `
        <p>Hola,</p>
        <p>Restablece tu contraseña aquí:</p>
        <a href="${link}">${link}</a>
    `;

    try {
        await transporter.sendMail({
            from: `"UniTask" <${smtpUser}>`,
            to: email,
            subject: "Restablecer Contraseña",
            html: htmlContent
        });
        return { success: true };
    } catch (e: any) {
        console.error("SMTP Error:", e);
        throw new functions.https.HttpsError('internal', "Failed to send email");
    }
});
