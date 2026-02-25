'use client'

import UniDocsManagement from '@/components/unidocs/UniDocsManagement';
import { AppLayout } from '@/components/AppLayout';
import { useState } from 'react';

export default function UniDocsPage() {
    const [viewMode, setViewMode] = useState<'unidocs'>('unidocs');

    return (
        <AppLayout viewMode="unidocs" onViewChange={(mode) => {
            if (mode !== 'unidocs') window.location.href = `/?view=${mode}`;
        }}>
            <UniDocsManagement />
        </AppLayout>
    );
}
