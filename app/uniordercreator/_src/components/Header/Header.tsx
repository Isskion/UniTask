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
    onShowHelp: () => void;
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
    onShowHelp,
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
        <header className="flex h-[52px] items-center px-4 justify-between shrink-0 sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 shadow-lg">
            {/* Logo Section */}
            <div className="flex items-center gap-3 pr-4 border-r border-white/10 h-full">
                <img src="/LogoApp.jpg" alt="UNIGIS" className="h-8 w-auto object-contain rounded-lg ring-1 ring-white/20 shadow-lg" />
                <div className="flex flex-col leading-tight">
                    <span className="text-sm font-black text-white tracking-tight">Order Creator</span>
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] opacity-90">UniTask Platinum</span>
                </div>
            </div>

            {/* Middle Section: Stepper (Hidden on small screens) */}
            <div className="hidden xl:flex items-center gap-1 mx-2">
                {steps.map((step, i) => (
                    <div key={step.label} className="flex items-center">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                            step.status === 'done'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : step.status === 'active'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse'
                                    : 'bg-white/5 text-slate-500 border border-white/5'
                        }`}>
                            <span className="text-xs">{step.status === 'done' ? '✅' : step.icon}</span>
                            <span>{step.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-4 h-px mx-1 ${step.status === 'done' ? 'bg-emerald-500/40' : 'bg-white/5'}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Actions Grid (Modular & Sectioned) */}
            <div className="flex items-center gap-3">
                
                {/* GROUP 1: ORIGIN (Source data) */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 border border-white/5 shadow-inner"
                        onClick={onLoadExcel}
                        disabled={isLoadingExcel}
                    >
                        {isLoadingExcel ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : '📂'} 
                        <span>{isLoadingExcel ? '...' : t('buttons.loadExcel')}</span>
                    </button>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-amber-500/10 text-amber-300 rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-20 border border-amber-500/20"
                        onClick={onGroupRows}
                        disabled={!hasData}
                        title="Agrupar items por Pedido"
                    >
                        ⚡ <span className="hidden lg:inline">Agrupar</span>
                    </button>
                </div>

                {/* GROUP 2: PREPARATION (Validation & Edit) */}
                <div className="flex items-center gap-1">
                    {selectedIndices.size > 0 && (
                        <button
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 rounded-lg hover:bg-indigo-500/30 scale-in-center"
                            onClick={onMassEdit}
                        >
                            ✏️ <span className="hidden lg:inline">Editar ({selectedIndices.size})</span>
                        </button>
                    )}
                    <button
                        className="px-3 py-1.5 text-[11px] font-bold bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-all border border-white/10 disabled:opacity-30"
                        onClick={onValidate}
                        disabled={!hasData || !token}
                    >
                        ✓ <span className="hidden lg:inline">Validar</span>
                    </button>
                </div>

                <div className="w-px h-6 bg-white/10 mx-1" />

                {/* GROUP 3: TRANSMISSION (Simulator & Sending) */}
                <div className="flex items-center gap-1.5 bg-slate-800/40 p-1 rounded-xl border border-white/5 shadow-inner">
                    {/* Dry Run Toggle */}
                    <div className="flex items-center px-2 py-1 rounded-lg border border-white/5 bg-slate-900/40" title="Modo Simulación: No afecta a UNIGIS">
                        <label className="flex items-center cursor-pointer select-none">
                            <input type="checkbox" className="sr-only" checked={useAppStore.getState().isDryRun} onChange={(e) => useAppStore.getState().setIsDryRun(e.target.checked)} />
                            <div className={`relative w-7 h-4 rounded-full transition-colors ${useAppStore((s) => s.isDryRun) ? 'bg-orange-500' : 'bg-slate-700'}`}>
                                <div className={`absolute top-[2px] left-[2px] bg-white w-3 h-3 rounded-full transition-transform ${useAppStore((s) => s.isDryRun) ? 'translate-x-3' : ''}`}></div>
                            </div>
                            <span className={`ml-2 text-[8px] font-black uppercase tracking-widest ${useAppStore((s) => s.isDryRun) ? 'text-orange-400' : 'text-slate-500'}`}>Simulador</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            className="px-3 py-1.5 text-[11px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all shadow-md shadow-indigo-900/20 border border-indigo-400/30 disabled:opacity-30"
                            onClick={onSendSelected}
                            disabled={selectedIndices.size === 0 || !token}
                        >
                            📨 <span className="hidden xl:inline">Selección</span>
                        </button>
                        <button
                            className="px-4 py-1.5 text-[11px] font-black bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-900/30 transition-all border border-red-400/40 disabled:opacity-30"
                            onClick={onSendAll}
                            disabled={!hasData || !token}
                        >
                            🚀 <span className="hidden xl:inline">{t('buttons.sendAll')}</span>
                        </button>
                        
                        {failedCount > 0 && (
                            <button
                                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-black bg-red-500/20 text-white border border-red-500/40 rounded-lg hover:bg-red-500/30 animate-pulse"
                                onClick={onRetryFailed}
                            >
                                🔄 <span className="hidden xl:inline">Errores ({failedCount})</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* GROUP 4: SYSTEM (Help, Users, Account) */}
                <div className="flex items-center gap-1 ml-2 pl-3 border-l border-white/10">
                    <button 
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all hover:bg-white/5 active:scale-90"
                        onClick={onShowHelp}
                        title="Abrir Centro de Ayuda"
                    >
                        ❓
                    </button>
                    {role === 'admin' && token && (
                        <button className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg transition-all hover:bg-white/5" onClick={onManageUsers} title="Gestión de Usuarios">👥</button>
                    )}
                    {token ? (
                        <button className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-all hover:bg-white/5" onClick={onLogout} title="Cerrar Sesión">🚪</button>
                    ) : (
                        <button className="p-1.5 text-indigo-400 hover:text-indigo-300 rounded-lg transition-all bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20" onClick={onShowLogin} title="Conectar">🔗</button>
                    )}
                </div>
            </div>
        </header>
    );
}
