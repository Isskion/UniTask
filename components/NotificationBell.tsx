"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, onSnapshot, limit, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Notification } from "@/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        // Listen for notifications for the current user
        // OPTIMIZATION: Removed orderBy to avoid missing index errors (400).
        // Sorting is done client-side.
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: Notification[] = [];
            let unread = 0;
            snapshot.forEach((doc) => {
                const data = doc.data() as Omit<Notification, "id">;
                const notif = { id: doc.id, ...data } as Notification;
                items.push(notif);
                if (!notif.read) unread++;
            });

            // Client-side Sort (Newest First)
            items.sort((a, b) => { // Handle timestamps
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tB - tA;
            });

            setNotifications(items);
            setUnreadCount(unread);
        }, (error) => {
            console.error("Notification Snapshot Error:", error);
            if (error.code === 'permission-denied') {
                console.warn("User does not have permission to view notifications.");
            }
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (notification: Notification) => {
        if (notification.read) return;
        try {
            await updateDoc(doc(db, "notifications", notification.id), {
                read: true
            });
        } catch (e) {
            console.error("Error marking notification as read", e);
        }
    };

    const handleNotificationClick = async (n: Notification) => {
        await markAsRead(n);
        setIsOpen(false);
        if (n.link) {
            router.push(n.link);
        }
        // If it's a task assignment, we might want to trigger a global event to open the specific task
        if (n.taskId) {
            // Dispatch event for TaskManagement to pick up if it's already mounted
            window.dispatchEvent(new CustomEvent('open-task', { detail: { taskId: n.taskId } }));
        }
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.read);
        unread.forEach(n => markAsRead(n));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-accent relative transition-colors"
                title="Notificaciones"
            >
                <Bell className={cn("w-5 h-5", unreadCount > 0 ? "text-foreground" : "text-muted-foreground")} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-[#121214]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium">
                                    Marcar todas leídas
                                </button>
                            )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500 text-xs">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    No tienes notificaciones
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={cn(
                                            "p-3 border-b border-white/5 last:border-0 cursor-pointer transition-colors hover:bg-white/5 relative",
                                            !n.read ? "bg-indigo-500/5" : ""
                                        )}
                                    >
                                        {!n.read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500" />
                                        )}
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-white line-clamp-1">{n.title}</span>
                                            <span className="text-[9px] text-zinc-500 whitespace-nowrap ml-2">
                                                {n.createdAt?.seconds ? formatDistanceToNow(new Date(n.createdAt.seconds * 1000), { addSuffix: true, locale: es }) : 'Justo ahora'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 leading-tight mb-1">{n.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
