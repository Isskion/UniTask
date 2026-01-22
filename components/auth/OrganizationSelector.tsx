/**
 * OrganizationSelector Component
 * 
 * Superadmin-only component for switching organization context.
 * This is a UX feature - security is enforced by backend rules.
 * 
 * The selected organization context affects:
 * - Which data is displayed in the Dashboard
 * - The context for any write operations
 * - Audit logs (which organization the admin is "acting as")
 */

'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Shield, Building2, Globe } from 'lucide-react';

import { Organization } from '@/types';

interface OrganizationSelectorProps {
    onOrganizationChange?: (organizationId: string) => void;
    className?: string;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
    onOrganizationChange,
    className
}) => {
    const { userRole } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrganization, setSelectedOrganization] = useState<string>('SYSTEM');
    const [loading, setLoading] = useState(true);

    // Only fetch organizations if user is superadmin
    useEffect(() => {
        if (userRole !== 'superadmin') {
            setLoading(false);
            return;
        }

        const fetchOrganizations = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'tenants'));
                const orgList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Organization[];

                setOrganizations(orgList);
            } catch (error) {
                console.error('Error fetching organizations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrganizations();
    }, [userRole]);

    // Handle organization change
    const handleChange = (organizationId: string) => {
        setSelectedOrganization(organizationId);

        // Store in sessionStorage for persistence across page reloads
        sessionStorage.setItem('adminOrganizationContext', organizationId);

        // Callback for parent components
        onOrganizationChange?.(organizationId);

        // Log for audit purposes
        console.log(`[ADMIN_CONTEXT] Superadmin switched context to: ${organizationId}`);
    };

    // Load saved context on mount
    useEffect(() => {
        const savedContext = sessionStorage.getItem('adminOrganizationContext');
        if (savedContext) {
            setSelectedOrganization(savedContext);
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
                    Superadmin Mode
                </span>
            </div>

            <div className="h-4 w-px bg-amber-300" />

            {/* Context Label */}
            <label className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Context:
            </label>

            {/* Organization Selector */}
            <select
                value={selectedOrganization}
                onChange={(e) => handleChange(e.target.value)}
                className={cn(
                    "rounded-md border border-amber-300 bg-white px-3 py-1 text-sm font-medium",
                    "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400",
                    "text-amber-900 cursor-pointer"
                )}
            >
                <option value="SYSTEM" className="font-bold">
                    🌐 Global View (All Organizations)
                </option>
                {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                        🏢 {org.name}
                    </option>
                ))}
            </select>

            {/* Current Context Indicator */}
            {selectedOrganization !== 'SYSTEM' && (
                <div className="ml-auto flex items-center gap-1 text-xs text-amber-700 bg-amber-200/50 px-2 py-1 rounded">
                    <Globe className="w-3 h-3" />
                    Acting as: <strong>{organizations.find(o => o.id === selectedOrganization)?.name || selectedOrganization}</strong>
                </div>
            )}

            {/* Warning for Global Mode */}
            {selectedOrganization === 'SYSTEM' && (
                <div className="ml-auto text-[10px] text-amber-600 italic">
                    ⚠️ Changes affect the entire system
                </div>
            )}
        </div>
    );
};

/**
 * Hook to get the current admin organization context
 */
export function useAdminOrganizationContext(): string {
    const [context, setContext] = useState<string>('SYSTEM');

    useEffect(() => {
        const saved = sessionStorage.getItem('adminOrganizationContext');
        if (saved) {
            setContext(saved);
        }

        // Listen for changes
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'adminOrganizationContext' && e.newValue) {
                setContext(e.newValue);
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return context;
}
