"use client";

import { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { DailyStatus, Project, Task } from '@/types';
import { DailyMinuteReport } from '@/components/reports/DailyMinuteReport';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function DailyReportContent() {
    const searchParams = useSearchParams();
    const date = searchParams.get('date');
    const tenantId = searchParams.get('tenantId');

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        entry: DailyStatus | null;
        projects: Project[];
        tasks: Task[];
        tenantName: string;
    } | null>(null);

    useEffect(() => {
        if (!date || !tenantId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch Daily Status
                const qEntry = query(collection(db, 'journal_entries'),
                    where('date', '==', date),
                    where('tenantId', '==', tenantId)
                );
                const snapEntry = await getDocs(qEntry);
                const entryData = snapEntry.empty ? null : { id: snapEntry.docs[0].id, ...snapEntry.docs[0].data() } as DailyStatus;

                // Fetch Projects
                const qProjects = query(collection(db, 'projects'), where('tenantId', '==', tenantId));
                const snapProjects = await getDocs(qProjects);
                const projects = snapProjects.docs.map(d => ({ id: d.id, ...d.data() } as Project));

                // Fetch Active Tasks
                const qTasks = query(collection(db, 'tasks'),
                    where('tenantId', '==', tenantId),
                    where('status', 'in', ['pending', 'in_progress', 'review'])
                );
                const snapTasks = await getDocs(qTasks);
                const tasks = snapTasks.docs.map(d => ({ id: d.id, ...d.data() } as Task));

                // Get Tenant Name
                // We'll skip fetching tenant doc for now to keep it simple, or default
                const tenantName = tenantId === '1' ? 'UniTask Demo' : (tenantId || 'Tenant');

                setData({
                    entry: entryData,
                    projects,
                    tasks,
                    tenantName
                });
            } catch (error) {
                console.error("Error fetching report data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [date, tenantId]);

    if (!date || !tenantId) return <div className="p-8 text-center text-zinc-500">Invalid parameters. Please provide date and tenantId.</div>;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (!data || !data.entry) {
        return (
            <div className="flex items-center justify-center min-h-screen text-slate-400">
                No minute recorded for the date {date}
            </div>
        );
    }

    return (
        <DailyMinuteReport
            date={new Date(date)}
            dailyStatus={data.entry}
            projects={data.projects}
            tasks={data.tasks}
            tenantName={data.tenantName}
        />
    );
}

export default function DailyReportRenderPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>}>
            <DailyReportContent />
        </Suspense>
    );
}
