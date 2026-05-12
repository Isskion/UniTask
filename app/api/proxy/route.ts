import { NextResponse } from 'next/server';

/**
 * Universal Proxy API Route
 * Handles both GET and POST requests for UniSwagger and UniSOAP.
 * Bypasses CORS and handles SSL for UNIGIS endpoints.
 */

function getForwardHeaders(req: Request, contentType: string) {
    const headersToForward: Record<string, string> = {
        'Content-Type': contentType,
        'Accept': 'application/json, text/plain, */*',
    };

    const allowList = ['x-apikey', 'apikey', 'authorization', 'token', 'soapaction', 'mapitoken'];
    req.headers.forEach((value, key) => {
        if (allowList.includes(key.toLowerCase())) {
            headersToForward[key] = value;
        }
    });

    return headersToForward;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        console.log(`[Proxy GET] → ${url}`);
        const contentType = req.headers.get('content-type') || 'application/json';
        
        const response = await fetch(url, {
            headers: getForwardHeaders(req, contentType)
        });

        const resContentType = response.headers.get('content-type') || '';
        let data;

        if (resContentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        return new NextResponse(typeof data === 'string' ? data : JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': resContentType,
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (err: any) {
        console.error('[Proxy GET] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const body = await req.text();
        const contentType = req.headers.get('content-type') || 'application/json';

        console.log(`[Proxy POST] → ${url} | Content-Type: ${contentType}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: getForwardHeaders(req, contentType),
            body: body
        });

        const responseContentType = response.headers.get('content-type') || 'text/plain';
        const responseData = await response.text();

        return new NextResponse(responseData, {
            status: response.status,
            headers: {
                'Content-Type': responseContentType,
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (err: any) {
        console.error('[Proxy POST] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * Handle OPTIONS for CORS preflight
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, ApiKey, X-ApiKey, Token, SOAPAction, MapiToken',
        }
    });
}
