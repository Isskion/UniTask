"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Shield,
    Zap,
    Users,
    FileText,
    Activity,
    AlertTriangle,
    Power,
    CheckCircle2,
    XCircle,
    BarChart3,
    TrendingUp,
    Clock,
    Settings,
    ChevronRight,
    Search,
    MessageSquare,
    Filter
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    where,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, isAfter, isBefore } from 'date-fns';

interface AIUsageLog {
    id: string;
    userId: string;
    tenantId: string;
    action: string;
    charsIn: number;
    charsOut: number;
    estimatedTokens: number;
    timestamp: any;
    model: string;
}

interface TenantConfig {
    id: string;
    name: string;
    aiEnabled: boolean;
    dailyFileLimit?: number;
    userCount?: number;
}

export default function AppManagement() {
    const { user, userRole, identity } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();

    // State
    const [loading, setLoading] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);
    const [logs, setLogs] = useState<AIUsageLog[]>([]);
    const [tenants, setTenants] = useState<TenantConfig[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [globalConfig, setGlobalConfig] = useState<{ aiGlobalEnabled: boolean }>({ aiGlobalEnabled: true });
    const [searchQuery, setSearchQuery] = useState("");
    const [timeRange, setTimeRange] = useState(7); // Days
    const [activeMetric, setActiveMetric] = useState<'chars' | 'docs' | 'users' | 'calls' | 'questions'>('chars');
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Metric Configuration - Aligned with Corporate Red/Black
    const metricConfig = {
        chars: { label: "Caracteres", color: "#ef4444", icon: <Activity className="w-4 h-4" /> },
        docs: { label: "Documentos", color: "#dc2626", icon: <FileText className="w-4 h-4" /> },
        users: { label: "Usuarios", color: "#b91c1c", icon: <Users className="w-4 h-4" /> },
        calls: { label: "Llamadas IA", color: "#991b1b", icon: <Zap className="w-4 h-4" /> },
        questions: { label: "Consultas Chat", color: "#7f1d1d", icon: <MessageSquare className="w-4 h-4" /> },
    };

    const filteredUsers = useMemo(() => {
        // [Refinement] Exclude superadmins from population counts (as per user request)
        let list = allUsers.filter(u => u.role !== 'superadmin');
        if (selectedTenantId) {
            list = list.filter(u => String(u.tenantId).toLowerCase() === String(selectedTenantId).toLowerCase());
        }
        return list;
    }, [allUsers, selectedTenantId]);

    const filteredLogs = useMemo(() => {
        // [Refinement] Exclude logs from superadmins to keep AI metrics pure
        const superadminIds = new Set(allUsers.filter(u => u.role === 'superadmin').map(u => u.id));
        let list = logs.filter(l => !superadminIds.has(l.userId));

        if (selectedTenantId) {
            list = list.filter(l => String(l.tenantId).toLowerCase() === String(selectedTenantId).toLowerCase());
        }
        return list;
    }, [logs, selectedTenantId, allUsers]);

    // Stats with Trend calculation
    const stats = useMemo(() => {
        const now = new Date();
        const startOfCurrent = subDays(now, timeRange);
        const startOfPrevious = subDays(now, timeRange * 2);

        const currentLogs = filteredLogs.filter(l => l.timestamp && isAfter(l.timestamp.toDate(), startOfCurrent));
        const previousLogs = filteredLogs.filter(l => l.timestamp && isAfter(l.timestamp.toDate(), startOfPrevious) && isBefore(l.timestamp.toDate(), startOfCurrent));

        const getMetrics = (lData: AIUsageLog[]) => ({
            calls: lData.length,
            chars: lData.reduce((acc, log) => acc + log.charsIn + log.charsOut, 0),
            users: new Set(lData.map(log => log.userId)).size,
            docs: lData.filter(l => l.action.includes('analyze')).length,
            questions: lData.filter(l => l.action === 'chat_assistant').length,
        });

        const current = getMetrics(currentLogs);
        const previous = getMetrics(previousLogs);

        // [Accuracy Refinement]
        // Primary 'Users' metric should show who used the IA in the selected range (e.g. 1 or 2 as user expects)
        const activeAIUsers = current.users;
        const totalRegisteredUsers = filteredUsers.length;

        const calcTrend = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        return {
            ...current,
            activeAIUsers,
            totalPopulation: totalRegisteredUsers,
            trends: {
                calls: calcTrend(current.calls, previous.calls),
                chars: calcTrend(current.chars, previous.chars),
                users: calcTrend(activeAIUsers, previous.users),
                docs: calcTrend(current.docs, previous.docs),
                questions: calcTrend(current.questions, previous.questions),
            },
            hasData: currentLogs.length > 0 || previousLogs.length > 0
        };
    }, [filteredLogs, filteredUsers, timeRange]);

    // Chart Data
    const chartData = useMemo(() => {
        const dataMap = new Map();

        // Initialize range
        for (let i = timeRange - 1; i >= 0; i--) {
            const date = format(subDays(new Date(), i), 'dd/MM');
            dataMap.set(date, {
                name: date,
                value: 0,
                uniqueUsers: new Set<string>()
            });
        }

        filteredLogs.forEach(log => {
            if (!log.timestamp) return;
            const date = format(log.timestamp.toDate(), 'dd/MM');
            if (dataMap.has(date)) {
                const dayData = dataMap.get(date);

                let valToAdd = 0;
                switch (activeMetric) {
                    case 'chars': valToAdd = log.charsIn + log.charsOut; break;
                    case 'docs': if (log.action.includes('analyze')) valToAdd = 1; break;
                    case 'calls': valToAdd = 1; break;
                    case 'questions': if (log.action === 'chat_assistant') valToAdd = 1; break;
                    case 'users':
                        dayData.uniqueUsers.add(log.userId);
                        return; // Users are handled differently
                }

                dayData.value += valToAdd;
            }
        });

        return Array.from(dataMap.values()).map(d => ({
            name: d.name,
            value: activeMetric === 'users' ? d.uniqueUsers.size : d.value
        }));
    }, [filteredLogs, timeRange, activeMetric]);

    // Usage by Tenant (always based on all logs for ranking) - Normalized
    const tenantUsage = useMemo(() => {
        const map = new Map<string, { id: string; name: string; chars: number; calls: number }>();

        logs.forEach(log => {
            const rawId = String(log.tenantId);
            const normalizedId = rawId.toLowerCase();
            const tenant = tenants.find(t => String(t.id).toLowerCase() === normalizedId);
            const tenantDisplayName = tenant?.name || rawId;

            if (!map.has(normalizedId)) {
                map.set(normalizedId, { id: normalizedId, name: tenantDisplayName, chars: 0, calls: 0 });
            }

            const current = map.get(normalizedId)!;
            map.set(normalizedId, {
                ...current,
                chars: current.chars + log.charsIn + log.charsOut,
                calls: current.calls + 1
            });
        });

        return Array.from(map.values()).sort((a, b) => b.chars - a.chars);
    }, [logs, tenants]);

    // Real-time Subscriptions
    useEffect(() => {
        if (userRole !== 'superadmin') return;

        setLoading(true);

        // 1. Global Config
        const unsubConfig = onSnapshot(doc(db, "app_config", "global"), (snap) => {
            if (snap.exists()) {
                setGlobalConfig(snap.data() as any);
            }
        });

        // 2. Tenants
        const unsubTenants = onSnapshot(collection(db, "tenants"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as TenantConfig));
            setTenants(list);
        });

        // 3. Logs (Fetch last N*2 days to allow for trend comparison)
        const startDate = startOfDay(subDays(new Date(), timeRange * 2));
        const q = query(
            collection(db, "ai_performance_logs"),
            where("timestamp", ">=", startDate),
            orderBy("timestamp", "desc")
        );

        const unsubLogs = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AIUsageLog));
            setLogs(list);
            setLoading(false);
        });

        // 4. Users (Real-time Full Population)
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubConfig();
            unsubTenants();
            unsubLogs();
            unsubUsers();
        };
    }, [userRole, timeRange]);

    // Handlers
    const toggleGlobalAI = async () => {
        const newValue = !globalConfig.aiGlobalEnabled;
        const confirmMsg = newValue
            ? "¿Estás seguro de que quieres habilitar la IA globalmente?"
            : "¡ATENCIÓN! Esto desactivará TODAS las funciones de IA inmediatamente. ¿Deseas continuar?";

        if (!confirm(confirmMsg)) return;

        try {
            await updateDoc(doc(db, "app_config", "global"), {
                aiGlobalEnabled: newValue,
                lastUpdated: serverTimestamp(),
                updatedBy: user?.uid
            });
            showToast("UniTask Admin", newValue ? "IA Activada globalmente" : "IA DESACTIVADA globalmente", newValue ? "success" : "warning");
        } catch (e) {
            console.error(e);
            showToast("Error", "No se pudo actualizar la configuración global.", "error");
        }
    };

    const toggleTenantAI = async (tenantId: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "tenants", tenantId), {
                aiEnabled: !currentStatus,
                updatedAt: serverTimestamp()
            });
            showToast("Tenant Management", `IA ${!currentStatus ? 'activada' : 'desactivada'} para el tenant`, "success");
        } catch (e) {
            console.error(e);
            showToast("Error", "Fallo al actualizar el tenant.", "error");
        }
    };

    const updateDailyLimit = async (tenantId: string, limit: number) => {
        try {
            await updateDoc(doc(db, "tenants", tenantId), {
                dailyFileLimit: limit,
                updatedAt: serverTimestamp()
            });
            showToast("Tenant Management", `Límite diario actualizado a ${limit} archivos`, "info");
        } catch (e) {
            console.error(e);
            showToast("Error", "No se pudo actualizar el límite.", "error");
        }
    };

    // [UPDATED] Use REAL identity for security, not the simulated viewContext role
    const isActuallySuperAdmin = identity?.realRole === 100;

    if (!isActuallySuperAdmin) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <Shield className="w-16 h-16 text-primary mb-4 opacity-20" />
                <h2 className="text-xl font-bold text-foreground mb-2">Acceso Restringido</h2>
                <p className="text-muted-foreground max-w-sm">Solo los superadministradores de UniTask pueden acceder a este panel de control.</p>
            </div>
        );
    }

    if (!isHydrated) return null;

    return (
        <div className="absolute inset-0 z-10 flex flex-col p-4 md:p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-700 overflow-y-auto custom-scrollbar overflow-x-hidden pb-32">
            {/* Header / Emergency Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-card/60 border border-border py-12 px-10 rounded-[2.5rem] shadow-2xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />

                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-3 tracking-tighter">
                        <Shield className="w-8 h-8 md:w-10 md:h-10 text-primary animate-pulse" />
                        GESTIÓN <span className="text-primary italic">UNITASK</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-xs md:text-sm font-medium tracking-wide">Infrastructure Control & AI Governance Hub</p>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-4 bg-secondary/80 p-2 pl-6 rounded-full border border-border shadow-inner">
                    <div className="flex flex-col text-right">
                        <span className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em]">Safety Switch</span>
                        <span className={cn("text-[10px] font-bold", globalConfig.aiGlobalEnabled ? "text-primary" : "text-muted-foreground/60")}>
                            {globalConfig.aiGlobalEnabled ? "AI: OPERATIONAL" : "AI: LOCKED"}
                        </span>
                    </div>
                    <button
                        onClick={toggleGlobalAI}
                        className={cn(
                            "group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 border shadow-md",
                            globalConfig.aiGlobalEnabled
                                ? "bg-primary text-white border-primary/20 hover:scale-105"
                                : "bg-muted border-border text-muted-foreground hover:bg-primary hover:text-white"
                        )}
                        title={globalConfig.aiGlobalEnabled ? "DESACTIVAR IA GLOBAL" : "ACTIVAR IA GLOBAL"}
                    >
                        <Power className="w-5 h-5 group-active:scale-90 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between px-2">
                <div className="flex items-center gap-3 bg-card/50 border border-border rounded-xl px-4 py-2 w-full md:w-auto min-w-[320px] shadow-sm focus-within:border-primary transition-colors">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                        value={selectedTenantId || ""}
                        onChange={(e) => setSelectedTenantId(e.target.value || null)}
                        className="bg-transparent text-sm text-foreground focus:outline-none w-full appearance-none cursor-pointer font-bold uppercase tracking-tight"
                    >
                        <option value="" className="bg-background">VISTA GLOBAL</option>
                        {tenants.map(t => (
                            <option key={t.id} value={t.id} className="bg-background">{t.name || t.id}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-1 bg-card/50 border border-border rounded-xl p-1 shadow-sm">
                    {[1, 7, 30, 90].map(val => (
                        <button
                            key={val}
                            onClick={() => setTimeRange(val)}
                            className={cn(
                                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                timeRange === val
                                    ? "bg-primary text-white shadow-md scale-105"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                            {val === 1 ? 'Hoy' : `${val}d`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Caracteres"
                    value={stats.chars.toLocaleString()}
                    trend={stats.trends.chars}
                    icon={<Activity className="w-4 h-4" />}
                    accentColor="#ef4444"
                />
                <StatCard
                    title="Documentos"
                    value={stats.docs.toLocaleString()}
                    trend={stats.trends.docs}
                    icon={<FileText className="w-4 h-4" />}
                    accentColor="#ef4444"
                />
                <StatCard
                    title="Usuarios Activos"
                    value={stats.activeAIUsers.toString()}
                    subtitle={`/ ${stats.totalPopulation} total`}
                    trend={stats.trends.users}
                    icon={<Users className="w-4 h-4" />}
                    accentColor="#ef4444"
                />
                <StatCard
                    title="Llamadas IA"
                    value={stats.calls.toLocaleString()}
                    trend={stats.trends.calls}
                    icon={<Zap className="w-4 h-4" />}
                    accentColor="#ef4444"
                />
                <StatCard
                    title="Consultas Chat"
                    value={stats.questions.toLocaleString()}
                    trend={stats.trends.questions}
                    icon={<MessageSquare className="w-4 h-4" />}
                    accentColor="#ef4444"
                    isLive
                />
            </div>

            {/* Live Vitality Banner */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-1000">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Users className="w-5 h-5 text-emerald-500" />
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                    </div>
                    <div>
                        <p className="text-xs font-black text-foreground uppercase tracking-widest">Live Platform Population</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Real-time sync with UniTask Cloud</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-emerald-600 leading-none">{stats.totalPopulation}</span>
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Miembros</span>
                    </div>
                    <div className="h-8 w-px bg-emerald-500/20" />
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-foreground leading-none">{stats.activeAIUsers}</span>
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Activos Hoy</span>
                    </div>
                </div>
            </div>

            {/* Charts & Main Section - Adaptive Stack */}
            <div className="flex flex-col xl:flex-row gap-6">

                {/* Usage Chart (Main Area) */}
                <div className="flex-grow bg-card/60 border border-border rounded-3xl p-6 shadow-xl flex flex-col gap-6 relative overflow-hidden min-w-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                        <div className="flex items-center gap-4">
                            <div>
                                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                                    {metricConfig[activeMetric].icon}
                                    {metricConfig[activeMetric].label}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Live System Feed</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 bg-secondary/60 border border-border rounded-xl p-1.5 self-start sm:self-auto shadow-inner">
                            {(Object.entries(metricConfig) as [keyof typeof metricConfig, any][]).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveMetric(key)}
                                    title={config.label}
                                    className={cn(
                                        "p-2 rounded-lg transition-all duration-300",
                                        activeMetric === key
                                            ? "bg-primary text-white shadow-md scale-110"
                                            : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                                    )}
                                >
                                    {config.icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[350px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={metricConfig[activeMetric].color} stopOpacity={1} />
                                        <stop offset="100%" stopColor={metricConfig[activeMetric].color} stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="currentColor"
                                    opacity={0.5}
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={12}
                                />
                                <YAxis
                                    stroke="currentColor"
                                    opacity={0.5}
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                    tickMargin={12}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '16px',
                                        fontSize: '11px',
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                    }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="url(#barGradient)"
                                    radius={[6, 6, 0, 0]}
                                    animationDuration={1500}
                                    animationBegin={200}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Consumption by Tenant (Ranking) */}
                <div className="xl:w-[350px] shrink-0 bg-card/60 border border-border rounded-3xl p-6 shadow-lg flex flex-col gap-6 h-fit sticky top-8">
                    <h3 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        RANKING TENANTS
                    </h3>
                    <div className="space-y-4 pr-1">
                        {tenantUsage.map((item, idx) => (
                            <div key={item.id} className="group flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-black text-foreground truncate max-w-[150px] tracking-tight">{item.name}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase">{(item.chars / 1000).toFixed(1)}k chars</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border/50">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(225,29,72,0.3)]"
                                        style={{ width: `${(item.chars / (stats.chars || 1)) * 100 || 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {tenantUsage.length === 0 && (
                            <div className="py-20 text-center text-muted-foreground italic text-sm font-medium">
                                <Activity className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                No se ha registrado actividad de IA en el periodo seleccionado.
                            </div>
                        )}
                    </div>
                    <div className="mt-auto pt-6 border-t border-border">
                        <p className="text-[10px] text-muted-foreground leading-relaxed uppercase font-black tracking-widest opacity-60">
                            <AlertTriangle className="inline w-3 h-3 mr-2 text-primary" />
                            Monitoreo exclusivo de modelos Gemini vía SecurePrompt.
                        </p>
                    </div>
                </div>

            </div>

            {/* Tenant Tracking & Consumption Area */}
            <div className="bg-card/40 border border-border rounded-3xl p-6 md:p-10 mt-12 shadow-xl backdrop-blur-md relative">
                <div className="absolute -top-3.5 left-8 bg-primary text-white px-4 py-1 rounded-lg text-[9px] font-black tracking-[0.2em] shadow-lg">
                    ADMINISTRACIÓN POR TENANT
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 px-2">
                    <div>
                        <h2 className="text-xl font-black text-foreground flex items-center gap-3 tracking-tight">
                            <Users className="w-6 h-6 text-primary" />
                            CONSUMOS & LÍMITES
                        </h2>
                        <p className="text-muted-foreground text-[11px] mt-0.5 font-bold uppercase tracking-tight">Control de acceso y cuotas operativas</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar organización..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-secondary/50 border border-border rounded-xl pl-12 pr-6 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary w-full md:w-[350px] transition-all shadow-inner font-bold"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead>
                            <tr className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                                <th className="px-6 py-4">Tenant / Cliente</th>
                                <th className="px-6 py-4">ID Sistema</th>
                                <th className="px-6 py-4 text-center">Estado IA</th>
                                <th className="px-6 py-4">Cuota Diaria (IA)</th>
                                <th className="px-6 py-4">Límite Docs</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.filter(t => t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.includes(searchQuery)).map(tenant => (
                                <tr key={tenant.id} className="group transition-all duration-300">
                                    <td className="px-6 py-6 bg-card/60 rounded-l-2xl border-l border-y border-border group-hover:bg-accent transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center font-black text-lg text-primary shadow-sm border border-border/10">
                                                {tenant.name?.[0] || 'T'}
                                            </div>
                                            <span className="text-sm font-black text-foreground tracking-tight">{tenant.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 bg-card/60 border-y border-border group-hover:bg-accent transition-colors text-xs font-mono text-muted-foreground">
                                        {tenant.id}
                                    </td>
                                    <td className="px-6 py-6 bg-card/60 border-y border-border group-hover:bg-accent transition-colors">
                                        <div className="flex justify-center">
                                            {tenant.aiEnabled !== false ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black border border-primary/20 shadow-sm">
                                                    <CheckCircle2 className="w-3 h-3" /> ACTIVO
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-[9px] font-black border border-border shadow-sm">
                                                    <XCircle className="w-3 h-3" /> BLOQUEADO
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 bg-card/60 border-y border-border group-hover:bg-accent transition-colors">
                                        <div className="flex flex-col gap-3 min-w-[180px]">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    defaultValue={tenant.aiDailyLimit || 100}
                                                    onBlur={async (e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        await updateDoc(doc(db, "tenants", tenant.id), {
                                                            aiDailyLimit: val,
                                                            updatedAt: serverTimestamp()
                                                        });
                                                    }}
                                                    className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary transition-all text-center font-black shadow-inner"
                                                />
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Llamadas</span>
                                            </div>
                                            {(() => {
                                                const normalizedTenantId = String(tenant.id).toLowerCase();
                                                const todayLogs = logs.filter(l =>
                                                    String(l.tenantId).toLowerCase() === normalizedTenantId &&
                                                    l.timestamp && isAfter(l.timestamp.toDate(), startOfDay(new Date()))
                                                ).length;
                                                const limit = tenant.aiDailyLimit || 100;
                                                const percent = Math.min((todayLogs / limit) * 100, 100);

                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-border/10">
                                                            <div
                                                                className={cn(
                                                                    "h-full transition-all duration-1000",
                                                                    percent >= 100 ? "bg-primary" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"
                                                                )}
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between items-center text-[7px] uppercase font-black px-0.5">
                                                            <span className="text-muted-foreground">Uso Generales</span>
                                                            <span className="text-foreground">{todayLogs}/{limit}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 bg-card/60 border-y border-border group-hover:bg-accent transition-colors">
                                        <div className="flex flex-col gap-3 min-w-[150px]">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    defaultValue={tenant.dailyFileLimit || 5}
                                                    onBlur={async (e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        await updateDoc(doc(db, "tenants", tenant.id), {
                                                            dailyFileLimit: val,
                                                            updatedAt: serverTimestamp()
                                                        });
                                                    }}
                                                    className="w-16 bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary transition-all text-center font-black shadow-inner"
                                                />
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Archivos</span>
                                            </div>
                                            {(() => {
                                                const normalizedTenantId = String(tenant.id).toLowerCase();
                                                const fileUsageCount = logs.filter(l =>
                                                    String(l.tenantId).toLowerCase() === normalizedTenantId &&
                                                    (l.action.includes('analyze') || l.action.includes('pdf') || l.action.includes('document')) &&
                                                    l.timestamp && isAfter(l.timestamp.toDate(), startOfDay(new Date()))
                                                ).length;
                                                const limit = tenant.dailyFileLimit || 5;
                                                const percent = Math.min((fileUsageCount / limit) * 100, 100);

                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden border border-border/10">
                                                            <div
                                                                className={cn(
                                                                    "h-full transition-all duration-1000",
                                                                    percent >= 100 ? "bg-primary" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"
                                                                )}
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between items-center text-[7px] uppercase font-black px-0.5">
                                                            <span className="text-muted-foreground">Uso Docs</span>
                                                            <span className="text-foreground">{fileUsageCount}/{limit}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 bg-card/60 rounded-r-2xl border-r border-y border-border group-hover:bg-accent transition-colors text-right">
                                        <button
                                            onClick={() => toggleTenantAI(tenant.id, tenant.aiEnabled !== false)}
                                            className={cn(
                                                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-md active:scale-95",
                                                tenant.aiEnabled !== false
                                                    ? "bg-muted text-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                                                    : "bg-primary text-white border-primary/20 hover:bg-primary/90"
                                            )}
                                        >
                                            {tenant.aiEnabled !== false ? "BLOQUEAR IA" : "ACTIVAR IA"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-6 md:p-8 bg-primary/10 border border-border rounded-2xl flex items-start gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                <Clock className="w-8 h-8 text-primary shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm md:text-md font-black text-foreground uppercase tracking-widest">Facturación x Consumo (Ready to Scale)</h4>
                    <p className="text-xs md:text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl font-medium">
                        Infraestructura operacional: Estamos registrando cada token y llamada por tenant. El motor de facturación automatizada está en desarrollo para la siguiente fase.
                    </p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon, trend, accentColor, isLive }: { title: string, value: string, subtitle?: string, icon: React.ReactNode, trend?: number, accentColor: string, isLive?: boolean }) {
    const isPositive = trend !== undefined && trend > 0;
    const isNegative = trend !== undefined && trend < 0;

    return (
        <div className="bg-card border border-border p-5 rounded-2xl shadow-md hover:shadow-lg transition-all group relative overflow-hidden">
            {isLive && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                </div>
            )}
            <div className="flex justify-between items-start mb-4">
                <div
                    className="p-2.5 rounded-xl border border-border/10 shadow-inner"
                    style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
                >
                    {icon}
                </div>

                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center gap-1.5 text-[9px] font-black px-2 py-1 rounded-full border",
                        isPositive ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                            isNegative ? "text-red-600 bg-red-50 border-red-200" :
                                "text-muted-foreground bg-secondary border-border"
                    )}>
                        {isPositive ? "↑" : isNegative ? "↓" : "•"}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] mb-1">{title}</h4>
            <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-foreground tracking-tighter group-hover:scale-105 transition-transform origin-left duration-300">
                    {value}
                </span>
                {subtitle && (
                    <span className="text-[10px] font-bold text-muted-foreground/60 tracking-tight">
                        {subtitle}
                    </span>
                )}
            </div>

            <div className="mt-4 h-1 w-full bg-secondary rounded-full overflow-hidden border border-border/5">
                <div
                    className="h-full rounded-full opacity-40 group-hover:opacity-100 transition-all duration-700"
                    style={{
                        width: trend ? `${Math.min(Math.abs(trend), 100)}%` : '30%',
                        backgroundColor: accentColor
                    }}
                />
            </div>
        </div>
    );
}
