import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import { isAuthorizedIntegratorRequest } from '@/lib/integratorAuth';

/**
 * General CORS Proxy API Route — Replaces the old Express server.js proxy
 * Used by both the SOAP and Swagger integrators to forward requests to UNIGIS endpoints,
 * bypassing CORS restrictions.
 *
 * Supports both GET (for loading WSDL/Swagger definitions) and POST (for SOAP/REST calls).
 * The target URL is passed via the `url` query parameter.
 */

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const httpAgent = new http.Agent();

export async function GET(req: NextRequest) {
    return handleProxy(req);
}

export async function POST(req: NextRequest) {
    return handleProxy(req);
}

export async function PUT(req: NextRequest) {
    return handleProxy(req);
}

export async function DELETE(req: NextRequest) {
    return handleProxy(req);
}

async function handleProxy(req: NextRequest): Promise<NextResponse> {
    if (!isAuthorizedIntegratorRequest(req)) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json(
            { ok: false, error: 'Missing url query parameter' },
            { status: 400 }
        );
    }

    console.log(`[UNIGIS Proxy] ${req.method} → ${targetUrl}`);

    try {
        const forwardHeaders: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            const lower = key.toLowerCase();
            const isRestricted = ['host', 'origin', 'referer', 'connection', 'accept-encoding'].includes(lower) ||
                lower.startsWith('x-forwarded-') ||
                lower.startsWith('x-invoke-') ||
                lower.startsWith('x-middleware-');
            if (!isRestricted) {
                forwardHeaders[key] = value;
            }
        });

        let reqBody = '';
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            const contentType = req.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                reqBody = JSON.stringify(await req.json());
            } else {
                reqBody = await req.text();
            }
        }

        return new Promise<NextResponse>((resolve) => {
            let urlObj: URL;
            try {
                urlObj = new URL(targetUrl);
            } catch (e) {
                console.error('[UNIGIS Proxy] Invalid URL passed:', targetUrl);
                return resolve(NextResponse.json({ ok: false, error: 'Invalid proxy URL format' }, { status: 400 }));
            }

            const isHttps = urlObj.protocol === 'https:';
            const requestFn = isHttps ? https.request : http.request;

            const options: https.RequestOptions | http.RequestOptions = {
                method: req.method,
                headers: forwardHeaders,
                agent: isHttps ? httpsAgent : httpAgent,
            };

            const proxyReq = requestFn(urlObj, options, (proxyRes) => {
                let resBody = '';
                proxyRes.on('data', (chunk) => {
                    resBody += chunk;
                });

                proxyRes.on('end', () => {
                    console.log(`[UNIGIS Proxy] ← ${proxyRes.statusCode} | ${resBody.length} bytes`);

                    const respHeaders = new Headers();
                    Object.entries(proxyRes.headers).forEach(([key, val]) => {
                        if (val && !['transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
                            respHeaders.set(key, Array.isArray(val) ? val.join(',') : val);
                        }
                    });

                    // Overwrite CORS headers
                    respHeaders.set('Access-Control-Allow-Origin', '*');
                    respHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                    respHeaders.set('Access-Control-Allow-Headers', '*');

                    resolve(
                        new NextResponse(resBody, {
                            status: proxyRes.statusCode || 200,
                            headers: respHeaders,
                        })
                    );
                });
            });

            proxyReq.on('error', (err) => {
                console.error('[UNIGIS Proxy] Error Fetching Target URL:', err.message);
                resolve(
                    NextResponse.json(
                        { ok: false, error: err.message },
                        { status: 502 }
                    )
                );
            });

            if (reqBody) {
                proxyReq.write(reqBody);
            }
            proxyReq.end();
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown proxy error';
        console.error('[UNIGIS Proxy] Error parsing request:', message);
        return NextResponse.json(
            { ok: false, error: message },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        },
    });
}
