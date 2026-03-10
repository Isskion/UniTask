import { Metadata } from 'next';
import UnifluxWorkspace from '@/components/uniflux/UnifluxWorkspace';

export const metadata: Metadata = {
    title: 'Uniflux | UniTask',
    description: 'Editor visual de flujos de proceso con IA y diagramas Mermaid',
};

export default function UnifluxPage() {
    return <UnifluxWorkspace />;
}
