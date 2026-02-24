"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProposalsRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    useEffect(() => {
        if (id) {
            // Redirect to the main dashboard with the proposals view and entry ID
            router.replace(`/?view=product-proposals&proposalId=${id}`);
        } else {
            router.replace(`/?view=product-proposals`);
        }
    }, [id, router]);

    return (
        <div className="flex h-screen items-center justify-center bg-black text-white">
            <p>Redirecting to Product Proposals...</p>
        </div>
    );
}
