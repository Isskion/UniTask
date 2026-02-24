"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function KBRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'solution_record';

    useEffect(() => {
        if (id) {
            // Redirect to the main dashboard with the KB view and entry ID
            // Using view=knowledge-base and kbId for deep linking
            router.replace(`/?view=knowledge-base&kbType=${type}&kbId=${id}`);
        } else {
            router.replace(`/?view=knowledge-base&kbType=${type}`);
        }
    }, [id, type, router]);

    return (
        <div className="flex h-screen items-center justify-center bg-black text-white">
            <p>Redirecting to Knowledge Base...</p>
        </div>
    );
}
