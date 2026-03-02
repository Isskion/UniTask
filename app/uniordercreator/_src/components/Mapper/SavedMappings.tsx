"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { isFirebaseConfigured } from '@/app/uniordercreator/_lib/firebase';
import {
    saveTemplate,
    loadTemplates,
    deleteTemplate,
    type SavedTemplate,
} from '@/app/uniordercreator/_lib/unigis/firestoreService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function SavedMappings({ isOpen, onClose }: Props) {
    const mapping = useAppStore((s) => s.mapping);
    const booleanOverrides = useAppStore((s) => s.booleanOverrides);
    const dynamicFieldCounts = useAppStore((s) => s.dynamicFieldCounts);
    const multiSheet = useAppStore((s) => s.multiSheet);
    const currentUser = useAppStore((s) => s.currentUser);
    const setMapping = useAppStore((s) => s.setMapping);

    const [templates, setTemplates] = useState<SavedTemplate[]>([]);
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
            const list = await loadTemplates();
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
            await saveTemplate({
                name: saveName.trim(),
                description: saveDesc.trim(),
                createdBy: currentUser || 'anonymous',
                mapping,
                booleanOverrides,
                dynamicFieldCounts,
                multiSheetConfig: {
                    mainSheet: multiSheet.config.mainSheet,
                    mainKey: multiSheet.config.mainKey,
                    relations: multiSheet.config.relations,
                },
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

    const handleLoad = (tpl: SavedTemplate) => {
        setMapping(tpl.mapping || {});
        // Also restore boolean overrides and dynamic field counts via store
        const store = useAppStore.getState();
        if (tpl.booleanOverrides) {
            for (const [k, v] of Object.entries(tpl.booleanOverrides)) {
                store.setBooleanOverride(k, v as boolean);
            }
        }
        if (tpl.dynamicFieldCounts) {
            for (const [k, v] of Object.entries(tpl.dynamicFieldCounts)) {
                store.setDynamicFieldCount(k, v as number);
            }
        }
        setFeedback({ type: 'success', msg: `✅ Plantilla "${tpl.name}" cargada` });
        setTimeout(() => setFeedback(null), 3000);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar la plantilla "${name}"?`)) return;
        try {
            await deleteTemplate(id);
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
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-500">
                    <h2 className="text-lg font-bold text-white">☁️ Plantillas en la Nube</h2>
                    <p className="text-sm text-amber-100 mt-0.5">Guarda y reutiliza tus configuraciones de mapeo</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Firebase not configured */}
                    {!firebaseReady && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <h3 className="text-sm font-bold text-amber-800 mb-1">⚠️ Firebase no configurado</h3>
                            <p className="text-xs text-amber-700">
                                Para guardar plantillas en la nube, copia <code className="px-1 bg-amber-100 rounded">.env.example</code> a{' '}
                                <code className="px-1 bg-amber-100 rounded">.env.local</code> y añade tus credenciales Firebase.
                            </p>
                            <p className="text-xs text-amber-600 mt-2">
                                Mientras tanto, puedes usar <strong>Exportar/Importar JSON</strong> desde &quot;Acciones de Mapeo&quot;.
                            </p>
                        </div>
                    )}

                    {/* Save Current Mapping */}
                    {firebaseReady && (
                        <div>
                            {!showSaveForm ? (
                                <button
                                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 transition-all"
                                    onClick={() => setShowSaveForm(true)}
                                >
                                    💾 Guardar Mapeo Actual ({mappedCount} campos)
                                </button>
                            ) : (
                                <div className="space-y-3 p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                        placeholder="Nombre de la plantilla *"
                                        value={saveName}
                                        onChange={(e) => setSaveName(e.target.value)}
                                        autoFocus
                                    />
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                        placeholder="Descripción (opcional)"
                                        value={saveDesc}
                                        onChange={(e) => setSaveDesc(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            className="flex-1 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                                            onClick={() => setShowSaveForm(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            className="flex-1 py-2 text-sm font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-400 shadow-md shadow-amber-500/25 transition-all disabled:opacity-50"
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
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Plantillas Guardadas</h3>
                                {loading && <span className="text-xs text-slate-400 animate-pulse">Cargando...</span>}
                            </div>

                            {templates.length === 0 && !loading && (
                                <div className="p-6 text-center text-sm text-slate-400 italic">
                                    No hay plantillas guardadas aún
                                </div>
                            )}

                            <div className="space-y-2 max-h-64 overflow-auto">
                                {templates.map((tpl) => (
                                    <div key={tpl.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-700 truncate">{tpl.name}</div>
                                            {tpl.description && (
                                                <div className="text-xs text-slate-500 truncate">{tpl.description}</div>
                                            )}
                                            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                                <span>👤 {tpl.createdBy}</span>
                                                <span>📅 {formatDate(tpl.updatedAt as { seconds: number } | null)}</span>
                                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-md font-bold">
                                                    {Object.values(tpl.mapping || {}).filter(Boolean).length} campos
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="px-3 py-1.5 text-xs font-bold bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 shadow-sm transition-colors"
                                                onClick={() => handleLoad(tpl)}
                                            >
                                                📂 Cargar
                                            </button>
                                            <button
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {feedback.msg}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        className="px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
