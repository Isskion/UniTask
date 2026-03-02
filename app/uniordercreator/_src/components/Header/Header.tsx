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
}: HeaderProps) {
    const { t } = useTranslation();
    const token = useAppStore((s) => s.token);
    const rows = useAppStore((s) => s.rows);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const role = useAppStore((s) => s.role);

    const failedCount = rows.filter((r) => r._status === 'error').length;
    const hasData = rows.length > 0;

    return (
        <header className="flex h-[72px] items-center px-6 justify-between shrink-0 sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 shadow-xl shadow-slate-900/20">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl blur opacity-30 animate-pulse" />
                    <img src="/LogoApp.jpg" alt="UNIGIS" className="relative h-10 w-auto object-contain rounded-lg ring-1 ring-white/20" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-white tracking-tight leading-tight">Order Creator</h1>
                    <span className="text-[10px] font-semibold text-red-400/80 uppercase tracking-[0.2em]">UniTask Platinum</span>
                </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-3">
                {/* Connection Status Badge */}
                <span className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border backdrop-blur-sm transition-all duration-300 ${token
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/5 text-slate-400 border-white/10'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${token ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-slate-500'}`} />
                    {token ? t('app.connected') : t('app.notConnected')}
                </span>

                <div className="w-px h-8 bg-white/10" />

                {/* Primary Actions Group */}
                <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
                    <button
                        className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-white/10 text-white/90 rounded-lg hover:bg-white/20 hover:text-white transition-all duration-200 hover:shadow-lg hover:shadow-white/5"
                        onClick={onLoadExcel}
                    >
                        📂 <span className="hidden sm:inline">{t('buttons.loadExcel')}</span>
                    </button>
                    <button
                        className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-white/10 text-white/90 rounded-lg hover:bg-amber-500/20 hover:text-amber-300 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10 disabled:hover:text-white/90"
                        onClick={onGroupRows}
                        disabled={!hasData}
                    >
                        ⚡ <span className="hidden md:inline">Agrupar</span>
                    </button>
                </div>

                {/* Mass Edit Contextual */}
                {selectedIndices.size > 0 && (
                    <button
                        className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/30 hover:text-indigo-200 transition-all duration-200 shadow-lg shadow-indigo-500/10 animate-in fade-in zoom-in"
                        onClick={onMassEdit}
                    >
                        ✏️ Editar ({selectedIndices.size})
                    </button>
                )}

                <div className="w-px h-8 bg-white/10" />

                {/* Execution Group */}
                <div className="flex items-center gap-2">
                    <button
                        className="px-4 py-2 text-sm font-semibold bg-white/10 text-white/90 rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/10 disabled:opacity-30"
                        onClick={onValidate}
                        disabled={!hasData || !token}
                    >
                        ✓ Validar
                    </button>

                    <button
                        className="px-4 py-2 text-sm font-semibold bg-indigo-600/80 text-white rounded-xl hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 border border-indigo-500/50 disabled:opacity-30 disabled:hover:shadow-none"
                        onClick={onSendSelected}
                        disabled={selectedIndices.size === 0 || !token}
                    >
                        📨 Seleccionado
                    </button>

                    <button
                        className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-200 border border-red-400/30 disabled:opacity-30 disabled:hover:shadow-lg disabled:hover:from-red-600 disabled:hover:to-red-500"
                        onClick={onSendAll}
                        disabled={!hasData || !token}
                    >
                        ▶ {t('buttons.sendAll')}
                    </button>
                </div>

                {/* Error Recovery */}
                {failedCount > 0 && (
                    <button
                        className="ml-1 flex items-center gap-1.5 px-3.5 py-2 font-bold text-sm bg-red-500/15 text-red-300 border border-red-500/30 rounded-xl hover:bg-red-500/25 transition-all duration-200 shadow-lg shadow-red-500/10 animate-pulse"
                        onClick={onRetryFailed}
                    >
                        🔄 Reintentar ({failedCount})
                    </button>
                )}

                {/* Settings / Auth */}
                <div className="flex items-center gap-1 ml-2">
                    {role === 'admin' && token && (
                        <button
                            className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/15 rounded-xl transition-all duration-200"
                            onClick={onManageUsers}
                            title="Usuarios"
                        >
                            👥
                        </button>
                    )}
                    {token ? (
                        <button
                            className="p-2 text-slate-400 hover:text-red-300 hover:bg-red-500/15 rounded-xl transition-all duration-200"
                            onClick={onLogout}
                            title="Desconectar"
                        >
                            🚪
                        </button>
                    ) : (
                        <button
                            className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/15 rounded-xl transition-all duration-200"
                            onClick={onShowLogin}
                            title={t('app.connect')}
                        >
                            🔗
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
