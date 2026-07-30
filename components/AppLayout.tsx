"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SuperadminGodBar } from "@/components/SuperadminGodBar"; // Import God Bar at Top Level
import {
    Layout,
    BarChart3,
    FolderGit2,
    Users,
    Trash2,
    Search,
    Inbox,
    Briefcase,
    Bell,
    ChevronDown,
    Menu,
    X,
    LogOut,
    ClipboardList,
    Shield,
    Building,
    ListTodo,
    FileText,
    LifeBuoy,
    BookOpen,
    Timer,
    Lightbulb,
    BookMarked,
    Sparkles,
    Calendar, // Added for DispoPlan
    LayoutTemplate,
    Network,
    CalendarDays,
    ClipboardCheck,
    Map,
    Radar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useTheme } from "@/hooks/useTheme";
import { NotificationBell } from "@/components/NotificationBell";
import { VersionBadge } from "@/components/VersionBadge";
import { getRoleLevel, RoleLevel } from "@/types"; // Added import
import { AIHelpPanel } from "@/components/AIHelpPanel";
import SupportModal from "@/components/SupportModal";
import { Sparkles as GeminiIcon } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import FirebaseDiagnostic from "@/components/FirebaseDiagnostic";
import { RefreshCw } from "lucide-react";
import { auth } from "@/lib/firebase";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";
import TaskManagement from "@/components/TaskManagement";

interface AppLayoutProps {
    children: React.ReactNode;
    viewMode: 'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager' | 'user-roles' | 'tenant-management' | 'admin-task-master' | 'admin-document-types' | 'reports' | 'support-management' | 'user-manual' | 'sprint-cycles' | 'sprint-planning' | 'app-management' | 'lessons-learned' | 'solution-records' | 'product-proposals' | 'dispoplan' | 'availability-registry' | 'uniflux' | 'unidocs' | 'inbox' | 'relevamiento' | 'discovery' | 'admin-task-control';
    onViewChange: (mode: 'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager' | 'user-roles' | 'tenant-management' | 'admin-task-master' | 'admin-document-types' | 'reports' | 'support-management' | 'user-manual' | 'sprint-cycles' | 'sprint-planning' | 'app-management' | 'lessons-learned' | 'solution-records' | 'product-proposals' | 'dispoplan' | 'availability-registry' | 'uniflux' | 'unidocs' | 'inbox' | 'relevamiento' | 'discovery' | 'admin-task-control') => void;
    onOpenChangelog?: () => void; // Added prop
}

import { useUI } from "@/context/UIContext"; // Import Context
import { useToast } from "@/context/ToastContext";
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";



