"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unigisSoapProxy = void 0;
const functions = require("firebase-functions");
const cors = require("cors");
// UNIGIS usa certificados autofirmados — necesario para que Node 18 global fetch no los rechace
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// Initialize CORS middleware
const corsHandler = cors({ origin: true });
exports.unigisSoapProxy = functions.region("europe-west1").runWith({
    timeoutSeconds: 60,
    memory: '256MB'
}).https.onRequest(async (req, res) => {
    // 1. CORS Wrapper
    corsHandler(req, res, async () => {
        try {
            // Log for debugging
            console.log("UNIGIS Proxy request method:", req.method);
            if (req.method !== 'POST') {
                res.status(405).send({ ok: false, statusText: "Method Not Allowed" });
                return;
            }
            const { url, action, version, body, timeoutMs = 30000 } = req.body;
            if (!url || !action || !body) {
                res.status(400).send({ ok: false, statusText: 'Missing parameters: url, action, body are required' });
                return;
            }
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            const headers = {};
            if (version === '1.2') {
                headers['Content-Type'] = `application/soap+xml; charset=utf-8; action="${action}"`;
            }
            else {
                headers['Content-Type'] = 'text/xml; charset=utf-8';
                headers['SOAPAction'] = `"${action}"`;
            }
            console.log(`[SOAP Proxy] → ${url} | Action: ${action} | Version: ${version || '1.1'}`);
            // Note: Cloud Functions runtime might complain about self-signed certs.
            // Using NODE_TLS_REJECT_UNAUTHORIZED=0 is generally unsafe but might be needed globally if Unigis has bad SSL.
            // Node 18+ global fetch handles this differently, maybe we need an agent, but let's stick to global fetch.
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body,
                signal: controller.signal,
            });
            clearTimeout(timeout);
            const text = await response.text();
            console.log(`[SOAP Proxy] ← ${response.status} | ${text.length} bytes`);
            res.status(200).send({
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                text,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[SOAP Proxy] Error:', message);
            res.status(500).send({
                ok: false,
                status: 0,
                statusText: message,
                text: '',
            });
        }
    });
});
//# sourceMappingURL=unigis.js.map