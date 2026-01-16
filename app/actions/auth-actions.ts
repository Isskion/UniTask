"use server";

import { adminAuth } from "@/lib/firebase-admin";
import { sendEmail, wrapHtmlTemplate } from "@/lib/email";

export async function sendPasswordResetEmailAction(email: string) {
    if (!email) return { success: false, message: "Email requerido" };

    try {
        console.log("🔐 Generating reset link for:", email);

        // 1. Generate the link using Admin SDK
        // This requires 'FIREBASE_CONFIG' or Service Account to be set up.
        // If running on Vercel/Local without proper Service Account, this might throw 'credential' error.
        const link = await adminAuth.generatePasswordResetLink(email);

        console.log("🔗 Link Generated. Sending email...");

        // 2. Prepare Email Content
        const htmlContent = wrapHtmlTemplate(`
            <p>Hola,</p>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>UniTask Controller</strong>.</p>
            <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            <p style="text-align: center;">
                <a href="${link}" class="button" style="color: white; text-decoration: none;">Restablecer Contraseña</a>
            </p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
            <p style="font-size: 11px; color: #aaa;">Enlace directo: <a href="${link}">${link}</a></p>
        `, "Restablecimiento de Contraseña");

        // 3. Send Email via Nodemailer
        const emailSuccess = await sendEmail({
            to: email,
            subject: "Restablecer Contraseña - UniTask Controller",
            html: htmlContent
        });

        if (!emailSuccess) {
            throw new Error("Fallo al enviar el correo SMTP");
        }

        return { success: true };

    } catch (error: any) {
        console.error("Auth Action Error:", error);

        // Common errors translation
        if (error.code === 'auth/user-not-found') {
            return { success: false, message: "Usuario no encontrado." };
        }
        if (error.code === 'app/no-credential') {
            return { success: false, message: "Error de Servidor: Falta credencial Service Account." };
        }

        return { success: false, message: error.message || "Error desconocido" };
    }
}
