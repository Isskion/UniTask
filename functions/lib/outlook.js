"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outlookCapture = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
/**
 * Handle incoming email data from the Outlook Add-in prototype.
 * [SECURITY NOTE] This is a prototype endpoint. Production implementation requires OAuth2 validation.
 */
/**
 * Endpoint para recibir datos de Outlook vía Power Automate o Webhooks externos.
 * [SEGURIDAD] Utiliza un token simple en la URL para validación básica.
 */
exports.outlookCapture = functions.region("europe-west1").https.onRequest(async (req, res) => {
    // Configuración de CORS
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Método no permitido. Use POST.');
        return;
    }
    // Validación de token de seguridad simple
    const securityToken = req.query.token;
    const expectedToken = process.env.OUTLOOK_WEBHOOK_TOKEN || "unitask-proto-123";
    if (securityToken !== expectedToken) {
        console.warn(`[OutlookCapture] ❌ Intento de acceso no autorizado con token: ${securityToken}`);
        res.status(401).send('No autorizado');
        return;
    }
    try {
        const { subject, body, sender, source, tenantId } = req.body;
        if (!subject || !body) {
            res.status(400).send('Faltan campos obligatorios: subject o body.');
            return;
        }
        const db = admin.firestore();
        // Guardamos en una colección de "Entradas Pendientes" (Inbox)
        const docRef = await db.collection("incoming_emails").add({
            subject,
            body,
            sender: sender || "unknown",
            source: source || "webhook",
            tenantId: tenantId || "shared",
            status: "pending",
            type: "email_capture",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[OutlookCapture] ✅ Mensaje guardado: ${docRef.id} para tenant: ${tenantId}`);
        res.status(200).send({
            success: true,
            id: docRef.id,
            message: "Entrada capturada y enviada a UniTask"
        });
    }
    catch (error) {
        console.error("[OutlookCapture] ❌ Error crítico:", error);
        res.status(500).send('Error interno del servidor');
    }
});
//# sourceMappingURL=outlook.js.map