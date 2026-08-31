/**
 * Centralized SOAP Proxy Utility with Dual-Route Fallback
 * 
 * First attempts to call Next.js API route (/api/unigis/soap) on the same domain.
 * If that fails or times out, falls back to Firebase Cloud Function (unigisSoapProxy).
 */

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
            headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}