export function AppLayout({ children, viewMode, onViewChange, onOpenChangelog }: AppLayoutProps) {
    const { user, userProfile, logout, userRole, tenantId } = useAuth();
    const { can, canUseAI } = usePermissions();
    const { toggleCommandMenu } = useUI(); // Use Context hook
    const { showToast } = useToast();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [openTaskId, setOpenTaskId] = useState<string | null>(null);
    const { t } = useLanguage();
    const [dynamicLogoSrc, setDynamicLogoSrc] = useState<string>('/brand-white.png');

    useEffect(() => {
        let isMounted = true;
        const fetchTenantLogo = async () => {
            if (!tenantId || tenantId === "unknown" || tenantId === "__DENY__") return;
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
                if (isMounted && tenantDoc.exists()) {
                    const data = tenantDoc.data();
                    if (data.logos && data.logos.length > 0) {
                        const principal = data.logos.find((l: any) => l.label?.toLowerCase().includes('principal'));
                        setDynamicLogoSrc(principal?.url || data.logos[0].url);
                    } else if (data.logoUrl) {
                        setDynamicLogoSrc(data.logoUrl);
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    if (err.code !== 'permission-denied') {
                        console.error("Error fetching tenant logo in AppLayout:", err);
                    }
                }
            }
        };
        fetchTenantLogo();
        return () => { isMounted = false; };
    }, [tenantId]);

    useEffect(() => {
        const handleOpenTask = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.taskId) {
                setOpenTaskId(customEvent.detail.taskId);
            }
        };
        window.addEventListener('open-task', handleOpenTask);
        return () => window.removeEventListener('open-task', handleOpenTask);
    }, []);

    // Check if user can manage permissions (with legacy role fallback)
    const canManagePermissions = can('managePermissions', 'special') ||
        getRoleLevel(userRole) >= RoleLevel.PM;

    const NavItem = ({
        mode,
        icon: Icon,
        label,
        count
    }: {
        mode: typeof viewMode,
        icon: React.ElementType,
        label: string,
        count?: number
    }) => {
        const isActive = viewMode === mode;
        return (
            <button
                onClick={() => {
                    onViewChange(mode);
                    setIsMobileMenuOpen(false);
                }}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
            >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{label}</span>
                {count !== undefined && count > 0 && (
                    <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
                        {count}
                    </span>
                )}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
                )}
            </button>
        );
    };

    const NavLink = ({
        href,
        icon: Icon,
        label,
        target = "_self"
    }: {
        href: string,
        icon: React.ElementType,
        label: string,
        target?: string
    }) => {
        // Use regular <a> for static HTML assets to avoid Next.js RSC prefetch 404s
        const isStaticAsset = href.endsWith('.html') || href.startsWith('http');

        if (isStaticAsset) {
            return (
                <a
                    href={href}
                    target={target}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                        "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                >
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                    <span>{label}</span>
                </a>
            );
        }

        return (
            <Link
                href={href}
                target={target}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                    "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
            >
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                <span>{label}</span>
            </Link>
        );
    };



    // --- GLOBAL DEADLINE CHECK ---
    React.useEffect(() => {
        const timer = setTimeout(() => {
            const checkDeadlines = async () => {
                if (!user || !tenantId) return;

                const lastRun = sessionStorage.getItem('deadline_check_ts');
                if (lastRun && (Date.now() - parseInt(lastRun)) < 5000) return;
                sessionStorage.setItem('deadline_check_ts', Date.now().toString());

                try {
                    const qT = query(collection(db, "tasks"),
                        where("tenantId", "==", tenantId),
                        where("assignedTo", "==", user.uid),
                        where("status", "in", ["pending", "in_progress"]),
                        where("isActive", "==", true),
                        limit(50)
                    );
                    const snapT = await getDocs(qT);

                    const now = new Date();
                    const overdueTasks = snapT.docs
                        .map(d => ({ id: d.id, ...d.data() } as any))
                        .filter(t => t.endDate && new Date(t.endDate) < now);

                    if (overdueTasks.length === 0) return;

                    for (const task of overdueTasks) {
                        const qN = query(
                            collection(db, "notifications"),
                            where("userId", "==", user.uid),
                            where("tenantId", "==", tenantId),
                            where("taskId", "==", task.id),
                            where("type", "==", "deadline_expired")
                        );
                        const snapN = await getDocs(qN);

                        if (snapN.empty) {
                            await addDoc(collection(db, "notifications"), {
                                userId: user.uid,
                                tenantId: tenantId,
                                type: 'deadline_expired',
                                title: 'Overdue Task',
                                message: `Your task ${task.friendlyId || task.id} - "${task.title}" has reached its deadline.`,
                                taskId: task.id,
                                read: false,
                                createdAt: serverTimestamp(),
                                link: `/?view=task-manager&taskId=${task.id}`
                            });
                        }
                    }
                } catch (e: any) {
                    console.error("[Deadline Check] ❌ Error:", e);
                }
            }; checkDeadlines();
        }, 3000);

        return () => clearTimeout(timer);
    }, [user, tenantId]);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
            <SuperadminGodBar />


            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR (Desktop) */}
                <aside className="w-64 flex flex-col border-r border-border bg-card/50 print:hidden">
                    {/* Header / Logo */}
                    {/* Header / Logo */}
                    <div className="h-14 flex items-center px-4 border-b border-border/40 gap-3">
                        <img
                            src={dynamicLogoSrc}
                            alt="Unitask"
                            className="h-8 w-auto object-contain rounded-lg transition-all duration-300 hover:scale-105 origin-left"
                            style={{
                                maskImage: 'radial-gradient(ellipse at center, black 60%, transparent 100%)',
                                WebkitMaskImage: 'radial-gradient(ellipse at center, black 60%, transparent 100%)'
                            }}
                            onError={(e) => {
                                // Fallback if logo not found
                                e.currentTarget.src = "/logo.png";
                            }}
                        />
                        <span className="text-sm font-bold text-foreground tracking-tight">
                            UniTaskController
                        </span>
                        <div className="ml-auto">
                            <VersionBadge onClick={onOpenChangelog} />
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">

                        {/* Primary */}
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('nav.workspace')}</p>
                            <NavItem mode="dashboard" icon={Inbox} label={t('nav.dashboard')} />
                            <NavItem mode="editor" icon={Briefcase} label={t('nav.followUp')} />
                            <NavItem mode="relevamiento" icon={ClipboardCheck} label={t('nav.relevamiento') || "Relevamiento Proyectos"} />
                            <NavItem mode="projects" icon={FolderGit2} label={t('nav.projects')} />
                            <NavItem mode="task-manager" icon={ClipboardList} label={t('nav.task-manager')} />
                            <NavItem mode="tasks" icon={Layout} label={t('nav.allTasks')} />
                        </div>

                        {/* Knowledge Area (NEW) */}
                        {can('knowledgeBase', 'views') && (
                            <div className="space-y-1">
                                <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('knowledge_base.title') || 'Área de Conocimiento'}</p>
                                <NavItem mode="lessons-learned" icon={Lightbulb} label={t('knowledge_base.lessons_learned') || 'Lecciones Aprendidas'} />
                                <NavItem mode="solution-records" icon={BookMarked} label={t('knowledge_base.solution_records') || 'Registros de Soluciones'} />
                                <NavItem mode="product-proposals" icon={Sparkles} label={t('knowledge_base.product_proposals') || 'Propuestas de Producto'} />
                            </div>
                        )}

                        {/* Sprint Management (NEW) */}
                        {can('sprintManagement', 'views') && (
                            <div className="space-y-1">
                                <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('sprints.menu_title')}</p>
                                <NavItem mode="sprint-cycles" icon={Timer} label={t('sprints.menu_cycles')} />
                                <NavItem mode="sprint-planning" icon={Timer} label={t('sprints.menu_simulator')} />
                            </div>
                        )}

                        {/* Unitask Tools (NEW) */}
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('nav.unitask_tools') || 'Herramientas Unitask'}</p>
                            {can('dispoPlan', 'views') && (
                                <NavItem mode="dispoplan" icon={Calendar} label={t('nav.dispoplan') || "DispoPlan"} />
                            )}
                            {can('unavailabilityRegistry', 'views') && (
                                <NavItem mode="availability-registry" icon={ClipboardList} label={t('nav.availability_registry') || "Registro Indisponibilidades"} />
                            )}
                            <NavLink href="/unileaks" target="_blank" icon={FileText} label={t('nav.unileaks') || 'UniLeaks'} />
                            {can('uniordercreator', 'views') && (
                                <NavLink href="/uniordercreator" target="_blank" icon={ClipboardList} label={t('nav.uni-order-manager') || 'UniOrderManager'} />
                            )}
                            {can('univehiclecreator', 'views') && (
                                <NavLink href="/univehiclecreator" target="_blank" icon={ClipboardList} label={t('nav.uni-vehicle-manager') || 'UniVehicleCreator'} />
                            )}
                            {can('swagger', 'views') && (
                                <NavLink href="/integrators/uni-swagger/index.html" target="_blank" icon={FileText} label={t('roles_page.permissions.views.swagger.label') || 'UNIGIS Swagger'} />
                            )}
                            {can('soap', 'views') && (
                                <NavLink href="/integrators/uni-soap/index.html" target="_blank" icon={FileText} label={t('roles_page.permissions.views.soap.label') || 'UNIGIS SOAP'} />
                            )}
                            <NavLink href="/univisio" target="_blank" icon={Network} label={t('nav.univisio') || 'UniVisio'} />
                            <NavLink href="/uniflux/geo" target="_blank" icon={Map} label={t('nav.unigeo') || 'UniGeo'} />
                            <NavItem mode="unidocs" icon={LayoutTemplate} label={t('nav.unidocs') || "UniDocs"} />
                            <NavLink href="/uniflux" target="_blank" icon={Sparkles} label={t('nav.uniflux') || "Uniflux Engine"} />
                            <NavLink href="/UniTrace" target="_blank" icon={Radar} label={t('nav.unitrace') || 'UniTrace'} />
                            {getRoleLevel(userRole) >= RoleLevel.ADMIN && (
                                <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />
                            )}
                        </div>

                        {/* Secondary */}
                        {/* ADMINISTRATION */}
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('nav.admin')}</p>

                            {/* UNITASK MANAGEMENT (SuperAdmin only) */}
                            {userRole === 'superadmin' && (
                                <NavItem mode="app-management" icon={Shield} label={t('nav.appManagement')} />
                            )}

                            {getRoleLevel(userRole) >= RoleLevel.CONSULTANT && (
                                <NavLink href="/agenda" icon={CalendarDays} label={t('nav.agenda-semanal') || "Agenda Semanal"} target="_blank" />
                            )}

                            {getRoleLevel(userRole) >= RoleLevel.PM && (
                                <NavItem mode="admin-task-control" icon={ClipboardCheck} label={t('nav.taskControl') || "Control de Tareas"} />
                            )}

                            {/* Consolidated Task Master Data (Global PM+) */}
                            {getRoleLevel(userRole) >= RoleLevel.PM && (
                                <NavItem mode="admin-task-master" icon={Layout} label={t('nav.taskMaster')} />
                            )}

                            {can('userManagement', 'views') && (
                                <NavItem mode="users" icon={Users} label={t('nav.people')} />
                            )}
                            {canManagePermissions && (
                                <NavItem mode="user-roles" icon={Shield} label={t('nav.roles')} />
                            )}

                            {userRole === 'superadmin' && (
                                <>
                                    <NavItem mode="reports" icon={FileText} label={t('nav.reports')} />
                                    <NavItem mode="tenant-management" icon={Building} label={t('nav.tenants') || "Tenants"} />
                                </>
                            )}
                            {/* Document Types (Admin) */}
                            {getRoleLevel(userRole) >= RoleLevel.ADMIN && (
                                <NavItem mode="admin-document-types" icon={FileText} label={t('nav.document_types') || "Tipos de Documento"} />
                            )}
                        </div>

                        {/* System */}
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('nav.system')}</p>
                            <NavItem mode="user-manual" icon={BookOpen} label={t('nav.manual') || "Manual"} />
                            {userRole === 'superadmin' && (
                                <NavItem mode="support-management" icon={LifeBuoy} label={t('nav.support-management')} />
                            )}
                            <NavItem mode="trash" icon={Trash2} label={t('nav.trash')} />
                        </div>
                    </div>

                    {/* Footer User Profile */}
                    <div className="p-3 border-t border-border">
                        <div
                            onClick={() => setIsProfileOpen(true)}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group cursor-pointer"
                        >
                            {(userProfile?.photoURL || user?.photoURL) ? (
                                <img src={userProfile?.photoURL || user?.photoURL || ""} alt="User" className="w-8 h-8 rounded-full border border-border transition-transform group-hover:scale-110" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border group-hover:bg-primary/10 transition-colors">
                                    <span className="text-xs font-bold text-muted-foreground group-hover:text-primary">?</span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{userProfile?.displayName || user?.displayName || 'User'}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    logout();
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 flex flex-col min-w-0 bg-background">

                    {/* Global Header */}
                    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-40 print:hidden">

                        {/* Left: Breadcrumbs / Mobile Menu */}
                        <div className="flex items-center gap-4">
                            <button
                                className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="text-muted-foreground hidden sm:inline">{t('nav.workspace')}</span>
                                <span className="text-muted-foreground/50 hidden sm:inline">/</span>
                                <span className="text-foreground font-medium capitalize">
                                    {viewMode === 'editor' ? t('nav.followUp') : (t(`nav.${viewMode as any}`) || viewMode)}
                                </span>

                                {/* Support Button next to title */}
                                <button
                                    onClick={() => setIsSupportOpen(true)}
                                    className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all group flex items-center gap-2"
                                    title={t('support.title')}
                                >
                                    <LifeBuoy className="w-4 h-4" />
                                    <span className="text-[9px] opacity-30 font-mono hidden md:inline">{userRole}</span>
                                </button>

                            </div>
                        </div>

                        {/* Center: Command Palette Trigger (Optional Visual) */}
                        {/* Center: Command Palette Trigger (Optional Visual) */}
                        <button
                            onClick={toggleCommandMenu}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all w-64"
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span>{t('common.search')} (Alt+S)...</span>
                            <div className="ml-auto flex items-center gap-1">
                                <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-sans text-muted-foreground">Alt</kbd>
                                <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-sans text-muted-foreground">S</kbd>
                            </div>
                        </button>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsHelpOpen(true)}
                                className="p-2 rounded-full hover:bg-purple-500/10 text-muted-foreground hover:text-purple-500 transition-colors relative group"
                                title={t('ai_help.title')}
                            >
                                <GeminiIcon className="w-5 h-5" />
                                <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                                </span>
                            </button>
                            <ThemeSelector />
                            <NotificationBell />
                            <LanguageSelector />

                            {/* EMERGENCY REFRESH ACTION */}
                            {userRole === 'superadmin' && (
                                <button
                                    onClick={async () => {
                                        if (!auth.currentUser) return alert("Húmedo! No hay usuario.");
                                        try {
                                            await auth.currentUser.getIdToken(true);
                                            alert("✅ Token de Seguridad ACTUALIZADO (desde Header).\n\nPulsa ACEPTAR para recargar.");
                                            window.location.reload();
                                        } catch (e: any) {
                                            alert("❌ Error refrescando: " + e.message);
                                        }
                                    }}
                                    className="p-2 rounded-full hover:bg-green-500/10 text-green-500 transition-colors"
                                    title="1-Click Permission Refresh"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </header>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-hidden relative">
                        {children}
                    </div>
                </main>

                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden flex">
                        <div className="w-64 bg-[#0c0c0e] h-full p-4 flex flex-col border-r border-white/10">
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-white">{t('common.menu')}</span>
                                <button onClick={() => setIsMobileMenuOpen(false)}>
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            </div>
                            <div className="space-y-1">
                                <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('nav.workspace')}</p>
                                <NavItem mode="dashboard" icon={Inbox} label={t('nav.dashboard')} />
                                <NavItem mode="editor" icon={Briefcase} label={t('nav.followUp')} />
                                <NavItem mode="relevamiento" icon={ClipboardCheck} label={t('nav.relevamiento') || "Relevamiento Proyectos"} />
                                <NavItem mode="projects" icon={FolderGit2} label={t('nav.projects')} />
                                <NavItem mode="task-manager" icon={ClipboardList} label={t('nav.task-manager')} />
                                <NavItem mode="tasks" icon={Layout} label={t('nav.allTasks')} />
                            </div>

                            <div className="mt-4 space-y-1">
                                <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('nav.unitask_tools') || 'Herramientas Unitask'}</p>
                                {can('dispoPlan', 'views') && (
                                    <NavItem mode="dispoplan" icon={Calendar} label={t('nav.dispoplan') || "DispoPlan"} />
                                )}
                                {can('unavailabilityRegistry', 'views') && (
                                    <NavItem mode="availability-registry" icon={ClipboardList} label={t('nav.availability_registry') || "Registro Indisponibilidades"} />
                                )}
                                <NavLink href="/unileaks" target="_blank" icon={FileText} label={t('nav.unileaks') || 'UniLeaks'} />
                                {can('uniordercreator', 'views') && (
                                    <NavLink href="/uniordercreator" target="_blank" icon={ClipboardList} label={t('nav.uni-order-manager') || 'UniOrderManager'} />
                                )}
                                {can('univehiclecreator', 'views') && (
                                    <NavLink href="/univehiclecreator" target="_blank" icon={ClipboardList} label={t('nav.uni-vehicle-manager') || 'UniVehicleCreator'} />
                                )}
                                {can('swagger', 'views') && (
                                    <NavLink href="/integrators/uni-swagger/index.html" target="_blank" icon={FileText} label={t('roles_page.permissions.views.swagger.label') || 'UNIGIS Swagger'} />
                                )}
                                {can('soap', 'views') && (
                                    <NavLink href="/integrators/uni-soap/index.html" target="_blank" icon={FileText} label={t('roles_page.permissions.views.soap.label') || 'UNIGIS SOAP'} />
                                )}
                                <NavLink href="/univisio" target="_blank" icon={Network} label={t('nav.univisio') || 'UniVisio'} />
                                <NavLink href="/uniflux/geo" target="_blank" icon={Map} label={t('nav.unigeo') || 'UniGeo'} />
                                <NavItem mode="unidocs" icon={LayoutTemplate} label={t('nav.unidocs') || "UniDocs"} />
                                <NavLink href="/uniflux" target="_blank" icon={Sparkles} label={t('nav.uniflux') || "Uniflux Engine"} />
                                <NavLink href="/UniTrace" target="_blank" icon={Radar} label={t('nav.unitrace') || 'UniTrace'} />
                            <NavLink href="/ai-detector" target="_blank" icon={Sparkles} label="UniHumanize" />
                            </div>

                            {can('knowledgeBase', 'views') && (
                                <div className="mt-4 space-y-1">
                                    <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('knowledge_base.title') || 'Área de Conocimiento'}</p>
                                    <NavItem mode="lessons-learned" icon={Lightbulb} label={t('knowledge_base.lessons_learned') || 'Lecciones Aprendidas'} />
                                    <NavItem mode="solution-records" icon={BookMarked} label={t('knowledge_base.solution_records') || 'Registros de Soluciones'} />
                                    <NavItem mode="product-proposals" icon={Sparkles} label={t('knowledge_base.product_proposals') || 'Propuestas de Producto'} />
                                </div>
                            )}

                            <div className="mt-4 space-y-1">
                                <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('nav.admin')}</p>

                                {getRoleLevel(userRole) >= RoleLevel.CONSULTANT && (
                                    <NavLink href="/agenda" icon={CalendarDays} label={t('nav.agenda-semanal') || "Agenda Semanal"} target="_blank" />
                                )}

                                {getRoleLevel(userRole) >= RoleLevel.PM && (
                                    <NavItem mode="admin-task-control" icon={ClipboardCheck} label={t('nav.taskControl') || "Control de Tareas"} />
                                )}

                                {can('userManagement', 'views') && (
                                    <NavItem mode="users" icon={Users} label={t('nav.people')} />
                                )}
                                {canManagePermissions && (
                                    <NavItem mode="user-roles" icon={Shield} label={t('nav.roles')} />
                                )}
                                {userRole === 'superadmin' && (
                                    <>
                                        <NavItem mode="app-management" icon={Shield} label={t('nav.appManagement')} />
                                        <NavItem mode="tenant-management" icon={Building} label={t('nav.tenants') || "Tenants"} />
                                    </>
                                )}
                            </div>

                            <div className="mt-4 space-y-1">
                                <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('nav.system')}</p>
                                <NavItem mode="user-manual" icon={BookOpen} label={t('nav.manual') || "Manual"} />
                                {userRole === 'superadmin' && (
                                    <NavItem mode="support-management" icon={LifeBuoy} label={t('nav.support-management')} />
                                )}
                                <NavItem mode="trash" icon={Trash2} label={t('nav.trash')} />
                            </div>
                        </div>
                        <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    </div>
                )}
            </div>
            <AIHelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} viewContext={viewMode} />
            <ProfileSettingsModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Global Task Management Modal */}
            {openTaskId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl w-[95vw] max-w-6xl h-[85vh] md:h-[90vh] overflow-hidden flex flex-col relative scale-100 animate-in zoom-in-95 duration-200">
                        <TaskManagement
                            initialTaskId={openTaskId}
                            isModal={true}
                            onClose={() => setOpenTaskId(null)}
                        />
                    </div>
                </div>
            )}

            {/* GLOBAL RECOVERY PANEL */}
            {(userRole === 'superadmin') && <FirebaseDiagnostic />}
        </div>
    );
}
