/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { KNOWN_BOOLEAN_PATHS } from '../../data/schema';
import { isFirebaseConfigured } from '@/app/uniordercreator/_lib/firebase';
import {
    saveTemplate,
    loadTemplates,
    type SavedTemplate,
} from '@/app/uniordercreator/_lib/unigis/firestoreService';
import {
    searchFields,
    autoMatchHeaders,
    getFieldIndex,
    getGroupNames,
    GROUP_COLORS,
    type SearchResult,
    type AutoMatchResult,
    type IndexedField,
} from '../../utils/fieldSearchEngine';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface HeaderMapping {
    header: string;
    /** Array of selected field paths (supports multi-mapping) */
    selectedFields: string[];
    confirmed: boolean;
    skipped: boolean;
    /** Auto-match confidence from engine */
    confidence: 'high' | 'medium' | 'low' | 'none';
    /** Auto-match score */
    autoScore: number;
}

interface Props {
    isOpen: boolean;
    headers: string[];
    onComplete: (mapping: Record<string, string>, booleanOverrides: Record<string, boolean>) => void;
    onClose: () => void;
    tenantId: string;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BOOLEAN_SET = new Set(KNOWN_BOOLEAN_PATHS);
const AUTO_CONFIRM_THRESHOLD = 95;
const STEPS = ['Resumen', 'Mapeo', 'ConfirmaciÃ³n'] as const;

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function MappingWizard({ isOpen, headers, onComplete, onClose, tenantId }: Props) {
    const [step, setStep] = useState(0);
    const [currentHeaderIdx, setCurrentHeaderIdx] = useState(0);
    const [headerMappings, setHeaderMappings] = useState<HeaderMapping[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'guided' | 'table'>('guided');
    const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
    const [showMultiAdd, setShowMultiAdd] = useState(false);

    // Templates
    const [templates, setTemplates] = useState<SavedTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Save form
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [saveDesc, setSaveDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Auto-match results
    const [autoMatchResults, setAutoMatchResults] = useState<AutoMatchResult[]>([]);
    const [autoConfirmedCount, setAutoConfirmedCount] = useState(0);

    // Group filter in table mode
    const [tableGroupFilter, setTableGroupFilter] = useState<string>('');

    const currentUser = useAppStore((s) => s.currentUser);
    const dynamicFieldCounts = useAppStore((s) => s.dynamicFieldCounts);


    const searchInputRef = useRef<HTMLInputElement>(null);
    const wizardRef = useRef<HTMLDivElement>(null);

    // â”€â”€â”€ Initialize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    useEffect(() => {
        if (isOpen && headers.length > 0) {
            // #31: Read memory
            let memory: Record<string, string> | undefined;
            try {
                const stored = localStorage.getItem('ucc_mapping_memory');
                if (stored) memory = JSON.parse(stored);
            } catch { /* ignore */ }

            // Run auto-match engine
            const matches = autoMatchHeaders(headers, memory);
            setAutoMatchResults(matches);

            // Build initial mappings with auto-match
            let autoCount = 0;
            const initialMappings = matches.map((m) => {
                const isAutoConfirm = m.confidence === 'high' && m.score >= AUTO_CONFIRM_THRESHOLD;
                if (isAutoConfirm) autoCount++;
                return {
                    header: m.header,
                    selectedFields: m.bestMatch ? [m.bestMatch.path] : [],
                    confirmed: isAutoConfirm,
                    skipped: false,
                    confidence: m.confidence,
                    autoScore: m.score,
                };
            });

            setHeaderMappings(initialMappings);
            setAutoConfirmedCount(autoCount);
            setStep(0);
            setCurrentHeaderIdx(0);
            setSearchQuery('');
            setFeedback(null);
            setShowSaveForm(false);
            setViewMode('guided');
            setShowMultiAdd(false);

            // Load templates
            if (isFirebaseConfigured()) {
                setLoadingTemplates(true);
                loadTemplates(tenantId)
                    .then(setTemplates)
                    .catch(console.error)
                    .finally(() => setLoadingTemplates(false));
            }
        }
    }, [isOpen, headers]);

    // â”€â”€â”€ Search results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return searchFields(searchQuery, { limit: 12, minScore: 15 });
    }, [searchQuery]);

    // Suggestions for current header (using the engine)
    const currentHeader = headerMappings[currentHeaderIdx];
    const suggestions = useMemo(() => {
        if (!currentHeader) return [];
        return searchFields(currentHeader.header, { limit: 8, minScore: 20 });
    }, [currentHeader]);

    // Reset suggestion selection when header changes
    useEffect(() => {
        setSelectedSuggestionIdx(0);
        setSearchQuery('');
        setShowMultiAdd(false);
    }, [currentHeaderIdx]);

    // â”€â”€â”€ Keyboard shortcuts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    useEffect(() => {
        if (!isOpen || step !== 1 || viewMode !== 'guided') return;

        const handler = (e: KeyboardEvent) => {
            const activeResults = searchQuery ? searchResults : suggestions;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedSuggestionIdx((i) => Math.min(i + 1, activeResults.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedSuggestionIdx((i) => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (currentHeader?.selectedFields.length > 0) {
                        confirmCurrent();
                    } else if (activeResults.length > 0) {
                        const selected = activeResults[selectedSuggestionIdx];
                        if (selected) {
                            addFieldToCurrent(selected.field.path);
                            // Auto-confirm on Enter after selecting
                            setTimeout(() => confirmCurrent(), 50);
                        }
                    }
                    break;
                case 'Tab':
                    if (!e.shiftKey && !searchQuery) {
                        e.preventDefault();
                        skipCurrent();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (searchQuery) {
                        setSearchQuery('');
                    } else {
                        onClose();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, step, viewMode, searchQuery, searchResults, suggestions, selectedSuggestionIdx, currentHeader]);

    // â”€â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const addFieldToCurrent = useCallback((field: string) => {
        setHeaderMappings((prev) => {
            const next = [...prev];
            const current = next[currentHeaderIdx];
            if (!current.selectedFields.includes(field)) {
                next[currentHeaderIdx] = {
                    ...current,
                    selectedFields: [...current.selectedFields, field],
                };
            }
            return next;
        });
        setSearchQuery('');
    }, [currentHeaderIdx]);

    const removeFieldFromCurrent = useCallback((field: string) => {
        setHeaderMappings((prev) => {
            const next = [...prev];
            const current = next[currentHeaderIdx];
            next[currentHeaderIdx] = {
                ...current,
                selectedFields: current.selectedFields.filter(f => f !== field),
            };
            return next;
        });
    }, [currentHeaderIdx]);

    const setFieldForHeader = useCallback((headerIdx: number, field: string) => {
        setHeaderMappings((prev) => {
            const next = [...prev];
            next[headerIdx] = {
                ...next[headerIdx],
                selectedFields: field ? [field] : [],
                confirmed: !!field,
                skipped: false,
            };
            return next;
        });
    }, []);

    const confirmCurrent = useCallback(() => {
        setHeaderMappings((prev) => {
            const next = [...prev];
            next[currentHeaderIdx] = { ...next[currentHeaderIdx], confirmed: true, skipped: false };
            return next;
        });
        // Auto-advance to next pending
        const nextPending = headerMappings.findIndex((hm, i) => i > currentHeaderIdx && !hm.confirmed && !hm.skipped);
        if (nextPending >= 0) {
            setCurrentHeaderIdx(nextPending);
        } else if (currentHeaderIdx < headers.length - 1) {
            setCurrentHeaderIdx((i) => i + 1);
        }
        setSearchQuery('');
        setShowMultiAdd(false);
    }, [currentHeaderIdx, headers.length, headerMappings]);

    const skipCurrent = useCallback(() => {
        setHeaderMappings((prev) => {
            const next = [...prev];
            next[currentHeaderIdx] = { ...next[currentHeaderIdx], skipped: true, confirmed: false, selectedFields: [] };
            return next;
        });
        const nextPending = headerMappings.findIndex((hm, i) => i > currentHeaderIdx && !hm.confirmed && !hm.skipped);
        if (nextPending >= 0) {
            setCurrentHeaderIdx(nextPending);
        } else if (currentHeaderIdx < headers.length - 1) {
            setCurrentHeaderIdx((i) => i + 1);
        }
        setSearchQuery('');
        setShowMultiAdd(false);
    }, [currentHeaderIdx, headers.length, headerMappings]);

    const goToHeader = useCallback((idx: number) => {
        setCurrentHeaderIdx(idx);
        setSearchQuery('');
        setShowMultiAdd(false);
    }, []);

    // Apply template
    const applyTemplate = useCallback((tpl: SavedTemplate) => {
        const newMappings = headers.map((h) => {
            const matchedField = Object.entries(tpl.mapping || {}).find(([, val]) => val === h);
            return {
                header: h,
                selectedFields: matchedField ? [matchedField[0]] : [],
                confirmed: !!matchedField,
                skipped: false,
                confidence: 'high' as const,
                autoScore: 100,
            };
        });
        setHeaderMappings(newMappings);
        setStep(2);
    }, [headers]);

    // Build final mapping
    const buildFinalMapping = useCallback((): { mapping: Record<string, string>; booleanOverrides: Record<string, boolean> } => {
        const mapping: Record<string, string> = {};
        const booleanOverrides: Record<string, boolean> = {};

        headerMappings.forEach((hm) => {
            if (!hm.confirmed || hm.selectedFields.length === 0) return;

            for (const field of hm.selectedFields) {
                mapping[field] = hm.header;
            }
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
                tenantId,
                mapping,
                booleanOverrides,
                dynamicFieldCounts,
                multiSheetConfig: {
                    mainSheet: '',
                    mainKey: '',
                    relations: [],
                },
            });
            setFeedback({ type: 'success', msg: 'âœ… Plantilla guardada' });
            setShowSaveForm(false);
            setSaveName('');
            setSaveDesc('');
        } catch (err: any) {
            setFeedback({ type: 'error', msg: `âŒ ${err.message}` });
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    }, [saveName, saveDesc, buildFinalMapping, currentUser, dynamicFieldCounts]);

    // â”€â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const confirmedCount = headerMappings.filter((h) => h.confirmed).length;
    const skippedCount = headerMappings.filter((h) => h.skipped).length;
    const pendingCount = headers.length - confirmedCount - skippedCount;
    const progressPct = headers.length > 0 ? Math.round(((confirmedCount + skippedCount) / headers.length) * 100) : 0;
    const multiMappedCount = headerMappings.filter(h => h.selectedFields.length > 1).length;

    if (!isOpen || headers.length === 0) return null;

    // â”€â”€â”€ Field Result Item (reused in guided + search) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const FieldItem = ({ result, selected, onSelect }: { result: SearchResult; selected: boolean; onSelect: () => void }) => {
        const groupColor = GROUP_COLORS[result.field.group] || '#64748b';
        return (
            <button
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-xl border transition-all ${selected
                    ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400/50 shadow-sm'
                    : 'bg-white/80 border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/30'
                    }`}
                onClick={onSelect}
                title={result.field.path}
            >
                <span className={`text-sm font-black transition-colors ${selected ? 'text-indigo-600' : 'text-slate-300'}`}>
                    {selected ? 'â—' : 'â—‹'}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-700 truncate flex items-center gap-1.5">
                        <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: groupColor }}
                        />
                        {result.field.displayLabel}
                        {result.field.isBool && (
                            <span className="text-[7px] font-bold bg-violet-600 text-white px-1 rounded leading-tight">BOOL</span>
                        )}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate font-mono">{result.field.path}</div>
                </div>
                {result.score > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${result.score >= 90
                        ? 'bg-emerald-100 text-emerald-700'
                        : result.score >= 70
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                        {result.score}%
                    </span>
                )}
            </button>
        );
    };

    // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md" onClick={onClose}>
            <div
                ref={wizardRef}
                className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl shadow-slate-900/30 border border-slate-100 overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* â”€â”€ Header â”€â”€ */}
                <div className="px-6 py-3.5 bg-gradient-to-r from-indigo-700 to-violet-600 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                ðŸ—ºï¸ Wizard de Mapeo
                                {step === 1 && (
                                    <span className="text-[10px] font-mono bg-white/20 text-white/80 px-2 py-0.5 rounded-full">
                                        Enter=Confirmar Â· Tab=Omitir Â· â†‘â†“=Navegar Â· Esc=Cerrar
                                    </span>
                                )}
                            </h2>
                            <p className="text-sm text-indigo-200 mt-0.5">
                                {STEPS[step]} â€” {confirmedCount} mapeados, {skippedCount} omitidos, {pendingCount} pendientes
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {STEPS.map((label, s) => (
                                <button
                                    key={s}
                                    className={`w-8 h-8 rounded-full text-xs font-black transition-all ${step === s
                                        ? 'bg-white text-indigo-700 shadow-lg scale-110'
                                        : step > s
                                            ? 'bg-indigo-400/50 text-white'
                                            : 'bg-indigo-800/50 text-indigo-300'
                                        }`}
                                    onClick={() => { if (s <= step || (s === 2 && confirmedCount + skippedCount > 0)) setStep(s); }}
                                    title={label}
                                >
                                    {s + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* â”€â”€ Body â”€â”€ */}
                <div className="flex-1 overflow-auto p-5">
                    {/* â•â•â• STEP 0: Summary â•â•â• */}
                    {step === 0 && (
                        <div className="space-y-4">
                            {/* Detection summary + auto-match results */}
                            <div className="p-5 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
                                <div className="text-center mb-3">
                                    <div className="text-3xl mb-1">ðŸ“Š</div>
                                    <h3 className="text-lg font-black text-slate-800">
                                        {headers.length} cabeceras detectadas
                                    </h3>
                                </div>

                                {/* Auto-match summary */}
                                {autoMatchResults.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 mb-4">
                                        <div className="p-2 bg-emerald-100/80 rounded-xl text-center">
                                            <div className="text-xl font-black text-emerald-700">{autoMatchResults.filter(m => m.confidence === 'high').length}</div>
                                            <div className="text-[9px] font-bold text-emerald-600">Match exacto</div>
                                        </div>
                                        <div className="p-2 bg-amber-100/80 rounded-xl text-center">
                                            <div className="text-xl font-black text-amber-700">{autoMatchResults.filter(m => m.confidence === 'medium').length}</div>
                                            <div className="text-[9px] font-bold text-amber-600">Probable</div>
                                        </div>
                                        <div className="p-2 bg-orange-100/80 rounded-xl text-center">
                                            <div className="text-xl font-black text-orange-700">{autoMatchResults.filter(m => m.confidence === 'low').length}</div>
                                            <div className="text-[9px] font-bold text-orange-600">Dudoso</div>
                                        </div>
                                        <div className="p-2 bg-slate-100/80 rounded-xl text-center">
                                            <div className="text-xl font-black text-slate-500">{autoMatchResults.filter(m => m.confidence === 'none').length}</div>
                                            <div className="text-[9px] font-bold text-slate-400">Sin match</div>
                                        </div>
                                    </div>
                                )}

                                {/* Auto-confirmed note */}
                                {autoConfirmedCount > 0 && (
                                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center mb-3">
                                        <span className="text-sm font-bold text-emerald-700">
                                            âš¡ {autoConfirmedCount} campos auto-confirmados (score â‰¥ {AUTO_CONFIRM_THRESHOLD}%)
                                        </span>
                                        <p className="text-xs text-emerald-600 mt-0.5">Puedes revisarlos en el paso de Mapeo</p>
                                    </div>
                                )}

                                {/* Header pills preview */}
                                <div className="flex flex-wrap gap-1 justify-center max-h-24 overflow-auto">
                                    {autoMatchResults.map((m) => (
                                        <span
                                            key={m.header}
                                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg border shadow-sm ${m.confidence === 'high'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : m.confidence === 'medium'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : m.confidence === 'low'
                                                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                        : 'bg-white text-slate-500 border-slate-200'
                                                }`}
                                            title={m.bestMatch ? `â†’ ${m.bestMatch.path} (${m.score}%)` : 'Sin match'}
                                        >
                                            {m.header}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Load existing template */}
                            {isFirebaseConfigured() && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        â˜ï¸ Plantillas guardadas
                                    </h4>
                                    {loadingTemplates && (
                                        <p className="text-xs text-slate-400 animate-pulse">Cargando...</p>
                                    )}
                                    {templates.length > 0 && (
                                        <div className="space-y-1 max-h-32 overflow-auto">
                                            {templates.map((tpl) => (
                                                <button
                                                    key={tpl.id}
                                                    className="w-full flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
                                                    onClick={() => applyTemplate(tpl)}
                                                >
                                                    <span className="text-lg">ðŸ“‹</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-bold text-slate-700 truncate">{tpl.name}</div>
                                                        {tpl.description && (
                                                            <div className="text-xs text-slate-500 truncate">{tpl.description}</div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Aplicar â†’
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {!loadingTemplates && templates.length === 0 && (
                                        <p className="text-xs text-slate-400 italic p-2">No hay plantillas guardadas</p>
                                    )}
                                </div>
                            )}

                            <button
                                className="w-full py-3 text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all"
                                onClick={() => {
                                    setStep(1);
                                    // Jump to first non-confirmed header
                                    const firstPending = headerMappings.findIndex(hm => !hm.confirmed && !hm.skipped);
                                    if (firstPending >= 0) setCurrentHeaderIdx(firstPending);
                                }}
                            >
                                ðŸ—ºï¸ Mapear ({pendingCount} pendientes de {headers.length})
                            </button>
                        </div>
                    )}

                    {/* â•â•â• STEP 1: Mapping â•â•â• */}
                    {step === 1 && (
                        <div className="space-y-3">
                            {/* Progress + mode toggle */}
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
                                <div className="flex bg-slate-100 rounded-lg p-0.5">
                                    <button
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'guided' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        onClick={() => setViewMode('guided')}
                                    >
                                        Guiado
                                    </button>
                                    <button
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        onClick={() => setViewMode('table')}
                                    >
                                        Tabla
                                    </button>
                                </div>
                            </div>

                            {/* â”€â”€ GUIDED MODE â”€â”€ */}
                            {viewMode === 'guided' && currentHeader && (
                                <>
                                    {/* Header navigation pills */}
                                    <div className="flex flex-wrap gap-1 max-h-14 overflow-auto">
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
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* LEFT: Excel header */}
                                        <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">ðŸ“Š Cabecera Excel</div>
                                            <div className="text-xl font-black text-slate-800 break-all">{currentHeader.header}</div>
                                            <div className="text-xs text-slate-500 mt-1.5">
                                                {currentHeaderIdx + 1} de {headers.length}
                                            </div>
                                            {currentHeader.confirmed && (
                                                <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg inline-block">âœ… Confirmado</div>
                                            )}
                                            {currentHeader.skipped && (
                                                <div className="mt-2 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg inline-block">â­ï¸ Omitido</div>
                                            )}

                                            {/* Selected fields (multi-mapping) */}
                                            {currentHeader.selectedFields.length > 0 && (
                                                <div className="mt-3 space-y-1">
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Mapeado a:</div>
                                                    {currentHeader.selectedFields.map((f) => (
                                                        <div key={f} className="flex items-center gap-1.5 text-xs bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1">
                                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GROUP_COLORS[getFieldIndex().find(fi => fi.path === f)?.group || ''] || '#6366f1' }} />
                                                            <span className="font-mono text-indigo-700 truncate flex-1">{f.split('.').slice(1).join('.')}</span>
                                                            <button
                                                                className="text-red-400 hover:text-red-600 font-black text-sm leading-none"
                                                                onClick={() => removeFieldFromCurrent(f)}
                                                                title="Quitar"
                                                            >Ã—</button>
                                                        </div>
                                                    ))}
                                                    {/* Add more button */}
                                                    {!showMultiAdd && (
                                                        <button
                                                            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                                                            onClick={() => setShowMultiAdd(true)}
                                                        >
                                                            + Agregar otro destino
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* RIGHT: Suggestions + Search */}
                                        <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 rounded-2xl border border-indigo-100">
                                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">ðŸ›ï¸ Campo UNIGIS</div>

                                            {/* Suggestions */}
                                            {!searchQuery && suggestions.length > 0 && (
                                                <div className="space-y-1 mb-2 max-h-[180px] overflow-auto">
                                                    {suggestions.map((s, i) => (
                                                        <FieldItem
                                                            key={s.field.path}
                                                            result={s}
                                                            selected={currentHeader.selectedFields.includes(s.field.path)}
                                                            onSelect={() => addFieldToCurrent(s.field.path)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {!searchQuery && suggestions.length === 0 && (
                                                <p className="text-xs text-slate-400 italic mb-2">Sin sugerencias â€” usa el buscador â†“</p>
                                            )}

                                            {/* Search */}
                                            <div className="relative">
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
                                                    placeholder="ðŸ” Buscar campo por nombre, sinÃ³nimo o ruta..."
                                                    value={searchQuery}
                                                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedSuggestionIdx(0); }}
                                                />
                                                {searchResults.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl max-h-48 overflow-auto z-10">
                                                        {searchResults.map((r, i) => (
                                                            <button
                                                                key={r.field.path}
                                                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors border-b border-slate-50 last:border-0 ${i === selectedSuggestionIdx ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                                    }`}
                                                                onClick={() => {
                                                                    addFieldToCurrent(r.field.path);
                                                                    setSearchQuery('');
                                                                }}
                                                                onMouseEnter={() => setSelectedSuggestionIdx(i)}
                                                            >
                                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GROUP_COLORS[r.field.group] || '#64748b' }} />
                                                                <span className="font-bold text-slate-600 shrink-0">{r.field.group}</span>
                                                                <span className="text-slate-700 font-semibold truncate">{r.field.displayLabel}</span>
                                                                {r.field.isBool && (
                                                                    <span className="text-[7px] font-bold bg-violet-600 text-white px-1 rounded">BOOL</span>
                                                                )}
                                                                <span className="text-[9px] text-slate-400 ml-auto">{r.matchType} {r.score}%</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center justify-between pt-1">
                                        <button
                                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-30"
                                            disabled={currentHeaderIdx === 0}
                                            onClick={() => goToHeader(currentHeaderIdx - 1)}
                                        >
                                            â† Anterior
                                        </button>

                                        <div className="flex gap-2">
                                            <button
                                                className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                                                onClick={skipCurrent}
                                            >
                                                â­ï¸ Omitir
                                            </button>
                                            <button
                                                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-40"
                                                disabled={currentHeader.selectedFields.length === 0}
                                                onClick={confirmCurrent}
                                            >
                                                âœ… Confirmar{currentHeader.selectedFields.length > 1 ? ` (${currentHeader.selectedFields.length} campos)` : ''} â†’
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick jump to confirmation */}
                                    {confirmedCount + skippedCount > 0 && (
                                        <button
                                            className="w-full py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                            onClick={() => setStep(2)}
                                        >
                                            Ver resumen y aplicar ({confirmedCount} mapeados, {skippedCount} omitidos, {pendingCount} pendientes)
                                        </button>
                                    )}
                                </>
                            )}

                            {/* â”€â”€ TABLE MODE â”€â”€ */}
                            {viewMode === 'table' && (
                                <div className="space-y-2">
                                    {/* Group filter */}
                                    <div className="flex flex-wrap gap-1">
                                        <button
                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all ${!tableGroupFilter ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                            onClick={() => setTableGroupFilter('')}
                                        >
                                            Todos
                                        </button>
                                        {getGroupNames().filter(g => g !== 'Dinamicos').map(g => (
                                            <button
                                                key={g}
                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 ${tableGroupFilter === g ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                onClick={() => setTableGroupFilter(g === tableGroupFilter ? '' : g)}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[g] || '#64748b' }} />
                                                {g}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Table */}
                                    <div className="max-h-[52vh] overflow-auto rounded-xl border border-slate-200">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500 w-1/4">Cabecera Excel</th>
                                                    <th className="px-3 py-2 text-center font-bold text-slate-500 w-8">â†’</th>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500">Campo UNIGIS (buscar)</th>
                                                    <th className="px-3 py-2 text-center font-bold text-slate-500 w-16">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {headerMappings.map((hm, idx) => (
                                                    <tr key={hm.header} className={`border-t border-slate-100 ${hm.confirmed ? 'bg-emerald-50/30' : hm.skipped ? 'bg-slate-50/50' : ''}`}>
                                                        <td className="px-3 py-1.5 font-semibold text-slate-700">{hm.header}</td>
                                                        <td className="px-3 py-1.5 text-slate-300 text-center">â†’</td>
                                                        <td className="px-3 py-1.5">
                                                            <TableFieldSelector
                                                                headerIdx={idx}
                                                                currentField={hm.selectedFields[0] || ''}
                                                                groupFilter={tableGroupFilter}
                                                                onSelect={(field) => setFieldForHeader(idx, field)}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-1.5 text-center">
                                                            {hm.autoScore > 0 && (
                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${hm.autoScore >= 90 ? 'bg-emerald-100 text-emerald-700' : hm.autoScore >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                    {hm.autoScore}%
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* â•â•â• STEP 2: Confirmation â•â•â• */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-2">
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
                                {multiMappedCount > 0 && (
                                    <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 text-center">
                                        <div className="text-2xl font-black text-violet-600">{multiMappedCount}</div>
                                        <div className="text-[10px] font-semibold text-violet-500">Multi-mapeo</div>
                                    </div>
                                )}
                            </div>

                            {/* Mapping table */}
                            <div className="max-h-60 overflow-auto rounded-xl border border-slate-200">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Cabecera Excel</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">â†’</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Campo(s) UNIGIS</th>
                                            <th className="px-3 py-2 text-center font-bold text-slate-500">Estado</th>
                                            <th className="px-3 py-2 text-center font-bold text-slate-500"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {headerMappings.map((hm, idx) => (
                                            <tr key={hm.header} className={`border-t border-slate-100 ${hm.confirmed ? 'bg-emerald-50/30' : hm.skipped ? 'bg-slate-50/50' : 'bg-amber-50/20'}`}>
                                                <td className="px-3 py-2 font-semibold text-slate-700">{hm.header}</td>
                                                <td className="px-3 py-2 text-slate-300">â†’</td>
                                                <td className="px-3 py-2">
                                                    {hm.selectedFields.length > 0
                                                        ? hm.selectedFields.map((f, i) => (
                                                            <span key={f} className="font-mono text-[10px] text-indigo-600">
                                                                {i > 0 && <span className="text-slate-300 mx-1">+</span>}
                                                                {f.split('.').slice(1).join('.')}
                                                            </span>
                                                        ))
                                                        : <span className="text-slate-400">â€”</span>
                                                    }
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {hm.confirmed && <span className="text-emerald-500 font-bold">âœ…</span>}
                                                    {hm.skipped && <span className="text-slate-400">â­ï¸</span>}
                                                    {!hm.confirmed && !hm.skipped && <span className="text-amber-500">â³</span>}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold"
                                                        onClick={() => { setStep(1); goToHeader(idx); setViewMode('guided'); }}
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
                                    ðŸ’¾ Guardar como plantilla
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
                                        placeholder="DescripciÃ³n (opcional)"
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
                                            {saving ? 'â³...' : 'ðŸ’¾ Guardar'}
                                        </button>
                                    </div>
                                </div>
                            )}

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

                {/* â”€â”€ Footer â”€â”€ */}
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
                            âœ… Aplicar Mapeo ({confirmedCount} campos)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// â”€â”€â”€ Table Field Selector (inline dropdown for table mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TableFieldSelector({ headerIdx, currentField, groupFilter, onSelect }: {
    headerIdx: number;
    currentField: string;
    groupFilter: string;
    onSelect: (field: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        return searchFields(query, { limit: 8, group: groupFilter || undefined, minScore: 15 });
    }, [query, groupFilter]);

    const displayValue = currentField ? currentField.split('.').slice(1).join('.') : '';

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <div className="relative">
            {!isOpen ? (
                <button
                    className={`w-full text-left px-2 py-1 rounded-lg border text-xs transition-all ${currentField
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-mono font-semibold hover:bg-indigo-100'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                        }`}
                    onClick={() => setIsOpen(true)}
                >
                    {displayValue || 'Buscar campo...'}
                </button>
            ) : (
                <div>
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full px-2 py-1 text-xs bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        placeholder="Buscar..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onBlur={() => setTimeout(() => { setIsOpen(false); setQuery(''); }, 200)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') { setIsOpen(false); setQuery(''); }
                        }}
                    />
                    {results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-xl max-h-40 overflow-auto z-20">
                            {results.map((r) => (
                                <button
                                    key={r.field.path}
                                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-[11px] hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onSelect(r.field.path);
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: GROUP_COLORS[r.field.group] || '#64748b' }} />
                                    <span className="font-semibold text-slate-700 truncate">{r.field.displayLabel}</span>
                                    <span className="text-[9px] text-slate-400 ml-auto">{r.score}%</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

