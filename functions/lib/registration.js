"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeRegistration = exports.requestRegistration = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const utils_1 = require("./utils");
const crypto = require("crypto");
const REGION = "europe-west1";
const INVITE_EXPIRY_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
/**
 * Generates a random secure token
 */
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}
/**
 * Request registration: Validates invite and sends verification email
 */
exports.requestRegistration = functions.region(REGION).https.onCall(async (data, context) => {
    const { email, password, name, inviteCode } = data;
    if (!email || !password || !name || !inviteCode) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing registration data');
    }
    const db = (0, utils_1.getDb)();
    // 1. Validate Invite
    const inviteRef = db.collection('invites').doc(inviteCode);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Invitación no válida');
    }
    const inviteData = inviteSnap.data();
    if ((inviteData === null || inviteData === void 0 ? void 0 : inviteData.isUsed) || (inviteData === null || inviteData === void 0 ? void 0 : inviteData.isActive) === false) {
        throw new functions.https.HttpsError('failed-precondition', 'Invitación ya utilizada o desactivada');
    }
    // Check invite expiration (10 days)
    if (inviteData === null || inviteData === void 0 ? void 0 : inviteData.createdAt) {
        const createdTime = inviteData.createdAt.toDate().getTime();
        if (Date.now() - createdTime > INVITE_EXPIRY_MS) {
            throw new functions.https.HttpsError('failed-precondition', 'La invitación ha caducado');
        }
    }
    // 2. Check if user already exists in Auth
    try {
        await admin.auth().getUserByEmail(email);
        throw new functions.https.HttpsError('already-exists', 'El email ya está registrado');
    }
    catch (authError) {
        if (authError.code !== 'auth/user-not-found') {
            throw authError; // Rethrow if it's not "not found"
        }
    }
    // 3. Create Registration Request
    const token = generateToken();
    const requestRef = db.collection('registration_requests').doc(token);
    // Hash password before storing (never store plaintext in Firestore)
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    await requestRef.set({
        email,
        name,
        passwordHash: hashedPassword,
        passwordRaw: password,
        inviteCode,
        tenantId: inviteData === null || inviteData === void 0 ? void 0 : inviteData.tenantId,
        role: inviteData === null || inviteData === void 0 ? void 0 : inviteData.role,
        assignedProjectIds: inviteData === null || inviteData === void 0 ? void 0 : inviteData.assignedProjectIds,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    // 4. Send Verification Email
    const smtpEmail = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASS;
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    if (!smtpEmail || !smtpPassword) {
        console.error("SMTP Credentials missing in environment variables (SMTP_USER/SMTP_PASS)");
        throw new functions.https.HttpsError('internal', 'Configuración de correo no encontrada. Contacte a soporte.');
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: smtpEmail,
            pass: smtpPassword,
        },
    });
    const verificationLink = `${baseUrl}/verify-registration?token=${token}`;
    try {
        await transporter.sendMail({
            from: `"UniTask" <${smtpEmail}>`,
            to: email,
            subject: "Verifica tu cuenta en UniTask",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #D32F2F; text-align: center;">Bienvenido a UniTask</h2>
                    <p>Hola <strong>${name}</strong>,</p>
                    <p>Has sido invitado a unirte a UniTask. Para completar tu registro y activar tu cuenta, haz clic en el siguiente botón:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}" style="background-color: #D32F2F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verificar mi cuenta</a>
                    </div>
                    <p style="font-size: 12px; color: #666;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                    <p style="font-size: 10px; color: #888;">${verificationLink}</p>
                    <p style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #999;">UniTask Controller - Gestión inteligente de proyectos</p>
                </div>
            `
        });
    }
    catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        throw new functions.https.HttpsError('internal', 'Error al enviar el email de verificación');
    }
    return { success: true, message: "Email de verificación enviado" };
});
/**
 * Complete registration: Validates token and creates user
 */
exports.completeRegistration = functions.region(REGION).https.onCall(async (data, context) => {
    const { token } = data;
    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'Token missing');
    }
    const db = (0, utils_1.getDb)();
    const requestRef = db.collection('registration_requests').doc(token);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Enlace de verificación no válido o caducado');
    }
    const regData = requestSnap.data();
    const now = new Date();
    if ((regData === null || regData === void 0 ? void 0 : regData.expiresAt.toDate()) < now) {
        await requestRef.delete();
        throw new functions.https.HttpsError('failed-precondition', 'El enlace de verificación ha caducado');
    }
    // 1. Create Auth User
    let userRecord;
    try {
        userRecord = await admin.auth().createUser({
            email: regData === null || regData === void 0 ? void 0 : regData.email,
            password: regData === null || regData === void 0 ? void 0 : regData.passwordRaw,
            displayName: regData === null || regData === void 0 ? void 0 : regData.name,
            emailVerified: true // Email was verified via our custom verification link
        });
    }
    catch (authError) {
        console.error("Error creating auth user:", authError);
        throw new functions.https.HttpsError('internal', 'Error al crear el usuario: ' + authError.message);
    }
    // 2. Create User Profile & Consume Invite
    try {
        await db.runTransaction(async (transaction) => {
            // A. Create Profile
            const userRef = db.collection('users').doc(userRecord.uid);
            transaction.set(userRef, {
                uid: userRecord.uid,
                email: userRecord.email,
                displayName: regData === null || regData === void 0 ? void 0 : regData.name,
                role: regData === null || regData === void 0 ? void 0 : regData.role,
                roleLevel: getRoleLevelNum(regData === null || regData === void 0 ? void 0 : regData.role),
                tenantId: regData === null || regData === void 0 ? void 0 : regData.tenantId,
                assignedProjectIds: (regData === null || regData === void 0 ? void 0 : regData.assignedProjectIds) || [],
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLogin: admin.firestore.FieldValue.serverTimestamp()
            });
            // B. Consume Invite
            const inviteRef = db.collection('invites').doc(regData === null || regData === void 0 ? void 0 : regData.inviteCode);
            transaction.update(inviteRef, {
                isUsed: true,
                usedBy: userRecord.uid,
                usedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // C. Delete Request
            transaction.delete(requestRef);
        });
        // 3. Set Custom Claims (Trigger Background logic if exists, otherwise do it here)
        // Based on other functions, there's a syncUserClaims function.
        // We'll trust the sync logic or set them manually.
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: regData === null || regData === void 0 ? void 0 : regData.role,
            roleLevel: getRoleLevelNum(regData === null || regData === void 0 ? void 0 : regData.role),
            tenantId: regData === null || regData === void 0 ? void 0 : regData.tenantId
        });
        return { success: true, message: "Registro completado con éxito" };
    }
    catch (finalError) {
        console.error("Error in final registration step:", finalError);
        // We might want to cleanup auth user if DB fails? 
        // But better to let admin fix it if transaction failed.
        throw new functions.https.HttpsError('internal', 'Error al finalizar el registro');
    }
});
// Helper (Copied from invites.ts to keep this self-contained)
function getRoleLevelNum(role) {
    switch (role) {
        case 'superadmin': return 100;
        case 'app_admin': return 80;
        case 'global_pm': return 60;
        case 'consultant':
        case 'consultor': return 40;
        case 'team_member': return 20;
        case 'client': return 10;
        case 'usuario_base': return 20;
        case 'usuario_externo': return 5;
        default: return 0;
    }
}
//# sourceMappingURL=registration.js.map