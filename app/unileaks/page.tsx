import { Metadata, ResolvingMetadata } from 'next';
import ClientPage from './client';
import { adminDb } from '@/lib/firebase-admin';

type Props = {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
    { searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const noteId = searchParams?.noteId as string | undefined;

    if (!noteId) {
        return {
            title: 'UniLeaks | UniTask',
            description: 'Gestor de Conocimiento',
            openGraph: {
                title: 'UniLeaks',
                description: 'Gestión y seguimiento de notas de proyectos',
            }
        };
    }

    try {
        const docSnap = await adminDb.collection('unileaks_notes').doc(noteId).get();
        if (!docSnap.exists) {
            return {
                title: 'Nota no encontrada | UniLeaks',
                description: 'La nota solicitada no existe o fue eliminada.',
            };
        }

        const noteData = docSnap.data();
        const noteTitle = noteData?.title || 'Nota sin título';
        const plainSummary = (noteData?.content || '').replace(/<[^>]*>?/gm, '').substring(0, 160) + '...';

        return {
            title: `${noteTitle} | UniLeaks`,
            description: plainSummary,
            openGraph: {
                title: noteTitle,
                description: plainSummary,
                type: 'article',
                images: [`/api/og?noteId=${noteId}`],
            },
            twitter: {
                card: 'summary_large_image',
                title: noteTitle,
                description: plainSummary,
            }
        };
    } catch (error) {
        console.error('Error fetching OG metadata for note:', error);
        return {
            title: 'UniLeaks',
            description: 'Visita esta nota en UniLeaks',
        };
    }
}

export default function Page() {
    return <ClientPage />;
}
