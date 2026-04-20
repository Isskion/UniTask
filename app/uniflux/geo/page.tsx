import GeographicEditor from '@/components/uniflux/geo/GeographicEditor';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Módulo Geográfico | UniTask',
    description: 'Gestión inteligente de zonas y geocercas logísticas v2.0',
};

export default function GeoPage({ searchParams }: { searchParams: { projectId?: string } }) {
    const projectId = searchParams.projectId || '';

    return (
        <div className="h-screen w-full">
            <GeographicEditor initialProjectId={projectId} />
        </div>
    );
}
