/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { FIELD_GROUPS, KNOWN_BOOLEAN_PATHS } from '../../data/schema';
import { levenshtein } from '../../utils/levenshtein';
import { isFirebaseConfigured } from '@/app/uniordercreator/_lib/firebase';
import {
    saveTemplate,
    loadTemplates,
    type SavedTemplate,
} from '@/app/uniordercreator/_lib/unigis/firestoreService';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Suggestion {
    field: string;
    score: number;
    label: string;
    group: string;
    isBool: boolean;
}

interface HeaderMapping {
    header: string;
    selectedField: string;
    confirmed: boolean;
    skipped: boolean;
}

interface Props {
    isOpen: boolean;
    headers: string[];
    onComplete: (mapping: Record<string, string>, booleanOverrides: Record<string, boolean>) => void;
    onClose: () => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const BOOL_TRUE_SENTINEL = '__BOOL_TRUE__';
const BOOL_FALSE_SENTINEL = '__BOOL_FALSE__';
const BOOLEAN_SET = new Set(KNOWN_BOOLEAN_PATHS);

// All available fields + their group label for display
function getAllFieldsWithGroup(): { field: string; group: string }[] {
    const result: { field: string; group: string }[] = [];
    for (const [group, fields] of Object.entries(FIELD_GROUPS)) {
        for (const field of fields) {
            result.push({ field, group });
        }
    }
    return result;
}

const ALL_FIELDS = getAllFieldsWithGroup();

// ─── Suggestion Engine ─────────────────────────────────────────────────────────

function getSuggestions(header: string, allFields: typeof ALL_FIELDS, alreadyMapped: Set<string>): Suggestion[] {
    const headerLower = header.toLowerCase().trim();
    const scored: Suggestion[] = [];

    for (const { field, group } of allFields) {
        if (alreadyMapped.has(field)) continue; // Don't suggest already-mapped fields

        const shortName = field.split('.').pop()?.toLowerCase() || '';
        const isBool = BOOLEAN_SET.has(field);
        let score = 0;

        // Exact match (case-insensitive) on short name
        if (shortName === headerLower) {
            score = 100;
        }
        // Exact match on full path tail
        else if (field.toLowerCase().endsWith(`.${headerLower}`)) {
            score = 95;
        }
        // Header contains field name
        else if (headerLower.includes(shortName) && shortName.length > 2) {
            score = 80;
        }
        // Field name contains header
        else if (shortName.includes(headerLower) && headerLower.length > 2) {
            score = 75;
        }
        // Levenshtein fuzzy
        else {
            const dist = levenshtein(shortName, headerLower);
            const maxLen = Math.max(shortName.length, headerLower.length);
            if (maxLen > 0) {
                const similarity = 1 - dist / maxLen;
                if (similarity >= 0.5) {
                    score = Math.round(similarity * 70);
                }
            }
        }

        if (score > 0) {
            scored.push({
                field,
                score,
                label: field.split('.').pop() || field,
                group,
                isBool,
            });
        }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function MappingWizard({ isOpen, headers, onComplete, onClose }: Props) {
    const [step, setStep] = useState(0); // 0=Summary, 1=Mapping, 2=Confirm
    const [currentHeaderIdx, setCurrentHeaderIdx] = useState(0);
    const [headerMappings, setHeaderMappings] = useState<HeaderMapping[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<typeof ALL_FIELDS>([]);

    // Template loading
    const [templates, setTemplates] = useState<SavedTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Save form
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [saveDesc, setSaveDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const currentUser = useAppStore((s) => s.currentUser);
    const dynamicFieldCounts = useAppStore((s) => s.dynamicFieldCounts);
    const multiSheet = useAppStore((s) => s.multiSheet);

    // Initialize header mappings when wizard opens
    useEffect(() => {
        if (isOpen && headers.length > 0) {
            setHeaderMappings(
                headers.map((h) => ({
                    header: h,
                    selectedField: '',
                    confirmed: false,
                    skipped: false,
                }))
            );
            setStep(0);
            setCurrentHeaderIdx(0);
            setSearchQuery('');
            setFeedback(null);
            setShowSaveForm(false);

            // Load templates
            if (isFirebaseConfigured()) {
                setLoadingTemplates(true);
                loadTemplates()
                    .then(setTemplates)
                    .catch(console.error)
                    .finally(() => setLoadingTemplates(false));
            }
        }
    }, [isOpen, headers]);

    // Currently mapped fields (to exclude from suggestions)
    const alreadyMapped = useMemo(() => {
        const set = new Set<string>();
        headerMappings.forEach((hm) => {
            if (hm.selectedField && hm.confirmed) set.add(hm.selectedField);
        });
        return set;
    }, [headerMappings]);

    // Suggestions for current header
    const currentHeader = headerMappings[currentHeaderIdx];
    const suggestions = useMemo(() => {
        if (!currentHeader) return [];
        return getSuggestions(currentHeader.header, ALL_FIELDS, alreadyMapped);
    }, [currentHeader, alreadyMapped]);

    // Auto-select top suggestion if score >= 90
    useEffect(() => {
        if (step === 1 && currentHeader && !currentHeader.confirmed && !currentHeader.skipped && !currentHeader.selectedField) {
            if (suggestions.length > 0 && suggestions[0].score >= 90) {
                updateCurrentMapping(suggestions[0].field);
            }
        }
    }, [currentHeaderIdx, step, suggestions]);

    // Search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const q = searchQuery.toLowerCase();
        const results = ALL_FIELDS.filter((f) => {
            if (alreadyMapped.has(f.field)) return false;
            const short = f.field.split('.').pop()?.toLowerCase() || '';
            return short.includes(q) || f.field.toLowerCase().includes(q) || f.group.toLowerCase().includes(q);
        }).slice(0, 10);
        setSearchResults(results);
    }, [searchQuery, alreadyMapped]);

    // ─── Handlers ──────────────────────────────────────────────────────────

    const updateCurrentMapping = useCallback((field: string) => {
        setHeaderMappings((prev) => {
            const next = [...prev];
            next[currentHeaderIdx] = { ...next[currentHeaderIdx], selectedField: field };
            return next;
        });
        setSearchQuery('');
    }, [currentHeaderIdx]);

    const confirmCurrent = useCallback(() => {
        setHeaderMappings((prev) => {
            const next = [...prev];
            next[currentHeaderIdx] = { ...next[currentHeaderIdx], confirmed: true, skipped: false };
            return next;
        });
        // Auto-advance
        if (currentHeaderIdx < headers.length - 1) {
            setCurrentHeaderIdx((i) => i + 1);
        }
        setSearchQuery('');
    }, [currentHeaderIdx, headers.length]);

    const skipCurrent = useCallback(() => {
        setHeaderMappings((prev) => {
            const next = [...prev];
            next[currentHeaderIdx] = { ...next[currentHeaderIdx], skipped: true, confirmed: false, selectedField: '' };
            return next;
        });
        if (currentHeaderIdx < headers.length - 1) {
            setCurrentHeaderIdx((i) => i + 1);
        }
        setSearchQuery('');
    }, [currentHeaderIdx, headers.length]);

    const goToHeader = useCallback((idx: number) => {
        setCurrentHeaderIdx(idx);
        setSearchQuery('');
    }, []);

    // Apply template
    const applyTemplate = useCallback((tpl: SavedTemplate) => {
        const newMappings = headers.map((h) => {
            // Find if this header was the value for any mapping key
            const matchedField = Object.entries(tpl.mapping || {}).find(([, val]) => val === h);
            return {
                header: h,
                selectedField: matchedField ? matchedField[0] : '',
                confirmed: !!matchedField,
                skipped: false,
            };
        });
        setHeaderMappings(newMappings);
        setStep(2); // Jump to confirmation
    }, [headers]);

    // Build final mapping from headerMappings
    const buildFinalMapping = useCallback((): { mapping: Record<string, string>; booleanOverrides: Record<string, boolean> } => {
        const mapping: Record<string, string> = {};
        const booleanOverrides: Record<string, boolean> = {};

        headerMappings.forEach((hm) => {
            if (!hm.confirmed || !hm.selectedField) return;

            // Boolean fixed values
            if (hm.selectedField === BOOL_TRUE_SENTINEL) {
                // Find the field this was mapped to via the header name? No — for bool fixed, field IS the key
                return;
            }
            if (hm.selectedField === BOOL_FALSE_SENTINEL) {
                return;
            }

            mapping[hm.selectedField] = hm.header;
        });

        return { mapping, booleanOverrides };
    }, [headerMappings]);

    // Apply and close
    const handleApply = useCallback(() => {
        const { mapping, booleanOverrides } = buildFinalMapping();
        onComplete(mapping, booleanOverrides);
    }, [buildFinalMapping, onComplete]);

    // Save template
    const handleSaveTemplate = useCallback(async () => {
        if (!saveName.trim()) return;
        setSaving(true);
        try {
            const { mapping, booleanOverrides } = buildFinalMapping();
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
            setFeedback({ type: 'success', msg: '✅ Plantilla guardada' });
            setShowSaveForm(false);
            setSaveName('');
            setSaveDesc('');
        } catch (err: any) {
            setFeedback({ type: 'error', msg: `❌ ${err.message}` });
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    }, [saveName, saveDesc, buildFinalMapping, currentUser, dynamicFieldCounts, multiSheet]);

    // ─── Stats ─────────────────────────────────────────────────────────────

    const confirmedCount = headerMappings.filter((h) => h.confirmed).length;
    const skippedCount = headerMappings.filter((h) => h.skipped).length;
    const pendingCount = headers.length - confirmedCount - skippedCount;
    const progressPct = headers.length > 0 ? Math.round(((confirmedCount + skippedCount) / headers.length) * 100) : 0;

    if (!isOpen || headers.length === 0) return null;

    // ─── Render ────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
            <div
                className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl shadow-slate-900/30 border border-slate-100 overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-violet-600 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white">🗺️ Wizard de Mapeo</h2>
                            <p className="text-sm text-indigo-200 mt-0.5">Asigna cada cabecera del Excel a un campo UNIGIS</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {[0, 1, 2].map((s) => (
                                <button
                                    key={s}
                                    className={`w-8 h-8 rounded-full text-xs font-black transition-all ${step === s
                                        ? 'bg-white text-indigo-700 shadow-lg scale-110'
                                        : step > s
                                            ? 'bg-indigo-400/50 text-white'
                                            : 'bg-indigo-800/50 text-indigo-300'
                                        }`}
                                    onClick={() => { if (s <= step || (s === 2 && confirmedCount + skippedCount === headers.length)) setStep(s); }}
                                >
                                    {s + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-auto p-6">
                    {/* ═══ STEP 0: Summary ═══ */}
                    {step === 0 && (
                        <div className="space-y-5">
                            {/* Detection summary */}
                            <div className="p-5 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
                                <div className="text-center mb-4">
                                    <div className="text-4xl mb-2">📊</div>
                                    <h3 className="text-lg font-black text-slate-800">
                                        Se detectaron <span className="text-indigo-600">{headers.length}</span> cabeceras
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">en el fichero Excel cargado</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5 justify-center">
                                    {headers.map((h) => (
                                        <span
                                            key={h}
                                            className="px-2 py-0.5 text-xs font-semibold bg-white/80 text-indigo-700 rounded-lg border border-indigo-200/60 shadow-sm"
                                        >
                                            {h}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Load existing template */}
                            {isFirebaseConfigured() && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        ☁️ ¿Tienes una plantilla guardada?
                                    </h4>
                                    {loadingTemplates && (
                                        <p className="text-xs text-slate-400 animate-pulse">Cargando plantillas...</p>
                                    )}
                                    {templates.length > 0 && (
                                        <div className="space-y-1.5 max-h-40 overflow-auto">
                                            {templates.map((tpl) => (
                                                <button
                                                    key={tpl.id}
                                                    className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
                                                    onClick={() => applyTemplate(tpl)}
                                                >
                                                    <span className="text-lg">📋</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-bold text-slate-700 truncate">{tpl.name}</div>
                                                        {tpl.description && (
                                                            <div className="text-xs text-slate-500 truncate">{tpl.description}</div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Aplicar →
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {!loadingTemplates && templates.length === 0 && (
                                        <p className="text-xs text-slate-400 italic p-2">No hay plantillas guardadas aún</p>
                                    )}
                                </div>
                            )}

                            {/* Start mapping button */}
                            <button
                                className="w-full py-3.5 text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all"
                                onClick={() => setStep(1)}
                            >
                                🗺️ Mapear Manualmente ({headers.length} cabeceras)
                            </button>
                        </div>
                    )}

                    {/* ═══ STEP 1: Mapping per header ═══ */}
                    {step === 1 && currentHeader && (
                        <div className="space-y-4">
                            {/* Progress bar */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                    {confirmedCount + skippedCount}/{headers.length}
                                </span>
                            </div>

                            {/* Header navigation pills */}
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-auto">
                                {headerMappings.map((hm, idx) => (
                                    <button
                                        key={hm.header}
                                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg border transition-all ${idx === currentHeaderIdx
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                                            : hm.confirmed
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : hm.skipped
                                                    ? 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                            }`}
                                        onClick={() => goToHeader(idx)}
                                    >
                                        {hm.header}
                                    </button>
                                ))}
                            </div>

                            {/* Main mapping card */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* LEFT: Excel header */}
                                <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">📊 Cabecera Excel</div>
                                    <div className="text-xl font-black text-slate-800 break-all">{currentHeader.header}</div>
                                    <div className="text-xs text-slate-500 mt-2">
                                        Cabecera {currentHeaderIdx + 1} de {headers.length}
                                    </div>
                                    {currentHeader.confirmed && (
                                        <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg inline-block">
                                            ✅ Confirmado
                                        </div>
                                    )}
                                    {currentHeader.skipped && (
                                        <div className="mt-2 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg inline-block">
                                            ⏭️ Omitido
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT: Suggestions + Search */}
                                <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 rounded-2xl border border-indigo-100">
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">🏛️ Campo UNIGIS</div>

                                    {/* Suggestions */}
                                    {suggestions.length > 0 ? (
                                        <div className="space-y-1.5 mb-3">
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={s.field}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-xl border transition-all ${currentHeader.selectedField === s.field
                                                        ? 'bg-indigo-100 border-indigo-300 ring-1 ring-indigo-400/50'
                                                        : 'bg-white/80 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                                                        }`}
                                                    onClick={() => updateCurrentMapping(s.field)}
                                                >
                                                    <span className={`text-sm font-black ${i === 0 && s.score >= 80 ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                        {currentHeader.selectedField === s.field ? '●' : '○'}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold text-slate-700 truncate flex items-center gap-1">
                                                            {s.label}
                                                            {s.isBool && (
                                                                <span className="text-[7px] font-bold bg-violet-600 text-white px-1 rounded leading-tight">BOOL</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400 truncate">{s.field}</div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${s.score >= 90
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : s.score >= 70
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {s.score}%
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic mb-3">Sin sugerencias. Usa el buscador ↓</p>
                                    )}

                                    {/* Search */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
                                            placeholder="🔍 Buscar campo..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-40 overflow-auto z-10">
                                                {searchResults.map((r) => (
                                                    <button
                                                        key={r.field}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0"
                                                        onClick={() => {
                                                            updateCurrentMapping(r.field);
                                                            setSearchQuery('');
                                                        }}
                                                    >
                                                        <span className="text-indigo-500 font-bold">{r.group}</span>
                                                        <span className="text-slate-700 font-semibold truncate">{r.field.split('.').pop()}</span>
                                                        {BOOLEAN_SET.has(r.field) && (
                                                            <span className="text-[7px] font-bold bg-violet-600 text-white px-1 rounded">BOOL</span>
                                                        )}
                                                        <span className="text-[9px] text-slate-400 ml-auto truncate max-w-[150px]">{r.field}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center justify-between pt-2">
                                <button
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-30"
                                    disabled={currentHeaderIdx === 0}
                                    onClick={() => goToHeader(currentHeaderIdx - 1)}
                                >
                                    ← Anterior
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        className="px-5 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                                        onClick={skipCurrent}
                                    >
                                        ⏭️ Omitir
                                    </button>
                                    <button
                                        className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-40"
                                        disabled={!currentHeader.selectedField}
                                        onClick={confirmCurrent}
                                    >
                                        ✅ Confirmar →
                                    </button>
                                </div>
                            </div>

                            {/* Skip to summary */}
                            {confirmedCount + skippedCount > 0 && (
                                <button
                                    className="w-full py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                    onClick={() => setStep(2)}
                                >
                                    Ver resumen y aplicar ({confirmedCount} mapeados, {skippedCount} omitidos, {pendingCount} pendientes)
                                </button>
                            )}
                        </div>
                    )}

                    {/* ═══ STEP 2: Confirmation ═══ */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                                    <div className="text-2xl font-black text-emerald-600">{confirmedCount}</div>
                                    <div className="text-[10px] font-semibold text-emerald-500">Mapeados</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <div className="text-2xl font-black text-slate-500">{skippedCount}</div>
                                    <div className="text-[10px] font-semibold text-slate-400">Omitidos</div>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                                    <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
                                    <div className="text-[10px] font-semibold text-amber-500">Pendientes</div>
                                </div>
                            </div>

                            {/* Mapping table */}
                            <div className="max-h-60 overflow-auto rounded-xl border border-slate-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Cabecera Excel</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">→</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Campo UNIGIS</th>
                                            <th className="px-3 py-2 text-center font-bold text-slate-500">Estado</th>
                                            <th className="px-3 py-2 text-center font-bold text-slate-500"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {headerMappings.map((hm, idx) => (
                                            <tr key={hm.header} className={`border-t border-slate-100 ${hm.confirmed ? 'bg-emerald-50/30' : hm.skipped ? 'bg-slate-50/50' : 'bg-amber-50/20'}`}>
                                                <td className="px-3 py-2 font-semibold text-slate-700">{hm.header}</td>
                                                <td className="px-3 py-2 text-slate-300">→</td>
                                                <td className="px-3 py-2 font-mono text-[10px] text-indigo-600">
                                                    {hm.selectedField ? hm.selectedField.split('.').pop() : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {hm.confirmed && <span className="text-emerald-500 font-bold">✅</span>}
                                                    {hm.skipped && <span className="text-slate-400">⏭️</span>}
                                                    {!hm.confirmed && !hm.skipped && <span className="text-amber-500">⏳</span>}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold"
                                                        onClick={() => { setStep(1); goToHeader(idx); }}
                                                    >
                                                        Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Save template */}
                            {isFirebaseConfigured() && !showSaveForm && (
                                <button
                                    className="w-full py-2.5 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                                    onClick={() => setShowSaveForm(true)}
                                >
                                    💾 Guardar como plantilla para reutilizar
                                </button>
                            )}

                            {showSaveForm && (
                                <div className="space-y-2 p-4 bg-amber-50/50 rounded-xl border border-amber-200">
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
                                            className="flex-1 py-2 text-sm font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                                            onClick={() => setShowSaveForm(false)}
                                        >Cancelar</button>
                                        <button
                                            className="flex-1 py-2 text-sm font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-400 shadow-md disabled:opacity-50"
                                            onClick={handleSaveTemplate}
                                            disabled={saving || !saveName.trim()}
                                        >
                                            {saving ? '⏳...' : '💾 Guardar'}
                                        </button>
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
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    {step === 2 && (
                        <button
                            className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-40"
                            onClick={handleApply}
                            disabled={confirmedCount === 0}
                        >
                            ✅ Aplicar Mapeo ({confirmedCount} campos)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
