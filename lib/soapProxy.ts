/**
 * Centralized SOAP Proxy Utility with Dual-Route Fallback
 *
 * First attempts to call Next.js API route (/api/unigis/soap) on the same domain.
 * If that fails or times out, falls back to Firebase Cloud Function (unigisSoapProxy).
 */

// La ruta /api/unigis/soap exige este header desde el commit 294f3509 (2026-09-02,
// lib/integratorAuth.ts) para cortar acceso anónimo/automatizado — igual que hace
// integratorFetch() en public/integrators/uni-swagger/main.js. Ese commit protegió la
// ruta pero nunca actualizó este archivo, que usan las 5 herramientas Uni[Entidad]Creator
// (uniordercreator, univehiclecreator, uniclientcreator, uniclientedadorcreator,
// unitransportecreator): desde entonces cada llamada recibía 401 sin caer al fallback
// (postSoapProxy trata 400-501 como respuesta "válida", no como fallo de red), rompiendo
// el login y el envío en las 5 herramientas. Detectado y corregido 2026-09-16.
// Igual que en main.js: NO es autenticación real, el valor es público en el JS del cliente.
const INTEGRATOR_SHARED_SECRET = '0e9a30536dc24c6633495766da86e36d6661beb39628ab0e65b93384265222d4';

export interface SoapProxyPayload {
    url: string;
    action: string;
    version?: string;
    body: string;
    timeoutMs?: number;
}

export async function postSoapProxy(payload: SoapProxyPayload): Promise<Response> {
    const primaryUrl = '/api/unigis/soap';
    const fallbackUrl = 'https://europe-west1-minuta-f75a4.cloudfunctions.net/unigisSoapProxy';

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), payload.timeoutMs || 15000);

        const res = await fetch(primaryUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Integrator-Key': INTEGRATOR_SHARED_SECRET },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        // If local API route returned a valid HTTP response (including 4xx/5xx from target UNIGIS server)
        if (res.ok || (res.status >= 400 && res.status < 502)) {
            return res;
        }
        console.warn(`[SOAPProxy] Local route ${primaryUrl} returned HTTP ${res.status}. Falling back to Cloud Function...`);
    } catch (err) {
        console.warn(`[SOAPProxy] Local route ${primaryUrl} failed (${err instanceof Error ? err.message : err}). Falling back to Cloud Function...`);
    }

    // Fallback: Call deployed Firebase Cloud Function directly
    return fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Integrator-Key': INTEGRATOR_SHARED_SECRET },
        body: JSON.stringify(payload),
    });
}
