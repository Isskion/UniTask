"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function DebugAuthToken() {
    const { user } = useAuth();
    const [tokenClaims, setTokenClaims] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getTokenClaims = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const idTokenResult = await user.getIdTokenResult();
                setTokenClaims(idTokenResult.claims);
            } catch (error) {
                console.error('Error getting token claims:', error);
            } finally {
                setLoading(false);
            }
        };

        getTokenClaims();
    }, [user]);

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto z-50 text-xs font-mono">
            <h3 className="font-bold mb-2 text-yellow-400">🔧 DEBUG: Auth Token Claims</h3>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <pre className="whitespace-pre-wrap">
                    {JSON.stringify(tokenClaims, null, 2)}
                </pre>
            )}
        </div>
    );
}
