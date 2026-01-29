import DailyFollowUp from '@/components/DailyFollowUp';
import { Suspense } from 'react';



export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Loading...</div>}>
      <DailyFollowUp />
    </Suspense>
  );
}
