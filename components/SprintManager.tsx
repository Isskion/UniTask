"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from "@/lib/utils";
import { Calendar, Plus, Save, Edit2, Trash2, X, Archive, Play, Clock, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSafeFirestore } from '@/hooks/useSafeFirestore';
import { collection, query, where, getDocs, orderBy, doc, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Sprint, getRoleLevel } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { format } from 'date-fns';
import { Task } from '@/types'; // Import Task type

export default function SprintManager() {
    const { theme } = useTheme();
    const { user, tenantId, userRole } = useAuth();
    const { addDoc, deleteDoc: safeDeleteDoc, updateDoc: safeUpdateDoc } = useSafeFirestore();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const isLight = theme === 'light';

    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Sprint>>({
        name: '',
        status: 'planning',
        goal: ''
    });

    // Permission Check
    const canManage = getRoleLevel(userRole) >= 60; // PM or above

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'sprints'),
            where('tenantId', '==', tenantId),
            orderBy('startDate', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sprint));
            setSprints(data);
            setLoading(false);
        }, (err) => {
            console.error("Sprint subscription error:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    const handleSave = async () => {
        if (!tenantId || !formData.name || !formData.startDate || !formData.endDate) {
            showToast(t('common.error'), t('sprints.error_missing_fields'), "error");
            return;
        }

        try {
            const payload = {
                ...formData,
                tenantId: String(tenantId),
                updatedAt: serverTimestamp()
            };

            // Ensure dates are Firestore timestamps
            if (payload.startDate instanceof Date) payload.startDate = Timestamp.fromDate(payload.startDate);
            else if (typeof payload.startDate === 'string') payload.startDate = Timestamp.fromDate(new Date(payload.startDate));

            if (payload.endDate instanceof Date) payload.endDate = Timestamp.fromDate(payload.endDate);
            else if (typeof payload.endDate === 'string') payload.endDate = Timestamp.fromDate(new Date(payload.endDate));

            if (formData.id) {
                await safeUpdateDoc(doc(db, 'sprints', formData.id), payload);
                showToast(t('common.success'), t('sprints.success_updated'), "success");
            } else {
                const docRef = await addDoc(collection(db, 'sprints'), {
                    ...payload,
                    createdAt: serverTimestamp(),
                    status: 'planning' // Default for new
                });

                // [AUTOMATION] Check for Rollover Tasks and Move them
                if (tenantId) {
                    const rolloverQuery = query(
                        collection(db, 'tasks'),
                        where('tenantId', '==', tenantId),
                        where('needsRollover', '==', true)
                    );

                    const rolloverSnap = await getDocs(rolloverQuery);
                    if (!rolloverSnap.empty) {
                        console.log(`Rolling over ${rolloverSnap.size} tasks to new sprint ${docRef.id}`);
                        let count = 0;
                        // Batch update ideally, but sequential for safety/simplicity now
                        for (const taskDoc of rolloverSnap.docs) {
                            await safeUpdateDoc(doc(db, 'tasks', taskDoc.id), {
                                sprintId: docRef.id,
                                needsRollover: null, // Clear flag
                                // Optional: Update deadline to new sprint end
                                clientDeadline: payload.endDate
                            });
                            count++;
                        }
                        if (count > 0) {
                            showToast(t('common.info'), `${count} tasks rolled over from expired sprint.`, "info");
                        }
                    }
                }

                showToast(t('common.success'), t('sprints.success_created'), "success");
            }
            setIsEditing(false);
            setFormData({ name: '', status: 'planning', goal: '' });
        } catch (error: any) {
            console.error("Save error:", error);
            showToast(t('common.error'), error.message, "error");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('sprints.delete_confirm'))) return;
        await safeDeleteDoc(doc(db, 'sprints', id));
    };

    const formatDate = (ts: any) => {
        if (!ts) return '-';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return format(date, 'dd MMM yyyy');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'closed': return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
            default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        }
    };

    if (loading) return <div className="p-8 text-center opacity-50">{t('sprints.loading_sprints')}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold">{t('sprints.manager_title')}</h2>
                    <p className="text-xs opacity-70">{t('sprints.manager_subtitle')}</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => {
                            setFormData({
                                name: `Sprint W${format(new Date(), 'w')}`,
                                status: 'planning',
                                startDate: new Date().toISOString().split('T')[0],
                                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                            } as any);
                            setIsEditing(true);
                        }}
                        className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> {t('sprints.new_sprint')}
                    </button>
                )}
            </div>

            {isEditing && (
                <div className={cn("p-4 rounded-xl border mb-6 animate-in slide-in-from-top-2", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-800")}>
                    <h3 className="font-bold mb-4 text-sm flex items-center gap-2">
                        {formData.id ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {formData.id ? t('sprints.edit_sprint') : t('sprints.new_sprint_plan')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium mb-1 opacity-70">{t('sprints.sprint_name')}</label>
                            <input
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-transparent border rounded px-3 py-2 text-sm"
                                placeholder={t('sprints.sprint_name_placeholder')}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 opacity-70">{t('sprints.goal')}</label>
                            <input
                                value={formData.goal || ''}
                                onChange={e => setFormData({ ...formData, goal: e.target.value })}
                                className="w-full bg-transparent border rounded px-3 py-2 text-sm"
                                placeholder={t('sprints.goal_placeholder')}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 opacity-70">{t('sprints.start_date')}</label>
                            <input
                                type="date"
                                value={formData.startDate instanceof Date ? formData.startDate.toISOString().split('T')[0] : (formData.startDate?.toDate ? formData.startDate.toDate().toISOString().split('T')[0] : formData.startDate)}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full bg-transparent border rounded px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1 opacity-70">{t('sprints.end_date')}</label>
                            <input
                                type="date"
                                value={formData.endDate instanceof Date ? formData.endDate.toISOString().split('T')[0] : (formData.endDate?.toDate ? formData.endDate.toDate().toISOString().split('T')[0] : formData.endDate)}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full bg-transparent border rounded px-3 py-2 text-sm"
                            />
                        </div>
                        {formData.id && (
                            <div>
                                <label className="block text-xs font-medium mb-1 opacity-70">{t('sprints.status')}</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full bg-transparent border rounded px-3 py-2 text-sm"
                                >
                                    <option value="planning">{t('sprints.status_planning')}</option>
                                    <option value="active">{t('sprints.status_active')}</option>
                                    <option value="closed">{t('sprints.status_closed')}</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs opacity-70 hover:opacity-100">{t('sprints.cancel')}</button>
                        <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2">
                            <Save className="w-3.5 h-3.5" /> {t('sprints.save_plan')}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-3">
                {sprints.map(sprint => (
                    <div key={sprint.id} className={cn("p-4 rounded-xl border flex items-center justify-between group transition-all",
                        isLight ? "bg-white border-zinc-200 hover:border-zinc-300" : "bg-card border-white/5 hover:border-white/10"
                    )}>
                        <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                sprint.status === 'active' ? "bg-emerald-500/20 text-emerald-500" :
                                    sprint.status === 'closed' ? "bg-zinc-500/20 text-zinc-500" : "bg-amber-500/20 text-amber-500"
                            )}>
                                {sprint.status === 'active' ? <Play className="w-5 h-5 fill-current" /> :
                                    sprint.status === 'closed' ? <Archive className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm flex items-center gap-2">
                                    {sprint.name}
                                    <span className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border", getStatusColor(sprint.status))}>
                                        {sprint.status}
                                    </span>
                                </h4>
                                <div className="flex items-center gap-3 text-xs opacity-60 mt-0.5 font-mono">
                                    <span>{formatDate(sprint.startDate)}</span>
                                    <span>→</span>
                                    <span>{formatDate(sprint.endDate)}</span>
                                </div>
                                {sprint.goal && <div className="text-xs opacity-80 mt-1 italic max-w-md truncate">"{sprint.goal}"</div>}
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => {
                                        setFormData({
                                            ...sprint,
                                            // Handle dates for form
                                            startDate: sprint.startDate?.toDate ? sprint.startDate.toDate().toISOString().split('T')[0] : sprint.startDate,
                                            endDate: sprint.endDate?.toDate ? sprint.endDate.toDate().toISOString().split('T')[0] : sprint.endDate,
                                        });
                                        setIsEditing(true);
                                    }}
                                    className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(sprint.id)}
                                    className="p-2 hover:bg-red-500/10 rounded text-zinc-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {sprints.length === 0 && (
                    <div className="p-8 text-center border border-dashed rounded-xl opacity-50 text-sm">
                        {t('sprints.no_sprints')}
                    </div>
                )}
            </div>
        </div>
    );
}
