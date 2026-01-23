"use client";

import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";

export interface TaskComment {
    id: string;
    taskId: string;
    tenantId: string;
    authorId: string;
    authorName: string;
    authorPhotoURL?: string;
    content: string;
    mentions: string[];
    createdAt: Timestamp;
}

/**
 * Parse @mentions from content
 * Format: @uid or @displayName (we use UIDs for reliability)
 */
export function parseMentions(content: string, users: { uid: string; displayName: string }[]): string[] {
    const mentionPattern = /@(\w+)/g;
    const matches = content.match(mentionPattern) || [];
    const mentionedUids: string[] = [];

    matches.forEach(match => {
        const name = match.substring(1).toLowerCase();
        // Try to find user by displayName (case insensitive partial match)
        const user = users.find(u =>
            u.displayName?.toLowerCase().includes(name) ||
            u.uid === name
        );
        if (user && !mentionedUids.includes(user.uid)) {
            mentionedUids.push(user.uid);
        }
    });

    return mentionedUids;
}

/**
 * Add a comment to a task
 */
export async function addComment(
    taskId: string,
    tenantId: string,
    authorId: string,
    authorName: string,
    authorPhotoURL: string | undefined,
    content: string,
    mentions: string[]
): Promise<string> {
    const docRef = await addDoc(collection(db, "task_comments"), {
        taskId,
        tenantId,
        authorId,
        authorName,
        authorPhotoURL: authorPhotoURL || null,
        content,
        mentions,
        createdAt: serverTimestamp()
    });

    // Send notifications to mentioned users
    for (const mentionedUid of mentions) {
        if (mentionedUid !== authorId) { // Don't notify yourself
            await addDoc(collection(db, "notifications"), {
                userId: mentionedUid,
                type: 'mention',
                title: 'Te han mencionado',
                message: `${authorName} te mencionó en una tarea`,
                taskId: taskId,
                read: false,
                createdAt: serverTimestamp()
            });
        }
    }

    return docRef.id;
}

/**
 * Subscribe to comments for a task (real-time)
 */
export function subscribeToComments(
    taskId: string,
    tenantId: string,
    callback: (comments: TaskComment[]) => void
): () => void {
    const q = query(
        collection(db, "task_comments"),
        where("taskId", "==", taskId),
        where("tenantId", "==", tenantId),
        orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as TaskComment));
        callback(comments);
    });

    return unsubscribe;
}

/**
 * Format relative time for comments
 */
export function formatRelativeTime(
    timestamp: Timestamp | null | undefined,
    t: (key: string) => string
): string {
    if (!timestamp) return '';

    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('comments.just_now');
    if (diffMins < 60) return `${diffMins} ${t('comments.minutes_ago')}`;
    if (diffHours < 24) return `${diffHours} ${t('comments.hours_ago')}`;
    return `${diffDays} ${t('comments.days_ago')}`;
}
