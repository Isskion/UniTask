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
import { format, addDays, getDay, startOfToday } from 'date-fns';
import { isMadridHoliday } from '@/lib/holidays';
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
        goal: '',
        pointsPerUserPerDay: 1,
        resourceCount: 0,
        includeWeekends: false,
        plannedCapacity: 0
    });

    const [consultantCount, setConsultantCount] = useState(0);
    const [consultants, setConsultants] = useState<string[]>([]);
    const [availabilities, setAvailabilities] = useState<any[]>([]);

    useEffect(() => {
        if (!tenantId) return;
        const loadResources = async () => {
            try {
                // Load Consultant IDs
                const qUsers = query(collection(db, "users"), where("tenantId", "==", tenantId), where("isConsultant", "==", true));
                const snapUsers = await getDocs(qUsers);
                const consultantIds = snapUsers.docs.map(doc => doc.id);
                setConsultants(consultantIds);
                setConsultantCount(consultantIds.length);

                // Load Availabilities
                const qAvail = query(collection(db, "user_availability"), where("tenantId", "==", tenantId));
                const snapAvail = await getDocs(qAvail);
                const availData = snapAvail.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAvailabilities(availData);
            } catch (e) {
                console.error("Error loading resources for capacity:", e);
                setConsultants([]);
                setAvailabilities([]);
            }
        };
        loadResources();
    }, [tenantId]);

    const calculatePlannedCapacity = (start: any, end: any, points: number, resourceIds: string[], includeWeekends: boolean) => {
        if (!start || !end || resourceIds.length === 0) return 0;
        const startDate = new Date(start instanceof Date ? start : (start.toDate ? start.toDate() : start));
        const endDate = new Date(end instanceof Date ? end : (end.toDate ? end.toDate() : end));

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) return 0;

        let totalCapacity = 0;
        let curr = new Date(startDate);
        while (curr <= endDate) {
            const dayOfWeek = curr.getDay(); // 0 = Sun, 6 = Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = isMadridHoliday(curr);

            // If it's a holiday, it doesn't count as a working day (unless we force weekend work AND holiday work - usually not)
            // For now, holidays are treated like weekends: they reduce capacity unless explicitly handled otherwise.
            // Requirement: "ESTOS DÍAS NO DEBEN CONTAR TAMPOCO COMO LABORABLES SI CAEN DE LUNES A VIERNES"

            // If it's a holiday, we skip adding points for this day regardless of resources
            // Logic: 
            // - If Include Weekends is false AND it's a weekend -> Skip
            // - If it's a holiday -> Skip (Overrides weekend check if it falls on weekday)

            const isWorkingDay = includeWeekends ? true : !isWeekend;

            if (isWorkingDay && !isHoliday) {
                // For each resource, check if they are available this day
                resourceIds.forEach(resId => {
                    const isAbsent = availabilities.some(a => {
                        // Skip if it's "Teletrabajo"
                        if (a.type === 'remote') return false;
                        if (a.userId !== resId) return false;

                        const aStart = a.startDate instanceof Date ? a.startDate
                            : (a.startDate?.toDate ? a.startDate.toDate()
                                : a.startDate?.seconds !== undefined ? new Date(a.startDate.seconds * 1000)
                                    : new Date(a.startDate));
                        const aEnd = a.endDate instanceof Date ? a.endDate
                            : (a.endDate?.toDate ? a.endDate.toDate()
                                : a.endDate?.seconds !== undefined ? new Date(a.endDate.seconds * 1000)
                                    : new Date(a.endDate));
                        if (!aStart || isNaN(aStart.getTime()) || !aEnd || isNaN(aEnd.getTime())) return false;

                        // Set times to midnight for comparison
                        const checkDay = new Date(curr);
                        checkDay.setHours(0, 0, 0, 0);

                        const cmpStart = new Date(aStart);
                        cmpStart.setHours(0, 0, 0, 0);

                        const cmpEnd = new Date(aEnd);
                        cmpEnd.setHours(23, 59, 59, 999);

                        return checkDay >= cmpStart && checkDay <= cmpEnd;
                    });

                    if (!isAbsent) {
                        totalCapacity += points;
                    }
                });
            }
            curr.setDate(curr.getDate() + 1);
        }
        return totalCapacity;
    };

    // Automatic recalculation of plannedCapacity
    useEffect(() => {
        if (isEditing && formData.startDate && formData.endDate) {
            const newCapacity = calculatePlannedCapacity(
                formData.startDate,
                formData.endDate,
                formData.pointsPerUserPerDay || 1,
                consultants,
                formData.includeWeekends || false
            );
            if (newCapacity !== formData.plannedCapacity) {
                setFormData(prev => ({ ...prev, plannedCapacity: newCapacity }));
            }
        }
    }, [formData.startDate, formData.endDate, formData.pointsPerUserPerDay, consultants, availabilities, formData.includeWeekends, isEditing]);

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

        // [VALIDATION] Check for Overlaps with Existing Sprints (Strict Sequential)
        const newStart = new Date(formData.startDate as string);
        const newEnd = new Date(formData.endDate as string);

        // Filter out the current sprint if editing
        const otherSprints = sprints.filter(s => s.id !== formData.id);

        const hasOverlap = otherSprints.some(s => {
            const existingStart = s.startDate?.toDate ? s.startDate.toDate() : new Date(s.startDate);
            const existingEnd = s.endDate?.toDate ? s.endDate.toDate() : new Date(s.endDate);

            // Overlap condition: (StartA <= EndB) and (EndA >= StartB)
            // https://stackoverflow.com/questions/325933/determine-whether-two-date-ranges-overlap
            return newStart <= existingEnd && newEnd >= existingStart;
        });

        if (hasOverlap) {
            const conflictingSprint = otherSprints.find(s => {
                const existingStart = s.startDate?.toDate ? s.startDate.toDate() : new Date(s.startDate);
                const existingEnd = s.endDate?.toDate ? s.endDate.toDate() : new Date(s.endDate);
                return newStart <= existingEnd && newEnd >= existingStart;
            });

            showToast(
                t('common.error'),
                `Fechas coinciden con: ${conflictingSprint?.name} (${formatDate(conflictingSprint?.startDate)} - ${formatDate(conflictingSprint?.endDate)})`,
                "error"
            );
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

            // [ARCHITECTURAL ENFORCEMENT] Single Active Sprint Rule
            // If setting this sprint to 'active', update ALL other active sprints to 'closed'
            if (payload.status === 'active') {
                const otherActiveSprints = otherSprints.filter(s => s.status === 'active');
                if (otherActiveSprints.length > 0) {
                    console.log(`[SprintManager] Closing ${otherActiveSprints.length} other active sprints.`);
                    // We can do this in parallel, but sequential is safer for error handling
                    for (const activeSprint of otherActiveSprints) {
                        try {
                            await safeUpdateDoc(doc(db, 'sprints', activeSprint.id), {
                                status: 'closed',
                                closedAt: serverTimestamp(), // Optional metadata
                                updatedAt: serverTimestamp()
                            });
                            showToast(t('common.info'), `Sprint anterior '${activeSprint.name}' cerrado automáticamente.`, "info");
                        } catch (e) {
                            console.error(`Failed to auto-close sprint ${activeSprint.name}`, e);
                        }
                    }
                }
            }

            if (formData.id) {
                await safeUpdateDoc(doc(db, 'sprints', formData.id), payload);
                showToast(t('common.success'), t('sprints.success_updated'), "success");
            } else {
                const docRef = await addDoc(collection(db, 'sprints'), {
                    ...payload,
                    createdAt: serverTimestamp(),
                    status: payload.status || 'planning' // Default for new
                });

                // [AUTOMATION] Check for Rollover Tasks (Expired Sprint -> Backlog)
                if (tenantId && sprints.length > 0) {
                    // Find the most recent sprint (that isn't the one we just created)
                    // Sprints are ordered desc by startDate.
                    const lastSprint = sprints[0];
                    const now = new Date();
                    const lastEndDate = lastSprint.endDate?.toDate ? lastSprint.endDate.toDate() : new Date(lastSprint.endDate);

                    // If the last sprint has expired
                    if (lastEndDate < now) {
                        const tasksQuery = query(
                            collection(db, 'tasks'),
                            where('tenantId', '==', tenantId),
                            where('sprintId', '==', lastSprint.id)
                        );

                        const tasksSnap = await getDocs(tasksQuery);
                        let movedCount = 0;

                        for (const taskDoc of tasksSnap.docs) {
                            const tData = taskDoc.data();
                            // If task is NOT completed, move to Backlog
                            if (tData.status !== 'completed') {
                                await safeUpdateDoc(doc(db, 'tasks', taskDoc.id), {
                                    sprintId: null, // Back to Backlog
                                    status: 'pending', // Reset status if it was in_progress
                                    needsRollover: null // Clear legacy flag
                                });
                                movedCount++;
                            }
                        }

                        if (movedCount > 0) {
                            showToast(t('common.info'), `${movedCount} tasks returned to Backlog from ${lastSprint.name}.`, "info");
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
        if (!tenantId) return;

        // 1. Check for attached tasks
        const tasksQuery = query(collection(db, 'tasks'), where('sprintId', '==', id), where('tenantId', '==', tenantId));
        const tasksSnap = await getDocs(tasksQuery);
        const taskCount = tasksSnap.size;

        if (taskCount > 0) {
            const confirmMessage = t('sprints.delete_confirm_with_tasks').replace('{count}', String(taskCount));
            if (!confirm(confirmMessage)) return;

            // 2. Eject Tasks (Revert In Progress -> Pending)
            // Batching is safer for many tasks
            let processed = 0;
            for (const taskDoc of tasksSnap.docs) {
                const taskData = taskDoc.data();
                const updates: any = {
                    sprintId: null,
                    needsRollover: null // Clean up any flags
                };

                // Revert "in_progress" to "pending" (Backlog)
                // Keep "completed" or "review" as is (Advanced states)
                if (taskData.status === 'in_progress') {
                    updates.status = 'pending';
                }

                await safeUpdateDoc(doc(db, 'tasks', taskDoc.id), updates);
                processed++;
            }
            showToast(t('common.info'), `${processed} tasks returned to backlog.`, "info");
        } else {
            if (!confirm(t('sprints.delete_confirm'))) return;
        }

        // 3. Delete Sprint
        await safeDeleteDoc(doc(db, 'sprints', id));
        showToast(t('common.success'), t('sprints.success_deleted'), "success");
    };

    const parseFirestoreDate = (ts: any): Date | null => {
        if (!ts) return null;
        if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate();
        if (ts.seconds !== undefined) return new Date(ts.seconds * 1000); // Serialized Timestamp
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
    };

    const formatDate = (ts: any) => {
        const date = parseFirestoreDate(ts);
        if (!date) return '-';
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
                            // [SMART DEFAULTS]
                            // 1. Find reference date (End of last sprint or Today)
                            let refDate = startOfToday();
                            if (sprints.length > 0) {
                                // Sprints are ordered by startDate desc. Find the latest endDate.
                                const latestSprint = [...sprints].sort((a, b) => {
                                    const endA = a.endDate?.toDate ? a.endDate.toDate() : new Date(a.endDate);
                                    const endB = b.endDate?.toDate ? b.endDate.toDate() : new Date(b.endDate);
                                    return endB.getTime() - endA.getTime();
                                })[0];

                                if (latestSprint) {
                                    refDate = latestSprint.endDate?.toDate ? latestSprint.endDate.toDate() : new Date(latestSprint.endDate);
                                }
                            }

                            // 2. Find next Monday
                            // If refDate is Friday(5), +3 = Monday
                            // If refDate is Sunday(0), +1 = Monday
                            const day = getDay(refDate); // 0 (Sun) - 6 (Sat)
                            const daysUntilMonday = day === 0 ? 1 : (8 - day);

                            const startDate = addDays(refDate, daysUntilMonday);

                            // 3. End Date: Friday of the 2nd week (+11 days from Monday)
                            const endDate = addDays(startDate, 11);

                            setFormData({
                                name: `Sprint W${format(startDate, 'w')}`,
                                status: 'planning',
                                startDate: startDate.toISOString().split('T')[0],
                                endDate: endDate.toISOString().split('T')[0],
                                pointsPerUserPerDay: 1,
                                resourceCount: consultants.length,
                                includeWeekends: false,
                                plannedCapacity: calculatePlannedCapacity(startDate, endDate, 1, consultants, false)
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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-3 rounded-lg bg-black/5 border border-white/5">
                        <div>
                            <label className="block text-[10px] uppercase font-bold mb-1 opacity-70">Puntos/Día</label>
                            <input
                                type="number"
                                value={formData.pointsPerUserPerDay || 1}
                                onChange={e => setFormData({ ...formData, pointsPerUserPerDay: Number(e.target.value) })}
                                className="w-full bg-transparent border rounded px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold mb-1 opacity-70">Recursos (Consultores)</label>
                            <div className="w-full bg-black/10 border border-white/10 rounded px-3 py-2 text-sm opacity-80 cursor-default">
                                {consultants.length} activos
                            </div>
                            <p className="text-[9px] mt-1 text-zinc-500 italic leading-tight">La capacidad se ajusta según las ausencias registradas.</p>
                        </div>
                        <div className="flex flex-col justify-center">
                            <label className="block text-[10px] uppercase font-bold mb-1 opacity-70">Trabajo Fin de Semana</label>
                            <label className="relative inline-flex items-center cursor-pointer mt-1">
                                <input
                                    type="checkbox"
                                    checked={formData.includeWeekends || false}
                                    onChange={e => setFormData({ ...formData, includeWeekends: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-zinc-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                        <div className="flex flex-col justify-center bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
                            <label className="block text-[10px] uppercase font-bold mb-0.5 text-emerald-500">Promesa Posible</label>
                            <div className="text-xl font-black text-emerald-500">{formData.plannedCapacity || 0} pts</div>
                        </div>
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
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        CAPACIDAD: {sprint.plannedCapacity || 0} PTS
                                    </div>
                                    <div className="text-[10px] opacity-50 uppercase tracking-widest font-bold">
                                        {sprint.resourceCount || 0} REC · {sprint.pointsPerUserPerDay || 1} PTS/D
                                    </div>
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
                                            // [FIX] Use live consultant list count
                                            resourceCount: consultants.length,
                                            pointsPerUserPerDay: sprint.pointsPerUserPerDay || 1,
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
