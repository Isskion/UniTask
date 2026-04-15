import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';

interface HeaderProps {
    onShowLogin: () => void;
    onLoadExcel: () => void;
    onGroupRows: () => void;
    onMassEdit: () => void;
    onValidate: () => void;
    onSendAll: () => void;
    onSendSelected: () => void;
    onRetryFailed: () => void;
    onLogout: () => void;
    onManageUsers: () => void;
    isLoadingExcel?: boolean;
}

export default function Header({
    onShowLogin,
    onLoadExcel,
    onGroupRows,
    onMassEdit,
    onValidate,
    onSendAll,
    onSendSelected,
    onRetryFailed,
    onLogout,
    onManageUsers,
    isLoadingExcel,
}: HeaderProps) {
    const { t } = useTranslation();
    const token = useAppStore((s) => s.token);
    const rows = useAppStore((s) => s.rows);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const role = useAppStore((s) => s.role);
    const mapping = useAppStore((s) => s.mapping);
    const headers = useAppStore((s) => s.headers);

    const failedCount = rows.filter((r) => r._status === 'error').length;
    const successCount = rows.filter((r) => r._status === 'success').length;
    const hasData = rows.length > 0;
    const mappedCount = Object.keys(mapping).filter(k => mapping[k]).length;
    const groupedCount = rows.filter(r => r._grouped).length;

    // ─── Stepper logic ──────────────────────────────────────────────────
    type StepStatus = 'done' | 'active' | 'pending';
    const steps: { label: string; icon: string; status: StepStatus }[] = [
        {
            label: 'Conexión',
            icon: '🔗',
            status: token ? 'done' : 'active',
        },
        {
            label: 'Excel',
            icon: '📂',
            status: hasData ? 'done' : token ? 'active' : 'pending',
        },
        {
            label: 'Mapeo',
            icon: '🗺️',
            status: mappedCount > 0 && hasData ? (mappedCount >= 3 ? 'done' : 'active') : hasData ? 'active' : 'pending',
        },
        {
            label: 'Envío',
            icon: '📨',
            status: successCount > 0 ? 'done' : (hasData && mappedCount > 0 && token) ? 'active' : 'pending',
        },
    ];

    return (
        <header className="flex h-[44px] items-center px-3 justify-between shrink-0 sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 shadow-md">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <img src="/LogoApp.jpg" alt="UNIGIS" className="h-7 w-auto object-contain rounded ring-1 ring-white/20" />
                <div className="flex flex-col leading-none">
                    <span className="text-sm font-bold text-white tracking-tight">Order Creator</span>
                    <span className="text-[8px] font-semibold text-red-400/80 uppercase tracking-[0.15em]">UniTask Platinum</span>
                </div>
            </div>

            {/* ── Stepper ── */}
            <div className="hidden md:flex items-center gap-0.5">
                {steps.map((step, i) => (
                    <div key={step.label} className="flex items-center">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                            step.status === 'done'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : step.status === 'active'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                                    : 'bg-white/5 text-slate-500 border border-white/10'
                        }`}>
                            <span className="text-xs">{step.status === 'done' ? '✅' : step.icon}</span>
                            <span className="hidden lg:inline">{step.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-3 h-px mx-0.5 ${step.status === 'done' ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* ── Live Counters ── */}
            {hasData && (
                <div className="hidden sm:flex items-center gap-1">
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-white/10 text-white/70 rounded-md"
                        title="Filas totales">
                        {rows.length} filas
                    </span>
                    {mappedCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/20 text-indigo-300 rounded-md"
                            title="Campos mapeados">
                            🗺️ {mappedCount}
                        </span>
                    )}
                    {groupedCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 rounded-md"
                            title="Filas agrupadas">
                            ⚡ {groupedCount} agrup
                        </span>
                    )}
                    {successCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded-md"
                            title="Enviados OK">
                            ✅ {successCount}
                        </span>
                    )}
                    {failedCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-300 rounded-md"
                            title="Errores">
                            ❌ {failedCount}
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1.5">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap border ${token
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 border-white/10'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${token ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    {token ? t('app.connected') : t('app.notConnected')}
                </span>

                <div className="w-px h-5 bg-white/10" />

                <div className="flex items-center gap-1 bg-white/5 px-1 py-0.5 rounded-lg border border-white/10">
                    <button
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white/10 text-white/90 rounded hover:bg-white/20 transition-all disabled:opacity-50"
                        onClick={onLoadExcel}
                        disabled={isLoadingExcel}
                    >
                        {isLoadingExcel ? (
                            <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Cargando...</>
                        ) : (
                            <>📂 <span className="hidden sm:inline">{t('buttons.loadExcel')}</span></>
                        )}
                    </button>
                    <button
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white/10 text-white/90 rounded hover:bg-amber-500/20 hover:text-amber-300 transition-all disabled:opacity-30"
                        onClick={onGroupRows}
                        disabled={!hasData}
                    >
                        ⚡ Agrupar
                    </button>
                </div>

                {selectedIndices.size > 0 && (
                    <button
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 transition-all"
                        onClick={onMassEdit}
                    >
                        ✏️ Editar ({selectedIndices.size})
                    </button>
                )}

                <div className="w-px h-5 bg-white/10" />

                <div className="flex items-center gap-1">
                    <button
                        className="px-2.5 py-1 text-[11px] font-semibold bg-white/10 text-white/90 rounded-lg hover:bg-white/20 transition-all border border-white/10 disabled:opacity-30"
                        onClick={onValidate}
                        disabled={!hasData || !token}
                    >
                        ✓ Validar
                    </button>
                    <button
                        className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-600/80 text-white rounded-lg hover:bg-indigo-500 transition-all border border-indigo-500/50 disabled:opacity-30"
                        onClick={onSendSelected}
                        disabled={selectedIndices.size === 0 || !token}
                    >
                        📨 Selección
                    </button>
                    <button
                        className="px-3 py-1 text-[11px] font-bold bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-400 shadow-sm shadow-red-500/25 transition-all border border-red-400/30 disabled:opacity-30"
                        onClick={onSendAll}
                        disabled={!hasData || !token}
                    >
                        ▶ {t('buttons.sendAll')}
                    </button>
                </div>

                {failedCount > 0 && (
                    <button
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/25 transition-all"
                        onClick={onRetryFailed}
                    >
                        🔄 Reintentar ({failedCount})
                    </button>
                )}

                <div className="flex items-center gap-0.5 ml-1">
                    {role === 'admin' && token && (
                        <button className="p-1 text-slate-400 hover:text-indigo-300 rounded transition-all text-xs" onClick={onManageUsers} title="Usuarios">👥</button>
                    )}
                    {token ? (
                        <button className="p-1 text-slate-400 hover:text-red-300 rounded transition-all text-xs" onClick={onLogout} title="Desconectar">🚪</button>
                    ) : (
                        <button className="p-1 text-slate-400 hover:text-indigo-300 rounded transition-all text-xs" onClick={onShowLogin} title={t('app.connect')}>🔗</button>
                    )}
                </div>
            </div>
        </header>
    );
}
