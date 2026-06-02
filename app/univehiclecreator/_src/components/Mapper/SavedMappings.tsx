"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { isFirebaseConfigured } from '@/app/uniordercreator/_lib/firebase';
import {
    saveVehicleTemplate,
    loadVehicleTemplates,
    deleteVehicleTemplate,
    type SavedVehicleTemplate,
} from '@/app/univehiclecreator/_lib/firestoreService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function SavedMappings({ isOpen, onClose }: Props) {
    const mapping = useAppStore((s) => s.mapping);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const dynamicFieldCounts = useAppStore((s) => s.dynamicFieldCounts);
    const currentUser = useAppStore((s) => s.currentUser);
    const setMapping = useAppStore((s) => s.setMapping);

    const [templates, setTemplates] = useState<SavedVehicleTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [saveDesc, setSaveDesc] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const firebaseReady = isFirebaseConfigured();

    const refresh = useCallback(async () => {
        if (!firebaseReady) return;
        setLoading(true);
        try {
            const list = await loadVehicleTemplates();
            setTemplates(list);
        } catch (err) {
            console.error('[SavedMappings] Error:', err);
        } finally {
            setLoading(false);
        }
    }, [firebaseReady]);

    useEffect(() => {
        if (isOpen && firebaseReady) refresh();
    }, [isOpen, firebaseReady, refresh]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!saveName.trim()) return;
        setSaving(true);
        try {
            await saveVehicleTemplate({
                name: saveName.trim(),
                description: saveDesc.trim(),
                createdBy: currentUser || 'anonymous',
                mapping,
                booleanOverrides,
                dynamicFieldCounts,
            });
            setFeedback({ type: 'success', msg: '✅ Plantilla guardada exitosamente' });
            setSaveName('');
            setSaveDesc('');
            setShowSaveForm(false);
            await refresh();
        } catch (err) {
            setFeedback({ type: 'error', msg: `❌ ${err instanceof Error ? err.message : 'Error al guardar'}` });
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleLoad = (tpl: SavedVehicleTemplate) => {
        setMapping(tpl.mapping || {});
        
        const store = useAppStore.getState();
        if (tpl.booleanOverrides) {
            for (const [k, v] of Object.entries(tpl.booleanOverrides)) {
                store.setBooleanOverride(k, v);
            }
        }
        if (tpl.dynamicFieldCounts) {
            for (const [k, v] of Object.entries(tpl.dynamicFieldCounts)) {
                store.setDynamicFieldCount(k, v);
            }
        }
        setFeedback({ type: 'success', msg: `✅ Plantilla "${tpl.name}" cargada` });
        setTimeout(() => setFeedback(null), 3000);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar la plantilla "${name}"?`)) return;
        try {
            await deleteVehicleTemplate(id);
            setFeedback({ type: 'success', msg: '🗑️ Plantilla eliminada' });
            await refresh();
        } catch (err) {
            setFeedback({ type: 'error', msg: `❌ ${err instanceof Error ? err.message : 'Error'}` });
        }
        setTimeout(() => setFeedback(null), 3000);
    };

    const mappedCount = Object.values(mapping).filter(Boolean).length;

    const formatDate = (ts: { seconds: number } | null) => {
        if (!ts) return '—';
        return new Date(ts.seconds * 1000).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
            <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 bg-slate-800 border-b border-slate-700">
                    <h2 className="text-lg font-bold">☁️ Plantillas en la Nube</h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-semibold uppercase tracking-wider text-indigo-400">Vehículos</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Firebase not configured */}
                    {!firebaseReady && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
                            <h3 className="text-sm font-bold mb-1">⚠️ Firebase no configurado</h3>
                            <p className="text-xs">
                                Para guardar plantillas en la nube, asegúrate de configurar las credenciales de Firebase en el entorno.
                            </p>
                            <p className="text-xs mt-2 text-slate-400">
                                Mientras tanto, puedes usar <strong>Exportar/Importar JSON</strong> en &quot;Acciones de Mapeo&quot;.
                            </p>
                        </div>
                    )}

                    {/* Save Current Mapping */}
                    {firebaseReady && (
                        <div>
                            {!showSaveForm ? (
                                <button
                                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-600/35 transition-all cursor-pointer"
                                    onClick={() => setShowSaveForm(true)}
                                >
                                    💾 Guardar Mapeo Actual ({mappedCount} campos)
                                </button>
                            ) : (
                                <div className="space-y-3 p-4 bg-slate-800/40 rounded-xl border border-slate-750">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                        placeholder="Nombre de la plantilla *"
                                        value={saveName}
                                        onChange={(e) => setSaveName(e.target.value)}
                                        autoFocus
                                    />
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                        placeholder="Descripción (opcional)"
                                        value={saveDesc}
                                        onChange={(e) => setSaveDesc(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            className="flex-1 py-2 text-sm font-semibold bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                                            onClick={() => setShowSaveForm(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            className="flex-1 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-md disabled:opacity-50 cursor-pointer"
                                            onClick={handleSave}
                                            disabled={saving || !saveName.trim()}
                                        >
                                            {saving ? '⏳...' : '💾 Guardar'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Templates List */}
                    {firebaseReady && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plantillas Guardadas</h3>
                                {loading && <span className="text-xs text-indigo-400 animate-pulse">Cargando...</span>}
                            </div>

                            {templates.length === 0 && !loading && (
                                <div className="p-6 text-center text-sm text-slate-500 italic">
                                    No hay plantillas guardadas aún
                                </div>
                            )}

                            <div className="space-y-2 max-h-64 overflow-auto">
                                {templates.map((tpl) => (
                                    <div key={tpl.id} className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl hover:bg-slate-800 hover:border-slate-650 transition-all group">
                                        <div className="flex-1 min-w-0 font-medium">
                                            <div className="text-sm font-bold text-slate-200 truncate">{tpl.name}</div>
                                            {tpl.description && (
                                                <div className="text-xs text-slate-400 truncate mt-0.5">{tpl.description}</div>
                                            )}
                                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                                                <span>👤 {tpl.createdBy}</span>
                                                <span>📅 {formatDate(tpl.updatedAt as { seconds: number } | null)}</span>
                                                <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-bold">
                                                    {Object.values(tpl.mapping || {}).filter(Boolean).length} campos
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-sm transition-colors cursor-pointer"
                                                onClick={() => handleLoad(tpl)}
                                            >
                                                📂 Cargar
                                            </button>
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                                onClick={() => handleDelete(tpl.id, tpl.name)}
                                                title="Eliminar"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Feedback */}
                    {feedback && (
                        <div className={`p-3 rounded-xl text-sm font-medium text-center ${feedback.type === 'success'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-300 border border-red-500/30'
                            }`}>
                            {feedback.msg}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-800 border-t border-slate-700 flex justify-end">
                    <button
                        className="px-5 py-2 text-sm font-semibold bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-650 transition-colors cursor-pointer"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
