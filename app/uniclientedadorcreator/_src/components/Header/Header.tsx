import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';

interface HeaderProps {
    onShowLogin: () => void; onLoadExcel: () => void;
    onMassEdit: () => void; onValidate: () => void;
    onSendAll: () => void; onSendSelected: () => void;
    onSendRemainingUnique: () => void;
    onRetryFailed: () => void; onLogout: () => void;
    onManageUsers: () => void; onShowHelp: () => void;
    onSaveTemplate: () => void; onShowDashboard: () => void;
    isLoadingExcel?: boolean;
}

export default function Header({ onShowLogin, onLoadExcel, onMassEdit, onValidate, onSendAll, onSendSelected, onSendRemainingUnique, onRetryFailed, onLogout, onManageUsers, onShowHelp, onSaveTemplate, onShowDashboard, isLoadingExcel}: HeaderProps) {
    const { t } = useTranslation();
    const token = useAppStore((s) => s.token);
    const rows = useAppStore((s) => s.rows);
    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const role = useAppStore((s) => s.role);
    const mapping = useAppStore((s) => s.mapping);
    const isDryRun = useAppStore((s) => s.isDryRun);

    const failedCount = rows.filter((r) => r._status === 'error').length;
    const successCount = rows.filter((r) => r._status === 'success').length;
    const hasData = rows.length > 0;
    const mappedCount = Object.keys(mapping).filter(k => mapping[k]).length;

    type StepStatus = 'done' | 'active' | 'pending';
    const steps: { label: string; icon: string; status: StepStatus }[] = [
        { label: 'Conexión', icon: '🔗', status: token ? 'done' : 'active' },
        { label: 'Datos', icon: '📂', status: hasData ? 'done' : token ? 'active' : 'pending' },
        { label: 'Mapeo', icon: '🗺️', status: mappedCount > 0 && hasData ? (mappedCount >= 2 ? 'done' : 'active') : hasData ? 'active' : 'pending' },
        { label: 'Envío', icon: '📨', status: successCount > 0 ? 'done' : (hasData && mappedCount > 0 && token) ? 'active' : 'pending' },
    ];

    const btnBase = "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none";

    return (
        <header className="flex h-[54px] items-center px-4 justify-between shrink-0 sticky top-0 z-50 bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#0f172a] border-b border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.4),0_4px_12px_rgba(0,0,0,0.15)]">
            <div className="flex items-center gap-3 pr-5 border-r border-white/[0.08] h-full">
                <div className="relative">
                    <img src="/LogoApp.jpg" alt="UNIGIS" className="h-8 w-8 object-contain rounded-[10px] ring-1 ring-white/15 shadow-lg" />
                    {token && (<div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0f172a] shadow-[0_0_6px_rgba(52,211,153,0.6)]" />)}
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-extrabold text-white tracking-[-0.02em]">Cliente Dador Creator</span>
                    <span className="text-[8px] font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 uppercase tracking-[0.25em]">UniTask Platinum</span>
                </div>
            </div>

            <div className="hidden xl:flex items-center gap-0.5 mx-3">
                {steps.map((step, i) => (
                    <div key={step.label} className="flex items-center">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-300 ${step.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : step.status === 'active' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-400/25' : 'bg-white/[0.03] text-slate-500 border border-white/[0.04]'}`}>
                            <span className="text-[11px]">{step.status === 'done' ? '✓' : step.icon}</span>
                            <span>{step.label}</span>
                        </div>
                        {i < steps.length - 1 && (<div className={`w-5 h-[1px] mx-0.5 transition-colors ${step.status === 'done' ? 'bg-emerald-500/30' : 'bg-white/[0.06]'}`} />)}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
                    <button className={`${btnBase} bg-white/[0.08] text-white/90 hover:bg-white/[0.14] border border-white/[0.06]`} onClick={onLoadExcel} disabled={isLoadingExcel}>
                        {isLoadingExcel ? (<div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />) : <span className="text-xs">📂</span>}
                        <span>{isLoadingExcel ? '...' : t('buttons.loadExcel')}</span>
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    {selectedIndices.size > 0 && (
                        <button className={`${btnBase} bg-indigo-500/15 text-indigo-300 border border-indigo-400/25 hover:bg-indigo-500/25`} onClick={onMassEdit}>
                            <span className="text-xs">✏️</span>
                            <span className="hidden lg:inline">Editar ({selectedIndices.size})</span>
                        </button>
                    )}
                    <button className={`${btnBase} bg-emerald-500/[0.08] text-emerald-300/80 hover:bg-emerald-500/[0.15] border border-emerald-500/15`} onClick={onSaveTemplate} disabled={!hasData} title="Exportar Layout">
                        <span className="text-xs">📋</span>
                        <span className="hidden lg:inline">Layout</span>
                    </button>
                    <button className={`${btnBase} bg-white/[0.04] text-slate-300/80 hover:bg-white/[0.08] border border-white/[0.06]`} onClick={onValidate} disabled={!hasData || !token}>
                        <span className="text-xs">✔</span>
                        <span className="hidden lg:inline">Validar</span>
                    </button>
                    <button className={`${btnBase} relative bg-gradient-to-r from-violet-500/15 to-indigo-500/15 text-violet-300 border border-violet-400/25 hover:from-violet-500/25 hover:to-indigo-500/25`} onClick={onShowDashboard} disabled={!hasData} title="Dashboard de Resultados">
                        <span className="text-xs">📊</span>
                        <span className="hidden lg:inline">Dashboard</span>
                        {failedCount > 0 && (<span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center text-[8px] font-black bg-red-500 text-white rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse px-1">{failedCount}</span>)}
                    </button>
                </div>

                <div className="w-px h-6 bg-white/[0.06]" />

                <div className="flex items-center gap-1.5 bg-slate-800/40 p-1 rounded-xl border border-white/[0.05]">
                    <div className="flex items-center px-2 py-1 rounded-lg border border-white/[0.05] bg-slate-900/50" title="Modo Simulación">
                        <label className="flex items-center cursor-pointer select-none gap-2">
                            <input type="checkbox" className="sr-only" checked={isDryRun} onChange={(e) => useAppStore.getState().setIsDryRun(e.target.checked)} />
                            <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${isDryRun ? 'bg-orange-500' : 'bg-slate-700'}`}>
                                <div className={`absolute top-[2px] left-[2px] bg-white w-3 h-3 rounded-full transition-transform duration-200 shadow-sm ${isDryRun ? 'translate-x-3' : ''}`} />
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${isDryRun ? 'text-orange-400' : 'text-slate-500'}`}>Sim</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-950/30 border border-indigo-400/20`} onClick={onSendSelected} disabled={selectedIndices.size === 0 || !token}>
                            <span className="text-xs">📨</span>
                            <span className="hidden xl:inline">Selección</span>
                        </button>
                        <button className={`${btnBase} font-bold bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400 shadow-lg shadow-emerald-950/30 border border-emerald-400/25`} onClick={onSendAll} disabled={!hasData || !token}>
                            <span className="text-xs">🚀</span>
                            <span className="hidden xl:inline">{t('buttons.sendAll')}</span>
                        </button>
                        <button className={`${btnBase} bg-amber-500/15 text-amber-300 border border-amber-400/25 hover:bg-amber-500/25`} onClick={onSendRemainingUnique} disabled={!hasData || !token} title="Envía solo las filas no importadas todavía, sin duplicar CUIT ya existentes">
                            <span className="text-xs">📦</span>
                            <span className="hidden xl:inline">Resto (CUIT único)</span>
                        </button>
                        {failedCount > 0 && (
                            <button className={`${btnBase} bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25`} onClick={onRetryFailed}>
                                <span className="text-xs">🔄</span>
                                <span className="hidden xl:inline">Errores ({failedCount})</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-white/[0.06]">
                    <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition-all hover:bg-white/[0.06] active:scale-90" onClick={onShowHelp} title="Ayuda"><span className="text-sm">❓</span></button>
                    {role === 'admin' && token && (<button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-400 rounded-lg transition-all hover:bg-white/[0.06]" onClick={onManageUsers} title="Gestión de Usuarios"><span className="text-sm">👥</span></button>)}
                    {token ? (<button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-400 rounded-lg transition-all hover:bg-white/[0.06]" onClick={onLogout} title="Cerrar Sesión"><span className="text-sm">🚪</span></button>) : (<button className="w-8 h-8 flex items-center justify-center text-indigo-400 hover:text-indigo-300 rounded-lg transition-all bg-indigo-500/[0.06] hover:bg-indigo-500/[0.12] border border-indigo-500/15" onClick={onShowLogin} title="Conectar"><span className="text-sm">🔗</span></button>)}
                </div>
            </div>
        </header>
    );
}
