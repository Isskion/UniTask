import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { DailyStatus, Project, Task } from '@/types';
import { DailyMinuteReport } from '@/components/reports/DailyMinuteReport';
import { redirect } from 'next/navigation';

export default async function DailyReportRenderPage({ params, searchParams }: { params: { date: string }, searchParams: { tenantId: string } }) {
    const { date } = await params;
    const { tenantId } = await searchParams; // In valid auth context this would be from session, for PDF generation we might pass it securely or use a shared secret.

    if (!date || !tenantId) return <div>Invalid Parameters</div>;

    // Fetch Daily Status
    const qEntry = query(collection(db, 'journal_entries'),
        where('date', '==', date),
        where('tenantId', '==', tenantId)
    );
    const snapEntry = await getDocs(qEntry);
    const entryData = snapEntry.empty ? null : { id: snapEntry.docs[0].id, ...snapEntry.docs[0].data() } as DailyStatus;

    if (!entryData) {
        return (
            <div className="flex items-center justify-center min-h-screen text-slate-400">
                No minute recorded for the date {date}
            </div>
        );
    }

    // Fetch Projects
    const qProjects = query(collection(db, 'projects'), where('tenantId', '==', tenantId));
    const snapProjects = await getDocs(qProjects);
    const projects = snapProjects.docs.map(d => ({ id: d.id, ...d.data() } as Project));

    // Fetch Active Tasks (Simple fetch all for now, optimize later)
    // Ideally we define "Active" as pending/in_progress or completed TODAY
    const qTasks = query(collection(db, 'tasks'),
        where('tenantId', '==', tenantId),
        where('status', 'in', ['pending', 'in_progress', 'review'])
        // Note: 'completed' should be fetched if completedAt == today, complex query. 
        // For 'Minutes', usually we care about OPEN items mostly.
    );
    const snapTasks = await getDocs(qTasks);
    const tasks = snapTasks.docs.map(d => ({ id: d.id, ...d.data() } as Task));

    // Get Organization Name
    const qOrg = query(collection(db, 'tenants'), where('id', '==', tenantId));
    // Assuming custom collection structure -> Fallback
    const organizationName = tenantId === '1' ? 'UniTask Demo' : (tenantId || 'Organization');


    return (
        <DailyMinuteReport
            date={new Date(date)}
            dailyStatus={entryData}
            projects={projects}
            tasks={tasks}
            organizationName={organizationName}
        />
    );
}
