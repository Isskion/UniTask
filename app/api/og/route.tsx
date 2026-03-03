import { ImageResponse } from 'next/og';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noteId = searchParams.get('noteId');

        let title = 'Documento';
        let description = 'Gestor de Conocimiento';

        if (noteId) {
            const docSnap = await adminDb.collection('unileaks_notes').doc(noteId).get();
            if (docSnap.exists) {
                const noteData = docSnap.data();
                title = noteData?.title || 'Sin Título';
                // Trim plain text so it fits the image nicely
                description = (noteData?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 120) + '...';
            }
        }

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#1E1E1E', // Dark background
                        backgroundImage: 'linear-gradient(to bottom right, #1E1E1E, #2A2A2A)',
                        color: 'white',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '80%',
                            textAlign: 'center',
                        }}
                    >
                        <h1
                            style={{
                                fontSize: '60px',
                                fontWeight: 'bold',
                                marginBottom: '20px',
                                color: '#A0A0A0', // Generic color, ideally primary
                            }}
                        >
                            UniLeaks
                        </h1>
                        <h2
                            style={{
                                fontSize: '48px',
                                marginBottom: '20px',
                                backgroundClip: 'text',
                                color: 'transparent',
                                backgroundImage: 'linear-gradient(to right, #4CAF50, #2E7D32)', // Green gradient
                            }}
                        >
                            {title}
                        </h2>
                        <p
                            style={{
                                fontSize: '24px',
                                color: '#CCCCCC',
                                marginTop: '20px',
                            }}
                        >
                            {description}
                        </p>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        console.log(`Error generating image: ${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
