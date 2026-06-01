import { Metadata } from 'next';
import ClientPage from './client';

export const metadata: Metadata = {
    title: 'UniVisio | UniTask',
    description: 'Ingesta, análisis y documentación estructurada de diagramas de Microsoft Visio',
};

export default function Page() {
    return <ClientPage />;
}
