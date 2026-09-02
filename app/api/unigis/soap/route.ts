import { NextResponse } from 'next/server';
import { isAuthorizedIntegratorRequest } from '@/lib/integratorAuth';

// Ensure Node 18+ fetch accepts UNIGIS self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * SOAP Proxy API Route — Replaces the old Express proxy
 * Forwards SOAP requests from the browser to UNIGIS endpoints,
 * bypassing CORS restrictions and handling SSL certificates.
 */
export async function POST(req: Request) {
    if (!isAuthorizedIntegratorRequest(req)) {
        return NextResponse.json({ ok: false, statusText: 'Unauthorized' }, { status: 401 });
    }

    try {
        const bodyJSON = await req.json();
        const { url, action, version, body, timeoutMs = 30000 } = bodyJSON;

        if (!url || !action || !body) {
            return NextResponse.json(
                { ok: false, statusText: 'Missing parameters: url, action, body are required' },
                { status: 400 }
            );
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const headers: Record<string, string> = {};

        if (version === '1.2') {
            headers['Content-Type'] = `application/soap+xml; charset=utf-8; action="${action}"`;
        } else {
            headers['Content-Type'] = 'text/xml; charset=utf-8';
            headers['SOAPAction'] = `"${action}"`;
        }

        console.log(`[SOAP Proxy] → ${url} | Action: ${action} | Version: ${version || '1.1'}`);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal,
        });

        clearTimeout(timeout);
        const text = await response.text();

        console.log(`[SOAP Proxy] ← ${response.status} | ${text.length} bytes`);

        return NextResponse.json({
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            text,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[SOAP Proxy] Error:', message);
        return NextResponse.json({
            ok: false,
            status: 0,
            statusText: message,
            text: '',
        });
    }
}
