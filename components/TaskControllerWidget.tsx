"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as Lucide from "lucide-react";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    setDoc,
    serverTimestamp,
    increment,
    updateDoc,
    writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { DynamicLucideIcon } from "./admin/TaskControlPanel";
import type { AgendaEntry, AgendaConsultant } from "@/types/agenda";
import { ActivityType, ResultStatus } from "@/types/agenda";
import { createAgendaEntry } from "@/lib/agenda";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskType {
    id: string;
    name: string;
    icon: string;
    color: string;
    active: boolean;
    usageCount: number;
}

interface Project {
    id: string;
    name: string;
    code?: string;
    status: string;
}

interface ConsultantTask {
    id: string;
    projectName: string;
    projectId: string;
    taskTypeName: string;
    taskTypeId: string;
    details: string;
    durationMinutes: number;
    agendaEntryId?: string;
    createdAt: any;
}

interface ActiveTimer {
    id: string;
    userId: string;
    tenantId: string;
    projectId: string;
    projectName: string;
    taskTypeId: string;
    taskTypeName: string;
    details: string;
    isRunning: boolean;
    startTime: number | null;       // epoch ms, null when paused
    accumulatedSeconds: number;
    writerTabId: string;
    agendaEntryId: string | null;
    agendaEntryLabel: string | null;
    updatedAt: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskControllerWidget({ embedded = false }: { embedded?: boolean }) {
    const { user, tenantId } = useAuth();
    const { showToast } = useToast();
    const { theme } = useTheme();

    // Stable tab identity — cursor safe (no re-render needed)
    const tabIdRef = useRef(Math.random().toString(36).slice(2));
    const isLoadingTimerRef = useRef(false);
    // Ref so the timer listener closure can always read latest taskTypes
    // without needing taskTypes in its dependency array (which would cause
    // the listener to recreate on every taskTypes load, dropping in-flight timers)
    const taskTypesRef = useRef<TaskType[]>([]);
    // IDs of timers created optimistically (locally) that Firestore hasn't confirmed yet.
    // Needed because the Firestore listener may recreate (e.g. when tenantId updates at ~3s
    // after login due to token refresh) and return a snapshot that doesn't include the timer
    // written under the previous tenantId. Keeping these IDs lets us merge them back so
    // the form stays visible until Firestore confirms or the user navigates away.
    const optimisticTimerIdsRef = useRef<Set<string>>(new Set());
    // When the user explicitly saves or deletes the selected timer, block the snapshot
    // handler from auto-selecting another timer (which would reshow the green bar).
    const suppressAutoSelectRef = useRef(false);

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"now" | "retro" | "today" | "edit">("now");

    // Master data
    const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [todayTasks, setTodayTasks] = useState<ConsultantTask[]>([]);

    // Multi-timer
    const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
    const [selectedTimerId, setSelectedTimerId] = useState<string | null>(null);

    // Form fields for the selected timer
    const [nowProject, setNowProject] = useState("");
    const [nowCategory, setNowCategory] = useState<TaskType | null>(null);
    const [nowDetails, setNowDetails] = useState("");
    const [linkedAgendaEntryId, setLinkedAgendaEntryId] = useState<string | null>(null);
    const [linkedAgendaEntryLabel, setLinkedAgendaEntryLabel] = useState<string | null>(null);

    // Agenda entries for today
    const [todayAgendaEntries, setTodayAgendaEntries] = useState<AgendaEntry[]>([]);

    // Agenda creator (shown when user hits Iniciar without a linked entry)
    const [myConsultant, setMyConsultant] = useState<AgendaConsultant | null>(null);
    const [showAgendaCreator, setShowAgendaCreator] = useState(false);
    const [agendaCreatorType, setAgendaCreatorType] = useState<ActivityType>(ActivityType.TAREAS_A_REALIZAR);
    const [agendaCreatorComment, setAgendaCreatorComment] = useState("");
    const [agendaCreatorStart, setAgendaCreatorStart] = useState("");
    const [agendaCreatorEnd, setAgendaCreatorEnd] = useState("");
    const [isCreatingAgendaEntry, setIsCreatingAgendaEntry] = useState(false);

    // Tick — drives secondsElapsed via useMemo (F5 / tab-suspend resilient)
    const [tick, setTick] = useState(0);

    // Retroactive form
    const [retroProject, setRetroProject] = useState("");
    const [retroCategory, setRetroCategory] = useState<TaskType | null>(null);
    const [retroDetails, setRetroDetails] = useState("");
    const [retroDuration, setRetroDuration] = useState(15);
    const [retroLinkedAgendaEntryId, setRetroLinkedAgendaEntryId] = useState<string | null>(null);
    const [retroLinkedAgendaEntryLabel, setRetroLinkedAgendaEntryLabel] = useState<string | null>(null);

    // Edit task form
    const [editingTask, setEditingTask] = useState<ConsultantTask | null>(null);
    const [editDuration, setEditDuration] = useState(15);
    const [editDetails, setEditDetails] = useState("");

    // UI
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const currentTenantId = tenantId || "";

    // ── Derived ───────────────────────────────────────────────────────────────

    const selectedTimer = useMemo(
        () => activeTimers.find(t => t.id === selectedTimerId) ?? null,
        [activeTimers, selectedTimerId]
    );

    const timerActive = selectedTimer?.isRunning ?? false;

    // Elapsed seconds recalculated from Firestore anchor on every tick
    const secondsElapsed = useMemo(() => {
        if (!selectedTimer) return 0;
        const base = selectedTimer.accumulatedSeconds ?? 0;
        if (!selectedTimer.isRunning || !selectedTimer.startTime) return base;
        return base + Math.max(0, Math.floor((Date.now() - selectedTimer.startTime) / 1000));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick, selectedTimer]);

    // ── Tick interval ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!timerActive) return;
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [timerActive]);

