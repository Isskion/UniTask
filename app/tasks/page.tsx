"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TasksRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const taskId = searchParams.get('id');

    useEffect(() => {
        if (taskId) {
            // Redirect to the correct main view with the task ID
            router.replace(`/?view=task-manager&taskId=${taskId}`);
        } else {
            // Fallback to main task manager if no ID
            router.replace(`/?view=task-manager`);
        }
    }, [taskId, router]);

    return (
        <div className="flex h-screen items-center justify-center bg-black text-white">
            <p>Redirecting to task...</p>
        </div>
    );
}
