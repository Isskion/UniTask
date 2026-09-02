import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Cache del Swagger/OpenAPI de UNIGIS en Firestore.
 * Reemplaza al localStorage: el JSON pegado (o cargado por fetch) queda
 * disponible para cualquier usuario/navegador que abra UniSwagger, en vez
 * de perderse en cada recarga o quedar atado a un solo browser.
 *
 * Doc key = URL del Swagger, saneada para servir de id de documento.
 */

const COLLECTION = 'uniswaggerCache';

function sanitizeDocId(raw: string): string {
    const cleaned = raw.trim().replace(/[^a-zA-Z0-9]/g, '_').slice(0, 200);
    return cleaned || 'default';
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const url = searchParams.get('url') || 'default';
        const docId = sanitizeDocId(url);

        const snap = await adminDb.collection(COLLECTION).doc(docId).get();
        if (!snap.exists) {
            return NextResponse.json({ found: false });
        }

        const data = snap.data() || {};
        return NextResponse.json({
            found: true,
            url: data.url ?? null,
            json: data.json ?? null,
            savedAt: data.savedAt?.toMillis ? data.savedAt.toMillis() : null,
        });
    } catch (err: any) {
        console.error('[UniSwagger Cache GET] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { url, json } = body || {};

        if (!json || typeof json !== 'object') {
            return NextResponse.json({ error: 'Falta el campo "json" o no es un objeto válido' }, { status: 400 });
        }

        const docId = sanitizeDocId(url || 'default');

        await adminDb.collection(COLLECTION).doc(docId).set({
            url: url || null,
            json,
            savedAt: new Date(),
        });

        return NextResponse.json({ ok: true, docId });
    } catch (err: any) {
        console.error('[UniSwagger Cache POST] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
