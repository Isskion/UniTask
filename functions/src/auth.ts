import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// SMTP Configuration from .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export const resetPassword = functions.region("europe-west1").https.onCall(async (data, context) => {
    const { email } = data;

    if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }

    console.log(`[resetPassword] Request for: ${email}`);

    try {
        // 1. Generate Link
        const actionCodeSettings = {
            url: process.env.BASE_URL || 'https://unitaskcontroller.com',
            handleCodeInApp: true
        };

        const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

        // 2. Send Email
        const mailOptions = {
            from: `"UniTask Support" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Restablecer contraseña - UniTask',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                    <h2 style="color: #D32F2F;">Restablecer Contraseña</h2>
                    <p>Has solicitado restablecer tu contraseña para UniTask.</p>
                    <p>Haz clic en el siguiente botón para continuar:</p>
                    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #D32F2F; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
                    <p>Si no lo has solicitado, puedes ignorar este correo.</p>
                    <p style="font-size: 12px; color: #777;">Este enlace expirará pronto por seguridad.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[resetPassword] Reset link sent to ${email}`);

        return { success: true, message: "Enlace de recuperación enviado exitosamente." };
    } catch (error: any) {
        console.error("[resetPassword] Error:", error);

        if (error.code === 'auth/user-not-found') {
            // For security, don't reveal if user exists. 
            // In a private app we might, but standard practice is "Success" even if not found.
            return { success: true, message: "Si el correo está registrado, recibirás un enlace brevemente." };
        }

        throw new functions.https.HttpsError('internal', error.message || 'Error al procesar el reseteo de contraseña.');
    }
});