    // Keep ref in sync so timer listener closure stays fresh without recreating
    useEffect(() => { taskTypesRef.current = taskTypes; }, [taskTypes]);

    // ── 1. Master data ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user || !currentTenantId || currentTenantId === "unknown" || currentTenantId === "__DENY__") return;

        const unsubCategories = onSnapshot(
            query(collection(db, "taskTypes"), where("tenantId", "==", currentTenantId), where("active", "==", true)),
            snap => {
                const list: TaskType[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskType));
                setTaskTypes(list);
                setNowCategory(prev => prev ?? list[0] ?? null);
            },
            err => console.error("taskTypes:", err)
        );

        const unsubProjects = onSnapshot(
            query(collection(db, "projects"), where("tenantId", "==", currentTenantId)),
            snap => {
                const list = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Project))
                    .filter(p => p.status === "active");
                setProjects(list);
                if (list.length > 0) {
                    setNowProject(prev => prev || list[0].id);
                    setRetroProject(prev => prev || list[0].id);
                }
            },
            err => console.error("projects:", err)
        );

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const unsubTasks = onSnapshot(
            query(
                collection(db, "consultantTasks"),
                where("userId", "==", user.uid),
                where("tenantId", "==", currentTenantId),
                orderBy("createdAt", "desc")
            ),
            snap => {
                const list: ConsultantTask[] = [];
                snap.forEach(d => {
                    const data = d.data();
                    const ts = data.createdAt?.toDate();
                    if (ts && ts >= todayStart) list.push({ id: d.id, ...data } as ConsultantTask);
                });
                setTodayTasks(list);
            },
            err => console.error("consultantTasks:", err)
        );

        return () => { unsubCategories(); unsubProjects(); unsubTasks(); };
    }, [user, currentTenantId]);

    // ── 2. Multi-timer listener ───────────────────────────────────────────────
    useEffect(() => {
        if (!user || !currentTenantId || currentTenantId === "unknown") return;

        const unsub = onSnapshot(
            query(
                collection(db, "activeTimers"),
                where("userId", "==", user.uid),
                where("tenantId", "==", currentTenantId)
            ),
            snap => {
                const timers: ActiveTimer[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActiveTimer));
                const fsIds = new Set(timers.map(t => t.id));

                // Merge: Firestore timers + local timers NOT visible in this snapshot.
                // IDs stay in optimisticTimerIdsRef until the timer is deleted or saved —
                // NOT when Firestore confirms it. This is intentional: the listener may
                // recreate seconds later (tenantId change from AuthContext ~3s token refresh)
                // and the new query won't find the timer. By keeping the ID in the set we
                // preserve the timer across that recreation even after Firestore confirmed it.
                setActiveTimers(prev => {
                    const localMissing = prev.filter(t =>
                        optimisticTimerIdsRef.current.has(t.id) && !fsIds.has(t.id)
                    );
                    return [...timers, ...localMissing];
                });

                // Keep a valid selectedTimerId — also accept IDs still tracked locally.
                // If the user just saved/deleted the selected timer, don't auto-select
                // another one (that would reshow the green bar unexpectedly).
                setSelectedTimerId(prev => {
                    if (prev && (fsIds.has(prev) || optimisticTimerIdsRef.current.has(prev))) return prev;
                    if (suppressAutoSelectRef.current) {
                        suppressAutoSelectRef.current = false;
                        return null;
                    }
                    return timers.find(t => t.isRunning)?.id ?? timers[0]?.id ?? null;
                });

                // Cursor-safe: only sync form fields if the write came from another tab
                snap.docChanges().forEach(change => {
                    if (change.type === "removed") return;
                    const t = change.doc.data() as ActiveTimer;
                    if (t.writerTabId !== tabIdRef.current && !isLoadingTimerRef.current) {
                        setNowProject(t.projectId || "");
                        setNowDetails(t.details ?? "");
                        setLinkedAgendaEntryId(t.agendaEntryId ?? null);
                        setLinkedAgendaEntryLabel(t.agendaEntryLabel ?? null);
                        if (t.taskTypeId) {
                            setNowCategory(prev =>
                                prev?.id === t.taskTypeId ? prev :
                                taskTypesRef.current.find(tt => tt.id === t.taskTypeId) ?? prev
                            );
                        }
                    }
                });
            },
            err => console.error("activeTimers:", err)
        );

        return () => unsub();
    }, [user, currentTenantId]); // intentionally omit taskTypes — use taskTypesRef to avoid listener recreation

    // ── 3. Sync form when switching selected timer ────────────────────────────
    useEffect(() => {
        if (!selectedTimer || isLoadingTimerRef.current) return;
        setNowProject(selectedTimer.projectId || "");
        setNowDetails(selectedTimer.details ?? "");
        setLinkedAgendaEntryId(selectedTimer.agendaEntryId ?? null);
        setLinkedAgendaEntryLabel(selectedTimer.agendaEntryLabel ?? null);
        setShowAgendaCreator(false);
        if (selectedTimer.taskTypeId && taskTypes.length > 0) {
            const match = taskTypes.find(t => t.id === selectedTimer.taskTypeId);
            if (match) setNowCategory(match);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTimerId]);

    // ── 4. Agenda entries for today ───────────────────────────────────────────
    useEffect(() => {
        if (!user || !currentTenantId || currentTenantId === "unknown") return;

        const todayISO = new Date().toISOString().slice(0, 10);

        const unsub = onSnapshot(
            query(
                collection(db, "agenda_entries"),
                where("consultantId", "==", user.uid),
                where("tenantId", "==", currentTenantId),
                where("isActive", "==", true)
            ),
            snap => {
                const entries: AgendaEntry[] = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as AgendaEntry))
                    .filter(e => e.date?.toDate?.()?.toISOString?.().slice(0, 10) === todayISO);
                setTodayAgendaEntries(entries);
            },
            err => console.error("agenda_entries today:", err)
        );

        return () => unsub();
    }, [user, currentTenantId]);

    // ── 5. Load AgendaConsultant for current user ─────────────────────────────
    useEffect(() => {
        if (!user || !currentTenantId || currentTenantId === "unknown") return;
        const unsub = onSnapshot(
            query(
                collection(db, "agenda_consultants"),
                where("userId", "==", user.uid),
                where("tenantId", "==", currentTenantId)
            ),
            snap => {
                const doc0 = snap.docs[0];
                setMyConsultant(doc0 ? ({ id: doc0.id, ...doc0.data() } as AgendaConsultant) : null);
            },
            err => console.error("agenda_consultants:", err)
        );
        return () => unsub();
    }, [user, currentTenantId]);

    // ── 6. Debounced auto-sync form → Firestore ───────────────────────────────
    useEffect(() => {
        if (!selectedTimerId || !user || !currentTenantId || currentTenantId === "unknown") return;

        const id = setTimeout(async () => {
            const projectObj = projects.find(p => p.id === nowProject);
            try {
                await updateDoc(doc(db, "activeTimers", selectedTimerId), {
                    projectId: nowProject,
                    projectName: projectObj?.name || "",
                    taskTypeId: nowCategory?.id || "",
                    taskTypeName: nowCategory?.name || "",
                    details: nowDetails,
                    agendaEntryId: linkedAgendaEntryId,
                    agendaEntryLabel: linkedAgendaEntryLabel,
                    writerTabId: tabIdRef.current,
                    updatedAt: serverTimestamp()
                });
            } catch {
                // Timer may have been deleted by admin force-stop — ignore silently
            }
        }, 800);

        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nowProject, nowCategory, nowDetails, linkedAgendaEntryId, selectedTimerId]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const formatTimer = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const getTimerElapsed = useCallback((timer: ActiveTimer) => {
        const base = timer.accumulatedSeconds ?? 0;
        if (!timer.isRunning || !timer.startTime) return base;
        return base + Math.max(0, Math.floor((Date.now() - timer.startTime) / 1000));
    }, []);

    const pauseAllOtherTimers = useCallback(async (excludeTimerId: string) => {
        const running = activeTimers.filter(t => t.isRunning && t.id !== excludeTimerId);
        if (running.length === 0) return;
        const batch = writeBatch(db);
        const now = Date.now();
        for (const t of running) {
            const accumulated = (t.accumulatedSeconds ?? 0) +
                (t.startTime ? Math.max(0, Math.floor((now - t.startTime) / 1000)) : 0);
            batch.update(doc(db, "activeTimers", t.id), {
                isRunning: false,
                accumulatedSeconds: accumulated,
                startTime: null,
                writerTabId: tabIdRef.current,
                updatedAt: serverTimestamp()
            });
        }
        await batch.commit();
    }, [activeTimers]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleNewTimer = () => {
        if (!user || !currentTenantId) return;
        const defaultProject = projects[0];
        const defaultCategory = taskTypes[0];

        // Generate document reference locally — ID is available immediately, no async needed.
        // This eliminates the 1-3s server round-trip window where auth context changes
        // (e.g. the 3-second token refresh in AuthContext) could reset the timer listener
        // before addDoc resolved, causing activeTimers to clear and the form to disappear.
        const newDocRef = doc(collection(db, "activeTimers"));
        const timerId = newDocRef.id;

        const optimisticTimer: ActiveTimer = {
            id: timerId,
            userId: user.uid,
            tenantId: currentTenantId,
            projectId: defaultProject?.id || "",
            projectName: defaultProject?.name || "",
            taskTypeId: defaultCategory?.id || "",
            taskTypeName: defaultCategory?.name || "",
            details: "",
            isRunning: false,
            startTime: null,
            accumulatedSeconds: 0,
            writerTabId: tabIdRef.current,
            agendaEntryId: null,
            agendaEntryLabel: null,
            updatedAt: null,
        };

        // Mark as optimistic so the snapshot handler preserves it across listener recreations
        optimisticTimerIdsRef.current.add(timerId);

        // Synchronous optimistic update — form is visible before the network write fires
        setActiveTimers(prev => [...prev, optimisticTimer]);
        setSelectedTimerId(timerId);
        setNowProject(defaultProject?.id || "");
        setNowCategory(defaultCategory ?? null);
        setNowDetails("");
        setLinkedAgendaEntryId(null);
        setLinkedAgendaEntryLabel(null);
        setShowAgendaCreator(false);

        // Fire-and-forget write to Firestore with retry.
        // Firestore uses experimentalForceLongPolling + persistentSingleTabManager; when the
        // auth token refreshes (~3s after login) the long-poll connection briefly drops and
        // writes that land in that window get a transient permission-denied. Retrying once
        // after a short delay is enough to clear the reconnection window.
        const timerPayload = {
            userId: user.uid,
            userName: user.displayName || "Consultor",
            tenantId: currentTenantId,
            projectId: defaultProject?.id || "",
            projectName: defaultProject?.name || "",
            taskTypeId: defaultCategory?.id || "",
            taskTypeName: defaultCategory?.name || "",
            details: "",
            isRunning: false,
            startTime: null,
            accumulatedSeconds: 0,
            writerTabId: tabIdRef.current,
            agendaEntryId: null,
            agendaEntryLabel: null,
            updatedAt: serverTimestamp()
        };
        setDoc(newDocRef, timerPayload).catch(() => {
            setTimeout(() => {
                setDoc(newDocRef, timerPayload).catch(err =>
                    console.error("[timer] Failed to persist new timer after retry:", err)
                );
            }, 800);
        });
    };

    const handleSelectTimer = (timerId: string) => {
        isLoadingTimerRef.current = true;
        setSelectedTimerId(timerId);
        setTimeout(() => { isLoadingTimerRef.current = false; }, 150);
    };

    const handleStartTimer = async () => {
        if (!selectedTimerId) return;
        if (!linkedAgendaEntryId) {
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, "0");
            const endDate = new Date(now.getTime() + 60 * 60 * 1000);
            setAgendaCreatorComment(nowDetails || "");
            setAgendaCreatorStart(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
            setAgendaCreatorEnd(`${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`);
            setAgendaCreatorType(ActivityType.TAREAS_A_REALIZAR);
            setShowAgendaCreator(true);
            return;
        }
        await pauseAllOtherTimers(selectedTimerId);
        await updateDoc(doc(db, "activeTimers", selectedTimerId), {
            isRunning: true,
            startTime: Date.now(),
            writerTabId: tabIdRef.current,
            updatedAt: serverTimestamp()
        });
        showToast("Widget de Tareas", "Temporizador iniciado", "success");
    };

    const handleCreateAgendaAndStart = async () => {
        if (!user || !selectedTimerId || isCreatingAgendaEntry) return;
        if (!agendaCreatorComment.trim()) {
            showToast("Error", "Escribe una descripción antes de iniciar", "warning");
            return;
        }
        setIsCreatingAgendaEntry(true);
        try {
            const scheduleRaw = `${agendaCreatorStart} A ${agendaCreatorEnd}`;
            const projectObj = projects.find(p => p.id === nowProject);
            const entryId = await createAgendaEntry({
                tenantId: currentTenantId,
                consultantId: user.uid,
                consultantName: myConsultant?.name || user.displayName || "Consultor",
                consultantOrder: myConsultant?.sortOrder ?? 0,
                region: myConsultant?.region || "",
                divisionId: myConsultant?.divisions?.[0] || "",
                divisionName: myConsultant?.divisions?.[0] || "",
                date: new Date(),
                activityType: agendaCreatorType,
                comment: agendaCreatorComment,
                scheduleRaw,
                result: ResultStatus.POR_HACER,
                projectId: projectObj?.id,
                projectName: projectObj?.name,
                createdBy: user.uid,
            });
            const label = `${agendaCreatorType}: ${agendaCreatorComment} ${agendaCreatorStart}–${agendaCreatorEnd}`;
            setLinkedAgendaEntryId(entryId);
            setLinkedAgendaEntryLabel(label);

            await updateDoc(doc(db, "activeTimers", selectedTimerId), {
                agendaEntryId: entryId,
                agendaEntryLabel: label,
                writerTabId: tabIdRef.current,
                updatedAt: serverTimestamp()
            });
            await pauseAllOtherTimers(selectedTimerId);
            await updateDoc(doc(db, "activeTimers", selectedTimerId), {
                isRunning: true,
                startTime: Date.now(),
                writerTabId: tabIdRef.current,
                updatedAt: serverTimestamp()
            });
            setShowAgendaCreator(false);
            showToast("Agenda", "Entrada creada y temporizador iniciado", "success");
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo crear la entrada de agenda", "error");
        } finally {
            setIsCreatingAgendaEntry(false);
        }
    };

    const handlePauseTimer = async () => {
        if (!selectedTimerId) return;
        await updateDoc(doc(db, "activeTimers", selectedTimerId), {
            isRunning: false,
            accumulatedSeconds: secondsElapsed,
            startTime: null,
            writerTabId: tabIdRef.current,
            updatedAt: serverTimestamp()
        });
    };

    const handleToggleTimer = async (timerId: string) => {
        const timer = activeTimers.find(t => t.id === timerId);
        if (!timer) return;
        handleSelectTimer(timerId);
        if (timer.isRunning) {
            const accumulated = (timer.accumulatedSeconds ?? 0) +
                (timer.startTime ? Math.max(0, Math.floor((Date.now() - timer.startTime) / 1000)) : 0);
            await updateDoc(doc(db, "activeTimers", timerId), {
                isRunning: false,
                accumulatedSeconds: accumulated,
                startTime: null,
                writerTabId: tabIdRef.current,
                updatedAt: serverTimestamp()
            });
        } else {
            await pauseAllOtherTimers(timerId);
            await updateDoc(doc(db, "activeTimers", timerId), {
                isRunning: true,
                startTime: Date.now(),
                writerTabId: tabIdRef.current,
                updatedAt: serverTimestamp()
            });
        }
    };

    const handleDeleteTimer = async (timerId: string) => {
        optimisticTimerIdsRef.current.delete(timerId);
        if (selectedTimerId === timerId) suppressAutoSelectRef.current = true;
        await deleteDoc(doc(db, "activeTimers", timerId));
        if (selectedTimerId === timerId) setSelectedTimerId(null);
    };

    const handleSelectAgendaEntry = (entry: AgendaEntry | null) => {
        if (!entry) {
            setLinkedAgendaEntryId(null);
            setLinkedAgendaEntryLabel(null);
            return;
        }
        setLinkedAgendaEntryId(entry.id);
        setLinkedAgendaEntryLabel(
            `${entry.activityType}: ${entry.client || entry.description} ${entry.scheduleStart}–${entry.scheduleEnd}`
        );
        if (entry.projectId && !nowProject) setNowProject(entry.projectId);
    };

    const handleSaveNowTask = async () => {
        if (isSaving || !selectedTimer) return;
        suppressAutoSelectRef.current = true;

        if (secondsElapsed < 10) {
            showToast("Widget de Tareas", "La tarea debe durar al menos 10 segundos", "warning");
            return;
        }

        const projectObj = projects.find(p => p.id === nowProject);
        if (!projectObj) { showToast("Error", "Selecciona un proyecto válido", "error"); return; }
        if (!nowCategory) { showToast("Error", "Selecciona un tipo de tarea", "error"); return; }

        try {
            setIsSaving(true);
            const durationMinutes = Math.max(Math.round(secondsElapsed / 60), 1);

            await addDoc(collection(db, "consultantTasks"), {
                userId: user!.uid,
                userName: user!.displayName || "Consultor",
                tenantId: currentTenantId,
                projectId: nowProject,
                projectName: projectObj.name,
                taskTypeId: nowCategory.id,
                taskTypeName: nowCategory.name,
                details: nowDetails,
                durationMinutes,
                agendaEntryId: linkedAgendaEntryId ?? null,
                type: "live",
                createdAt: serverTimestamp()
            });

            // Feedback to agenda entry
            if (linkedAgendaEntryId) {
                await updateDoc(doc(db, "agenda_entries", linkedAgendaEntryId), {
                    actualMinutes: increment(durationMinutes),
                    updatedAt: serverTimestamp()
                });
            }

            await updateDoc(doc(db, "taskTypes", nowCategory.id), { usageCount: increment(1) });
            optimisticTimerIdsRef.current.delete(selectedTimer.id);
            await deleteDoc(doc(db, "activeTimers", selectedTimer.id));

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
            setSelectedTimerId(null);
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo registrar la tarea", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveRetroTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        const projectObj = projects.find(p => p.id === retroProject);
        if (!projectObj) { showToast("Error", "Selecciona un proyecto válido", "error"); return; }
        if (!retroCategory) { showToast("Error", "Selecciona un tipo de tarea", "error"); return; }
        try {
            setIsSaving(true);
            await addDoc(collection(db, "consultantTasks"), {
                userId: user!.uid,
                userName: user!.displayName || "Consultor",
                tenantId: currentTenantId,
                projectId: retroProject,
                projectName: projectObj.name,
                taskTypeId: retroCategory.id,
                taskTypeName: retroCategory.name,
                details: retroDetails,
                durationMinutes: Number(retroDuration),
                agendaEntryId: retroLinkedAgendaEntryId ?? null,
                type: "retroactive",
                createdAt: serverTimestamp()
            });
            if (retroLinkedAgendaEntryId) {
                await updateDoc(doc(db, "agenda_entries", retroLinkedAgendaEntryId), {
                    actualMinutes: increment(Number(retroDuration)),
                    updatedAt: serverTimestamp()
                });
            }
            await updateDoc(doc(db, "taskTypes", retroCategory.id), { usageCount: increment(1) });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
            setRetroDetails("");
            setRetroDuration(15);
            setRetroLinkedAgendaEntryId(null);
            setRetroLinkedAgendaEntryLabel(null);
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo registrar la tarea retroactiva", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartEditTask = (task: ConsultantTask) => {
        setEditingTask(task);
        setEditDuration(task.durationMinutes);
        setEditDetails(task.details || "");
        setActiveTab("edit");
    };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask || isSaving) return;
        try {
            setIsSaving(true);
            await updateDoc(doc(db, "consultantTasks", editingTask.id), {
                durationMinutes: Number(editDuration),
                details: editDetails,
                updatedAt: serverTimestamp()
            });
            showToast("Widget", "Tarea actualizada", "success");
            setEditingTask(null);
            setActiveTab("today");
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo guardar la modificación", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUndoTask = async (id: string, taskTypeId: string) => {
        try {
            await deleteDoc(doc(db, "consultantTasks", id));
            await updateDoc(doc(db, "taskTypes", taskTypeId), { usageCount: increment(-1) });
            showToast("Widget de Tareas", "Registro eliminado", "info");
        } catch (err) {
            console.error(err);
            showToast("Error", "No se pudo deshacer la tarea", "error");
        }
    };

    const handleCopyToClipboardMD = () => {
        if (todayTasks.length === 0) return;
        const dateStr = new Date().toLocaleDateString();
        let md = `### 📋 Actividades Imputadas - ${dateStr}\n\n`;
        todayTasks.forEach(t => {
            md += `* **[${t.projectName}]** _${t.taskTypeName}_ (${t.durationMinutes} min) - ${t.details || "Sin detalles"}\n`;
        });
        navigator.clipboard.writeText(md)
            .then(() => showToast("Copiado", "Actividades copiadas en formato Markdown para Jira", "success"))
            .catch(() => showToast("Error", "No se pudo copiar la información", "error"));
    };

    // ── Totals ────────────────────────────────────────────────────────────────

    const dailyTotalMinutes = useMemo(
        () => todayTasks.reduce((s, t) => s + (Number(t.durationMinutes) || 0), 0),
        [todayTasks]
    );

    const formattedDailyTotal = useMemo(() => {
        const hrs = Math.floor(dailyTotalMinutes / 60);
        const mins = dailyTotalMinutes % 60;
        return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}h`;
    }, [dailyTotalMinutes]);

    // ── Glass style ───────────────────────────────────────────────────────────

    const glassStyleClass = embedded
        ? cn(
            "w-full rounded-2xl border overflow-hidden flex flex-col mb-6 shadow-md transition-all duration-300",
            theme === "light" ? "bg-white border-zinc-200 text-zinc-900"
            : theme === "red"  ? "bg-[#6A251A]/40 border-[#A33D2D]/20 text-white"
            : "bg-card border-border text-white"
          )
        : cn(
            "fixed bottom-24 right-6 w-96 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform origin-bottom-right z-[100] overflow-hidden",
            isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-75 opacity-0 translate-y-10 pointer-events-none",
            theme === "light" ? "bg-white/80 border-black/10 shadow-black/20 text-zinc-900"
            : theme === "red"  ? "bg-[#6A251A]/90 border-[#A33D2D]/30 shadow-black/40 text-white"
            : "bg-zinc-900/80 border-white/10 shadow-black/50 text-white"
          );

    if (!user) return null;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <div className={glassStyleClass}>

                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <Lucide.Timer className="w-5 h-5 text-primary animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider">Control de Tareas</span>
                        <span className="text-[10px] font-black bg-primary/15 text-primary px-2 py-0.5 rounded-md border border-primary/20 ml-1.5" title="Total hoy">
                            {formattedDailyTotal}
                        </span>
                    </div>
                    {timerActive && (
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-mono font-black text-emerald-500">{formatTimer(secondsElapsed)}</span>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                {activeTab !== "edit" && (
                    <div className="flex border-b border-white/5 text-center text-xs font-bold bg-white/2">
                        {(["now", "retro", "today"] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex-1 py-2.5 transition-all relative border-b-2",
                                    activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                )}>
                                {tab === "now" ? "Ahora mismo" : tab === "retro" ? "Bloque anterior" : `Hoy (${todayTasks.length})`}
                            </button>
                        ))}
                    </div>
                )}

                {/* Success banner */}
                {saveSuccess && (
                    <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 p-3 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-300">
                        <Lucide.CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ¡Tarea registrada con éxito!
                    </div>
                )}

                {/* Content */}
                <div className="p-4 max-h-[32rem] overflow-y-auto custom-scrollbar">

                    {/* ── EDIT ─────────────────────────────────────────────── */}
                    {activeTab === "edit" && editingTask && (
                        <form onSubmit={handleUpdateTask} className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-primary/20 text-primary rounded-lg"><Lucide.Edit2 className="w-3.5 h-3.5" /></div>
                                    <h3 className="text-xs font-black uppercase tracking-wide">Modificar Tarea</h3>
                                </div>
                                <button type="button" onClick={() => { setEditingTask(null); setActiveTab("today"); }}
                                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-all">
                                    Volver
                                </button>
                            </div>

                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                                <p className="text-[9px] font-black text-primary uppercase tracking-widest truncate">{editingTask.projectName}</p>
                                <h4 className="text-xs font-bold text-zinc-200">{editingTask.taskTypeName}</h4>
                            </div>

                            <div className="space-y-1 bg-white/2 border border-white/5 p-2.5 rounded-xl">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Lucide.Clock className="w-3 h-3" /> Duración
                                    </span>
                                    <span className="font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{editDuration} min</span>
                                </div>
                                <input type="range" min="1" max="240" step="5" value={editDuration}
                                    onChange={e => setEditDuration(Number(e.target.value))} className="w-full accent-emerald-500 mt-2" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                    <Lucide.FileText className="w-3 h-3" /> Detalles
                                </label>
                                <textarea value={editDetails} onChange={e => setEditDetails(e.target.value)}
                                    placeholder="Actualiza la descripción..." rows={4}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-emerald-500 resize-none leading-relaxed font-medium" />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => { setEditingTask(null); setActiveTab("today"); }}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2 px-4 rounded-xl text-xs transition-all">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSaving}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50">
                                    <Lucide.CheckCircle2 className="w-3.5 h-3.5" />
                                    {isSaving ? "Guardando..." : "Actualizar"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── NOW ──────────────────────────────────────────────── */}
                    {activeTab === "now" && (
                        <div className="space-y-3">

                            {/* Timer list */}
                            {activeTimers.length > 0 && (
                                <div className="space-y-1.5">
                                    {activeTimers.map(timer => {
                                        const elapsed = getTimerElapsed(timer);
                                        const isSelected = timer.id === selectedTimerId;
                                        return (
                                            <div key={timer.id} onClick={() => handleSelectTimer(timer.id)}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all",
                                                    isSelected ? "bg-primary/10 border-primary/30" : "bg-white/3 border-white/5 hover:border-white/10"
                                                )}>
                                                {/* Quick play/pause */}
                                                <button type="button"
                                                    onClick={e => { e.stopPropagation(); handleToggleTimer(timer.id); }}
                                                    className={cn(
                                                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                                        timer.isRunning
                                                            ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                                            : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                                    )}>
                                                    {timer.isRunning ? <Lucide.Pause className="w-3.5 h-3.5" /> : <Lucide.Play className="w-3.5 h-3.5" />}
                                                </button>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black text-primary truncate">{timer.projectName || "Sin proyecto"}</p>
                                                    {timer.agendaEntryLabel && (
                                                        <p className="text-[9px] text-violet-400 truncate flex items-center gap-1">
                                                            <Lucide.CalendarCheck className="w-2.5 h-2.5 shrink-0" />
                                                            {timer.agendaEntryLabel}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Elapsed */}
                                                <span className={cn(
                                                    "text-[10px] font-mono font-black shrink-0",
                                                    timer.isRunning ? "text-emerald-400" : "text-zinc-400"
                                                )}>
                                                    {formatTimer(elapsed)}
                                                </span>

                                                {/* Delete */}
                                                <button type="button"
                                                    onClick={e => { e.stopPropagation(); handleDeleteTimer(timer.id); }}
                                                    className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                                                    <Lucide.Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* New timer */}
                            <button onClick={handleNewTimer}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black text-muted-foreground hover:text-foreground border border-dashed border-white/10 hover:border-white/20 rounded-xl transition-all">
                                <Lucide.Plus className="w-3 h-3" />
                                Nuevo temporizador
                            </button>

                            {/* Form for selected timer */}
                            {selectedTimer && (
                                <div className="space-y-3 pt-2 border-t border-white/5">

                                    {/* Project */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Proyecto</label>
                                        <select value={nowProject} onChange={e => setNowProject(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary">
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id} className="bg-zinc-900 text-white">{p.name}</option>
                                            ))}
                                            {projects.length === 0 && <option value="">No hay proyectos activos</option>}
                                        </select>
                                    </div>

                                    {/* Activity pills */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Actividad</label>
                                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                                            {taskTypes.map(type => {
                                                const sel = nowCategory?.id === type.id;
                                                return (
                                                    <button key={type.id} type="button" onClick={() => setNowCategory(type)}
                                                        className={cn(
                                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                                                            sel ? "text-white scale-105 border-white/20" : "bg-black/20 text-muted-foreground border-white/5 hover:border-white/10 hover:text-foreground"
                                                        )}
                                                        style={{ backgroundColor: sel ? type.color : "" }}>
                                                        <DynamicLucideIcon name={type.icon} className="w-3 h-3" />
                                                        {type.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">¿Qué estás haciendo?</label>
                                        <textarea value={nowDetails} onChange={e => setNowDetails(e.target.value)}
                                            placeholder="Describe brevemente tu labor actual..." rows={3}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary resize-none leading-relaxed" />
                                    </div>

                                    {/* Agenda linkage selector */}
                                    {todayAgendaEntries.length > 0 && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                                <Lucide.CalendarCheck className="w-3 h-3 text-violet-400" />
                                                Vincular a agenda de hoy
                                            </label>
                                            <select
                                                value={linkedAgendaEntryId ?? ""}
                                                onChange={e => {
                                                    const entry = todayAgendaEntries.find(a => a.id === e.target.value) ?? null;
                                                    handleSelectAgendaEntry(entry);
                                                }}
                                                className="w-full bg-black/40 border border-violet-500/20 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-violet-400 text-violet-300">
                                                <option value="" className="bg-zinc-900 text-zinc-400">Sin vincular</option>
                                                {todayAgendaEntries.map(entry => (
                                                    <option key={entry.id} value={entry.id} className="bg-zinc-900 text-white">
                                                        {entry.activityType}: {entry.client || entry.description} {entry.scheduleStart}–{entry.scheduleEnd}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Agenda creator (shown when Iniciar pressed with no linked entry) */}
                                    {showAgendaCreator && (
                                        <div className="space-y-2.5 pt-2 border-t border-violet-500/20 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 flex items-center gap-1">
                                                    <Lucide.CalendarPlus className="w-3 h-3" />
                                                    Crear entrada de agenda
                                                </span>
                                                <button type="button" onClick={() => setShowAgendaCreator(false)}
                                                    className="text-zinc-500 hover:text-zinc-300 transition-colors">
                                                    <Lucide.X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <select
                                                value={agendaCreatorType}
                                                onChange={e => setAgendaCreatorType(e.target.value as ActivityType)}
                                                className="w-full bg-black/40 border border-violet-500/20 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-violet-400 text-violet-200">
                                                {Object.values(ActivityType).map(at => (
                                                    <option key={at} value={at} className="bg-zinc-900 text-white">{at}</option>
                                                ))}
                                            </select>
                                            <textarea
                                                value={agendaCreatorComment}
                                                onChange={e => setAgendaCreatorComment(e.target.value)}
                                                placeholder="Descripción (ej: CLIENTE / Detalle de la tarea)"
                                                rows={2}
                                                className="w-full bg-black/40 border border-violet-500/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400 resize-none leading-relaxed text-violet-100 placeholder:text-zinc-500" />
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 space-y-0.5">
                                                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider">Inicio</label>
                                                    <input type="time" value={agendaCreatorStart}
                                                        onChange={e => setAgendaCreatorStart(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-violet-400" />
                                                </div>
                                                <Lucide.ArrowRight className="w-3 h-3 text-zinc-500 mt-4 shrink-0" />
                                                <div className="flex-1 space-y-0.5">
                                                    <label className="text-[9px] text-zinc-500 uppercase tracking-wider">Fin</label>
                                                    <input type="time" value={agendaCreatorEnd}
                                                        onChange={e => setAgendaCreatorEnd(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-violet-400" />
                                                </div>
                                            </div>
                                            <button type="button" onClick={handleCreateAgendaAndStart}
                                                disabled={isCreatingAgendaEntry || !agendaCreatorComment.trim()}
                                                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                                {isCreatingAgendaEntry
                                                    ? <><Lucide.Loader2 className="w-3.5 h-3.5 animate-spin" /> Creando...</>
                                                    : <><Lucide.Play className="w-3.5 h-3.5" /> Crear e Iniciar</>
                                                }
                                            </button>
                                        </div>
                                    )}

                                    {/* Timer actions */}
                                    {!showAgendaCreator && (
                                    <div className="flex gap-2.5 pt-1">
                                        {!timerActive ? (
                                            <button onClick={handleStartTimer}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg">
                                                <Lucide.Play className="w-3.5 h-3.5" /> Iniciar
                                            </button>
                                        ) : (
                                            <button onClick={handlePauseTimer}
                                                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg">
                                                <Lucide.Pause className="w-3.5 h-3.5" /> Pausar
                                            </button>
                                        )}
                                        <button onClick={handleSaveNowTask} disabled={secondsElapsed === 0}
                                            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                                            <Lucide.Save className="w-3.5 h-3.5" />
                                            {isSaving ? "Guardando..." : "Guardar"}
                                        </button>
                                    </div>
                                    )}
                                </div>
                            )}

                            {activeTimers.length === 0 && (
                                <div className="text-center py-8 text-zinc-500 text-xs italic">
                                    Crea un temporizador para empezar a imputar
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── RETRO ────────────────────────────────────────────── */}
                    {activeTab === "retro" && (
                        <form onSubmit={handleSaveRetroTask} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Proyecto</label>
                                <select value={retroProject} onChange={e => setRetroProject(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary">
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id} className="bg-zinc-900 text-white">{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Actividad</label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                    {taskTypes.map(type => {
                                        const sel = retroCategory?.id === type.id;
                                        return (
                                            <button key={type.id} type="button" onClick={() => setRetroCategory(type)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                                                    sel ? "text-white scale-105 border-white/20" : "bg-black/20 text-muted-foreground border-white/5 hover:border-white/10 hover:text-foreground"
                                                )}
                                                style={{ backgroundColor: sel ? type.color : "" }}>
                                                <DynamicLucideIcon name={type.icon} className="w-3 h-3" />
                                                {type.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Agenda linkage — same concept as "now" tab but duration comes from slider */}
                            {todayAgendaEntries.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                                        <Lucide.CalendarCheck className="w-3 h-3 text-violet-400" />
                                        Vincular a agenda de hoy
                                    </label>
                                    <select
                                        value={retroLinkedAgendaEntryId ?? ""}
                                        onChange={e => {
                                            const entry = todayAgendaEntries.find(a => a.id === e.target.value) ?? null;
                                            if (!entry) {
                                                setRetroLinkedAgendaEntryId(null);
                                                setRetroLinkedAgendaEntryLabel(null);
                                            } else {
                                                setRetroLinkedAgendaEntryId(entry.id);
                                                setRetroLinkedAgendaEntryLabel(
                                                    `${entry.activityType}: ${entry.client || entry.description} ${entry.scheduleStart}–${entry.scheduleEnd}`
                                                );
                                                if (entry.projectId && !retroProject) setRetroProject(entry.projectId);
                                            }
                                        }}
                                        className="w-full bg-black/40 border border-violet-500/20 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-violet-400 text-violet-300">
                                        <option value="" className="bg-zinc-900 text-zinc-400">Sin vincular</option>
                                        {todayAgendaEntries.map(entry => (
                                            <option key={entry.id} value={entry.id} className="bg-zinc-900 text-white">
                                                {entry.activityType}: {entry.client || entry.description} {entry.scheduleStart}–{entry.scheduleEnd}
                                            </option>
                                        ))}
                                    </select>
                                    {retroLinkedAgendaEntryId && (
                                        <p className="text-[9px] text-violet-400 flex items-center gap-1">
                                            <Lucide.Info className="w-2.5 h-2.5 shrink-0" />
                                            Se añadirán {retroDuration} min a esta entrada de agenda
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1 bg-white/2 border border-white/5 p-2 rounded-xl">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-black text-muted-foreground uppercase tracking-wider">Duración (minutos)</span>
                                    <span className="font-mono font-bold text-primary">{retroDuration} min</span>
                                </div>
                                <input type="range" min="5" max="240" step="5" value={retroDuration}
                                    onChange={e => setRetroDuration(Number(e.target.value))} className="w-full accent-primary mt-2" />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Detalle</label>
                                <textarea value={retroDetails} onChange={e => setRetroDetails(e.target.value)}
                                    placeholder="¿Qué lograste hacer en este bloque de tiempo?..." rows={3}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary resize-none leading-relaxed" />
                            </div>

                            <button type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg mt-2">
                                <Lucide.Plus className="w-3.5 h-3.5" /> Registrar Bloque
                            </button>
                        </form>
                    )}

                    {/* ── TODAY ────────────────────────────────────────────── */}
                    {activeTab === "today" && (
                        <div className="space-y-3">
                            {todayTasks.length > 0 && (
                                <button onClick={handleCopyToClipboardMD}
                                    className="w-full mb-3 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 hover:border-primary/45 rounded-xl py-2 px-4 text-[10px] font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm">
                                    <Lucide.Copy className="w-3.5 h-3.5" />
                                    Copiar para Jira (Markdown)
                                </button>
                            )}

                            {todayTasks.length === 0 ? (
                                <div className="text-center py-10 text-zinc-500 text-xs italic">
                                    No has registrado tareas en el día de hoy
                                </div>
                            ) : (
                                todayTasks.map(task => (
                                    <div key={task.id}
                                        className="p-3 bg-white/2 border border-white/5 rounded-xl flex items-start justify-between gap-3 group/row hover:border-white/10 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-black max-w-[125px] truncate">
                                                    {task.projectName}
                                                </span>
                                                <span className="text-[10px] bg-zinc-800 text-zinc-200 border border-white/10 px-2 py-0.5 rounded-full font-bold">
                                                    {task.taskTypeName}
                                                </span>
                                                <span className="text-[10px] font-mono text-zinc-400 font-bold ml-auto shrink-0">
                                                    {task.durationMinutes} min
                                                </span>
                                            </div>
                                            {task.agendaEntryId && (
                                                <p className="text-[9px] text-violet-400 mt-0.5 flex items-center gap-1 truncate">
                                                    <Lucide.CalendarCheck className="w-2.5 h-2.5 shrink-0" />
                                                    Vinculado a agenda
                                                </p>
                                            )}
                                            <p className="text-xs leading-relaxed mt-1.5 text-zinc-700 dark:text-zinc-200 font-medium break-words line-clamp-2">
                                                {task.details || <span className="text-zinc-500 italic">Sin detalle técnico</span>}
                                            </p>
                                        </div>
                                        <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 shrink-0 transition-all">
                                            <button onClick={() => handleStartEditTask(task)}
                                                className="p-1.5 hover:bg-primary/10 text-zinc-500 hover:text-primary rounded transition-all" title="Editar">
                                                <Lucide.Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleUndoTask(task.id, task.taskTypeId)}
                                                className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded transition-all" title="Eliminar">
                                                <Lucide.Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* FAB */}
            {!embedded && (
                <button onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl hover:scale-110 active:scale-95 group z-[110] border border-white/10",
                        isOpen
                            ? "bg-zinc-800 text-white rotate-45"
                            : theme === "red"
                            ? "bg-[#9E4839] text-white hover:bg-[#B15343] hover:shadow-[#9E4839]/30"
                            : "bg-primary text-white hover:bg-primary/95 hover:shadow-primary/30"
                    )}>
                    <Lucide.Plus className="w-7 h-7 group-hover:scale-110 transition-transform" />
                </button>
            )}
        </>
    );
}
