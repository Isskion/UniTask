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

    const failedCount = rows.filter((r) => r._status === 'error').length;
    const hasData = rows.length > 0;

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
