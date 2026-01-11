/**
 * TenantSelector Component
 * 
 * Superadmin-only component for switching tenant context.
 * This is a UX feature - security is enforced by backend rules.
 * 
 * The selected tenant context affects:
 * - Which data is displayed in the Dashboard
 * - The context for any write operations
 * - Audit logs (which tenant the admin is "acting as")
 */

'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Shield, Building2, Globe } from 'lucide-react';

import { Tenant } from '@/types';

interface TenantSelectorProps {
    onTenantChange?: (tenantId: string) => void;
    className?: string;
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({
    onTenantChange,
    className
}) => {
    const { userRole } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<string>('SYSTEM');
    const [loading, setLoading] = useState(true);

    // Only fetch tenants if user is superadmin
    useEffect(() => {
        if (userRole !== 'superadmin') {
            setLoading(false);
            return;
        }

        const fetchTenants = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'tenants'));
                const tenantList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Tenant[];

                setTenants(tenantList);
            } catch (error) {
                console.error('Error fetching tenants:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTenants();
    }, [userRole]);

    // Handle tenant change
    const handleChange = (tenantId: string) => {
        setSelectedTenant(tenantId);

        // Store in sessionStorage for persistence across page reloads
        sessionStorage.setItem('adminTenantContext', tenantId);

        // Callback for parent components
        onTenantChange?.(tenantId);

        // Log for audit purposes (this will be captured by Cloud Functions)
        console.log(`[ADMIN_CONTEXT] Superadmin switched context to: ${tenantId}`);
    };

    // Load saved context on mount
    useEffect(() => {
        const savedContext = sessionStorage.getItem('adminTenantContext');
        if (savedContext) {
            setSelectedTenant(savedContext);
        }
    }, []);

    // Security: Don't render for non-superadmins
    if (userRole !== 'superadmin') {
        return null;
    }

    if (loading) {
        return (
            <div className={cn("bg-amber-100/50 animate-pulse h-10", className)} />
        );
    }

    return (
        <div className={cn(
            "bg-gradient-to-r from-amber-100 to-amber-50 px-4 py-2 flex items-center gap-3 border-b border-amber-200 shadow-sm",
            className
        )}>
            {/* Security Badge */}
            <div className="flex items-center gap-2 text-amber-800">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                    Modo Superadmin
                </span>
            </div>

            <div className="h-4 w-px bg-amber-300" />

            {/* Context Label */}
            <label className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Contexto:
            </label>

            {/* Tenant Selector */}
            <select
                value={selectedTenant}
                onChange={(e) => handleChange(e.target.value)}
                className={cn(
                    "rounded-md border border-amber-300 bg-white px-3 py-1 text-sm font-medium",
                    "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400",
                    "text-amber-900 cursor-pointer"
                )}
            >
                <option value="SYSTEM" className="font-bold">
                    🌐 Vista Global (Todos los Tenants)
                </option>
                {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                        🏢 {tenant.name}
                    </option>
                ))}
            </select>

            {/* Current Context Indicator */}
            {selectedTenant !== 'SYSTEM' && (
                <div className="ml-auto flex items-center gap-1 text-xs text-amber-700 bg-amber-200/50 px-2 py-1 rounded">
                    <Globe className="w-3 h-3" />
                    Actuando como: <strong>{tenants.find(t => t.id === selectedTenant)?.name || selectedTenant}</strong>
                </div>
            )}

            {/* Warning for Global Mode */}
            {selectedTenant === 'SYSTEM' && (
                <div className="ml-auto text-[10px] text-amber-600 italic">
                    ⚠️ Cambios afectan a todo el sistema
                </div>
            )}
        </div>
    );
};

/**
 * Hook to get the current admin tenant context
 */
export function useAdminTenantContext(): string {
    const [context, setContext] = useState<string>('SYSTEM');

    useEffect(() => {
        const saved = sessionStorage.getItem('adminTenantContext');
        if (saved) {
            setContext(saved);
        }

        // Listen for changes
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'adminTenantContext' && e.newValue) {
                setContext(e.newValue);
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return context;
}
