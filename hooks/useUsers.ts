
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { UserProfile, getRoleLevel } from "@/types";

export function useUsers(tenantId?: string) {
    const { user, userRole, tenantId: authTenantId } = useAuth(); // Renamed to avoid conflict
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            if (!user) {
                setUsers([]);
                setLoading(false);
                return;
            }

            try {
                // Determine query based on role or passed tenantId
                let q;
                const userLevel = getRoleLevel(userRole);

                // If specific tenantId passed, use it (for admins managing specific tenant)
                // If not, default to user's tenant (from AuthContext)
                const targetTenant = tenantId || authTenantId;

                if (targetTenant === "ALL") {
                    q = query(collection(db, "users"));
                } else if (userLevel >= 100) {
                    // Superadmin can see all if no tenant specified
                    if (targetTenant) {
                        q = query(collection(db, "users"), where("tenantId", "==", targetTenant));
                    } else {
                        q = query(collection(db, "users"));
                    }
                } else if (targetTenant) {
                    q = query(collection(db, "users"), where("tenantId", "==", targetTenant));
                } else {
                    // Fallback: no tenant, no users
                    setUsers([]);
                    setLoading(false);
                    return;
                }

                const snapshot = await getDocs(q);
                const loadedUsers: UserProfile[] = [];
                snapshot.forEach(doc => {
                    loadedUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
                });

                // Sort by name
                loadedUsers.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
                setUsers(loadedUsers);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [tenantId, userRole, user]);

    return { users, loading };
}
