import DailyFollowUp from '@/components/DailyFollowUp';
import { Suspense } from 'react';

// Force dynamic rendering to ensure searchParams work correctly in build
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Loading...</div>}>
      <DailyFollowUp />
    </Suspense>
  );
}
