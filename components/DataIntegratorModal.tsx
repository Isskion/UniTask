"use client";

import { useState, useEffect } from "react";
import { X, Download, Upload, FileSpreadsheet, List, ArrowRight, Save, Check, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { ExportTemplateService } from "@/lib/export-templates";
import { CsvUtils } from "@/lib/csv-utils";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, ExportTemplate } from "@/types";

/**
 * DataIntegratorModal
 * 
 * Central hub for Import / Export of CSV data.
 * Tabs: Export (Default) | Import
 */

interface Props {
    onClose: () => void;
    projectId?: string; // Context (if opened from project)
    tenantId: string;
}

type Tab = 'export' | 'import';

export function DataIntegratorModal({ onClose, projectId, tenantId }: Props) {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const [activeTab, setActiveTab] = useState<Tab>('export');

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className={cn(
                "w-full max-w-4xl h-[85vh] flex flex-col rounded-xl shadow-2xl border",
                isLight ? "bg-white border-zinc-200" : "bg-zinc-900 border-white/10"
            )}>
                {/* Header */}
                <div className="h-14 border-b flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
                            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h2 className={cn("font-bold text-lg", isLight ? "text-zinc-900" : "text-white")}>Data Integration</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className={cn("flex border-b px-6 gap-6", isLight ? "bg-zinc-50" : "bg-white/5")}>
                    <button
                        onClick={() => setActiveTab('export')}
                        className={cn("py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'export'
                                ? "border-indigo-500 text-indigo-500"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                    <button
                        onClick={() => setActiveTab('import')}
                        className={cn("py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'import'
                                ? "border-indigo-500 text-indigo-500"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Upload className="w-4 h-4" />
                        Import Data
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative flex">
                    {activeTab === 'export' ? (
                        <ExportView onClose={onClose} projectId={projectId} tenantId={tenantId} />
                    ) : (
                        <ImportView onClose={onClose} projectId={projectId} tenantId={tenantId} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// EXPORT VIEW
// ----------------------------------------------------------------------

const AVAILABLE_COLUMNS = [
    { key: 'friendlyId', label: 'Task ID (Canonical)' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'progress', label: 'Progress (%)' },
    { key: 'description', label: 'Description' },
    { key: 'assignedTo', label: 'Assignee ID' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'Due Date' },
    { key: 'parentTaskId', label: 'Parent ID' }, // Hierarchy
    { key: 'priority', label: 'Priority' },
];

function ExportView({ onClose, projectId, tenantId }: { onClose: () => void, projectId?: string, tenantId: string }) {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const [templates, setTemplates] = useState<ExportTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    // Column State
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['friendlyId', 'title', 'status', 'progress']); // Default

    // Data State
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [fullData, setFullData] = useState<any[]>([]); // Cached full data
    const [loading, setLoading] = useState(false);
    const [userMap, setUserMap] = useState<Record<string, string>>({}); // UID -> DisplayName

    // Template Save State
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");

    // Load USER MAP
    useEffect(() => {
        const loadUsers = async () => {
            const q = query(collection(db, 'users'), where('tenantId', '==', tenantId));
            const snap = await getDocs(q);
            const map: Record<string, string> = {};
            snap.forEach(d => {
                const u = d.data();
                map[d.id] = u.displayName || u.email || d.id;
            });
            setUserMap(map);
        };
        loadUsers();
    }, [tenantId]);

    // Load Templates
    useEffect(() => {
        ExportTemplateService.list(tenantId, 'task').then(setTemplates);
    }, [tenantId]);

    // Load Data
    useEffect(() => {
        if (!projectId) return;
        const load = async () => {
            setLoading(true);
            try {
                // Fetch ALL tasks for project
                const q = query(collection(db, 'tasks'), where('projectId', '==', projectId));
                const snap = await getDocs(q);
                // rawTasks
                const rawTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
                setFullData(rawTasks);
            } catch (e) {
                console.error("Export load error", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projectId]);

    // TRANSFORM Data for Export/Preview (Apply Formatters)
    const processedData = fullData.map(t => {
        const row: any = { ...t };

        // Helper to format date as DD-MM-YYYY
        const formatDate = (date: any) => {
            if (!date) return null;
            let d: Date;
            if (typeof date.toDate === 'function') {
                d = date.toDate();
            } else if (date.seconds) {
                d = new Date(date.seconds * 1000);
            } else {
                d = new Date(date);
            }
            if (!d || isNaN(d.getTime())) return null;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };

        // 1. Format Dates (with startDate fallback to createdAt)
        row.startDate = formatDate(row.startDate || row.createdAt);
        row.endDate = formatDate(row.endDate);

        // 2. Resolve User Names
        if (row.assignedTo && userMap[row.assignedTo]) {
            row.assignedTo = userMap[row.assignedTo];
        }

        // 3. Progress Normalization
        if (typeof row.progress === 'object') {
            row.progress = row.progress.actual || 0;
        }

        return row;
    });

    // Update Preview on Data/Column change
    useEffect(() => {
        if (processedData.length > 0) {
            setPreviewData(processedData.slice(0, 5)); // Top 5
        } else {
            setPreviewData([]);
        }
    }, [fullData, userMap]); // Re-run when users load

    const handleColumnToggle = (key: string) => {
        if (selectedColumns.includes(key)) {
            setSelectedColumns(prev => prev.filter(c => c !== key));
        } else {
            setSelectedColumns(prev => [...prev, key]);
        }
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === selectedColumns.length - 1) return;

        const newCols = [...selectedColumns];
        const swapIdx = direction === 'up' ? index - 1 : index + 1;
        [newCols[index], newCols[swapIdx]] = [newCols[swapIdx], newCols[index]];
        setSelectedColumns(newCols);
    };

    const handleTemplateChange = (tmplId: string) => {
        setSelectedTemplateId(tmplId);
        const tmpl = templates.find(t => t.id === tmplId);
        if (tmpl) {
            setSelectedColumns(tmpl.columns);
        }
    };

    const handleSaveTemplate = async () => {
        const name = newTemplateName.trim();
        if (!name) return;

        // Check duplicates
        const existing = templates.find(t => t.name.toLowerCase() === name.toLowerCase());

        if (existing) {
            const confirmUpdate = window.confirm(`A template named "${existing.name}" already exists. Overwrite?`);
            if (!confirmUpdate) return;

            try {
                await ExportTemplateService.update(existing.id, {
                    columns: selectedColumns,
                    // createdBy: user.uid // Update modifier?
                });
                setIsSavingTemplate(false);
                setNewTemplateName("");
                alert("Template updated!");
                // Refresh
                ExportTemplateService.list(tenantId, 'task').then(setTemplates);
            } catch (e) {
                console.error("Error updating", e);
            }
        } else {
            try {
                await ExportTemplateService.create({
                    name: name,
                    tenantId,
                    entity: 'task',
                    columns: selectedColumns,
                    version: 1,
                    createdBy: 'current-user',
                });
                setIsSavingTemplate(false);
                setNewTemplateName("");
                // Refresh
                ExportTemplateService.list(tenantId, 'task').then(setTemplates);
            } catch (e) {
                console.error("Error creating", e);
            }
        }
    };

    const handleDownload = () => {
        if (processedData.length === 0) return;
        const csv = CsvUtils.generateCsv(processedData, selectedColumns);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `tasks_export_${projectId}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex h-full w-full">
            {/* Sidebar: Configuration */}
            <div className={cn("w-80 border-r p-6 flex flex-col gap-6 overflow-y-auto", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900/50 border-white/5")}>

                {/* Template Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-zinc-500">Template</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className={cn("w-full p-2 text-sm rounded border bg-transparent", isLight ? "border-zinc-300" : "border-white/10")}
                        >
                            <option value="">-- Custom Configuration --</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button
                            onClick={() => setIsSavingTemplate(!isSavingTemplate)}
                            className="p-2 border rounded hover:bg-zinc-100 dark:hover:bg-zinc-800" title="Save Template"
                        >
                            <Save className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>
                    {isSavingTemplate && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2">
                            <input
                                value={newTemplateName}
                                onChange={e => setNewTemplateName(e.target.value)}
                                placeholder="Template Name..."
                                className="flex-1 text-sm p-1.5 rounded border bg-transparent"
                            />
                            <button onClick={handleSaveTemplate} className="p-1.5 bg-indigo-500 text-white rounded"><Check className="w-3 h-3" /></button>
                        </div>
                    )}
                </div>

                {/* Columns */}
                <div className="space-y-3 flex-1">
                    <label className="text-xs font-bold uppercase text-zinc-500">Columns & Order</label>

                    {/* Selected (Ordered) */}
                    <div className="flex flex-col gap-1.5 mb-4 p-2 bg-zinc-100 dark:bg-zinc-800/50 rounded">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Active Columns (Ordered)</span>
                        {selectedColumns.map((col, idx) => (
                            <div key={col} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 border dark:border-white/10 rounded shadow-sm">
                                <span className="text-xs font-medium">{AVAILABLE_COLUMNS.find(c => c.key === col)?.label || col}</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => moveColumn(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-zinc-100 hover:text-indigo-500 disabled:opacity-30">▲</button>
                                    <button onClick={() => moveColumn(idx, 'down')} disabled={idx === selectedColumns.length - 1} className="p-1 hover:bg-zinc-100 hover:text-indigo-500 disabled:opacity-30">▼</button>
                                    <button onClick={() => handleColumnToggle(col)} className="p-1 text-red-400 hover:bg-red-500/10 rounded ml-1"><X className="w-3 h-3" /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <label className="text-xs font-bold uppercase text-zinc-500">Add Column</label>
                    <div className="flex flex-col gap-1.5">
                        {AVAILABLE_COLUMNS.filter(col => !selectedColumns.includes(col.key)).map(col => (
                            <label key={col.key} className="flex items-center gap-3 p-2 rounded cursor-pointer transition-colors border border-transparent text-zinc-500 hover:bg-zinc-100 hover:dark:bg-white/5">
                                <input
                                    type="checkbox"
                                    checked={false}
                                    onChange={() => handleColumnToggle(col.key)}
                                    className="rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm">{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Main Action */}
                <button
                    onClick={handleDownload}
                    disabled={loading || fullData.length === 0}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Download CSV
                </button>
            </div>

            {/* Main Area: Preview */}
            <div className="flex-1 flex flex-col min-w-0 bg-background/50">
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <ArrowDownCircle className="w-4 h-4" />
                        Previewing {previewData.length} of {fullData.length} records
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <div className={cn("border rounded-lg overflow-hidden", isLight ? "border-zinc-200 bg-white" : "border-white/10 bg-zinc-900")}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className={cn("text-xs font-bold uppercase", isLight ? "bg-zinc-50 text-zinc-500" : "bg-white/5 text-zinc-400")}>
                                    <tr>
                                        {selectedColumns.map(col => (
                                            <th key={col} className="px-4 py-3 border-r last:border-0 border-white/5 whitespace-nowrap">
                                                {AVAILABLE_COLUMNS.find(c => c.key === col)?.label || col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {previewData.map((row, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            {selectedColumns.map(col => (
                                                <td key={`${i}-${col}`} className="px-4 py-2 border-r last:border-0 border-white/5 whitespace-nowrap text-zinc-500">
                                                    {row[col] === undefined ? '-' : String(row[col])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {previewData.length === 0 && (
                                        <tr>
                                            <td colSpan={selectedColumns.length} className="px-4 py-8 text-center text-zinc-500 italic">
                                                No columns selected or no data available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// IMPORT VIEW
// ----------------------------------------------------------------------

const IMPORT_STEPS = ['Upload', 'Map', 'Validate', 'Result'];

function ImportView({ onClose, projectId, tenantId }: { onClose: () => void, projectId?: string, tenantId: string }) {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const [currentStep, setCurrentStep] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

    // Mapping: SystemField <-> CsvHeader
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

    // Analysis
    const [rowsToProcess, setRowsToProcess] = useState<any[]>([]);
    const [summary, setSummary] = useState({ updates: 0, creates: 0, skips: 0, invalid: 0 });

    const SYSTEM_FIELDS = [
        { key: 'friendlyId', label: 'Task ID (Canonical)', required: false, isId: true },
        { key: 'title', label: 'Title', required: true },
        { key: 'status', label: 'Status', required: false },
        { key: 'progress', label: 'Progress', required: false },
        { key: 'description', label: 'Description', required: false },
        { key: 'parentTaskId', label: 'Parent Task ID', required: false },
    ];

    // STEP 1: UPLOAD
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);

            try {
                const result = await CsvUtils.parseCsv(f);
                setCsvData(result.data); // Raw data
                if (result.meta?.fields) {
                    setCsvHeaders(result.meta.fields);

                    // Auto-Map
                    const initialMap: Record<string, string> = {};
                    SYSTEM_FIELDS.forEach(sf => {
                        // Try exact match first
                        let match = result.meta.fields.find(h => h === sf.key);
                        // Then fuzzy
                        if (!match) {
                            match = result.meta.fields.find(h => CsvUtils.normalizeHeader(h) === sf.key.toLowerCase());
                        }
                        if (match) {
                            initialMap[sf.key] = match;
                        }
                    });
                    setFieldMapping(initialMap);
                }
                setCurrentStep(1); // Auto advance to mapping
            } catch (err) {
                console.error("Parse Error", err);
                alert("Error parsing CSV");
            }
        }
    };

    // STEP 2: MAPPING HELPERS
    const handleMappingChange = (systemKey: string, csvHeader: string) => {
        setFieldMapping(prev => ({ ...prev, [systemKey]: csvHeader }));
    };

    const validateMapping = () => {
        setCurrentStep(2);
    };

    // STEP 3: ANALYZE / PRE-VALIDATE
    useEffect(() => {
        if (currentStep === 2) {
            analyzeData();
        }
    }, [currentStep]);

    const analyzeData = async () => {
        let updates = 0;
        let creates = 0;
        let skips = 0;
        let invalid = 0;

        const processed = [];
        const seenIdsInCsv = new Set<string>();

        // For visual demo, categorize based on ID presence logic

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];
            const taskId = row[fieldMapping['friendlyId']]; // User mapped column for ID
            const title = row[fieldMapping['title']];

            const result = {
                index: i + 1,
                action: 'SKIP',
                errors: [] as string[],
                taskId: taskId || null,
                original: row
            };

            // 1. Check Duplicates in CSV
            if (taskId && seenIdsInCsv.has(taskId)) {
                result.action = 'SKIP';
                result.errors.push("Duplicate Task ID in CSV");
                skips++;
                processed.push(result);
                continue;
            }
            if (taskId) seenIdsInCsv.add(taskId);

            // 2. Determine Action
            if (taskId) {
                result.action = 'UPDATE';
                updates++;
            } else {
                result.action = 'CREATE';
                creates++;
            }

            // 3. Validation
            if (result.action === 'CREATE' && !title) {
                result.errors.push("Missing Title (Required for Create)");
                result.action = 'SKIP'; // Or INVALID?
                invalid++;
                if (creates > 0) creates--;
            }

            processed.push(result);
        }

        setRowsToProcess(processed);
        setSummary({ updates, creates, skips, invalid });
    };

    const handleImport = async () => {
        // EXECUTION PHASE
        // Batch creation logic here
        // ...
        alert("Import Logic Placeholder: " + summary.creates + " tasks would be created.");
        onClose();
    };


    return (
        <div className="flex h-full w-full bg-background/50">
            {/* Stepper Sidebar */}
            <div className={cn("w-64 border-r p-6 flex flex-col gap-6", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900/50 border-white/5")}>
                {IMPORT_STEPS.map((step, idx) => (
                    <div key={idx} className={cn("flex items-center gap-3", idx <= currentStep ? "opacity-100" : "opacity-30")}>
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                            idx < currentStep ? "bg-green-500 text-white" :
                                idx === currentStep ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-500"
                        )}>
                            {idx < currentStep ? <Check className="w-5 h-5" /> : idx + 1}
                        </div>
                        <span className="font-medium">{step}</span>
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 overflow-auto">
                {currentStep === 0 && (
                    <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-xl border-zinc-300 p-10 hover:bg-zinc-50 transition-colors">
                        <Upload className="w-12 h-12 text-zinc-400 mb-4" />
                        <h3 className="text-lg font-bold">Upload CSV File</h3>
                        <p className="text-zinc-500 mb-6">Drag and drop or click to select</p>
                        <input type="file" accept=".csv" onChange={handleFileSelect} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="max-w-2xl mx-auto">
                        <h3 className="text-xl font-bold mb-6">Map Columns</h3>
                        <div className="space-y-4">
                            {SYSTEM_FIELDS.map(field => (
                                <div key={field.key} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                                    <div className="flex flex-col">
                                        <span className="font-bold flex items-center gap-2">
                                            {field.label}
                                            {field.required && <span className="text-red-500 text-xs">*Required</span>}
                                            {field.isId && <span className="text-blue-500 text-xs text-[10px] bg-blue-500/10 px-1 rounded">KEY</span>}
                                        </span>
                                        <span className="text-xs text-zinc-500 font-mono">{field.key}</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                                    <select
                                        className="w-1/2 p-2 rounded border bg-transparent"
                                        value={fieldMapping[field.key] || ""}
                                        onChange={e => handleMappingChange(field.key, e.target.value)}
                                    >
                                        <option value="">-- Ignore --</option>
                                        {csvHeaders.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={validateMapping} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Next: Validate</button>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="flex flex-col h-full">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <span className="block text-2xl font-bold text-blue-500">{summary.updates}</span>
                                <span className="text-xs uppercase text-zinc-500">Updates</span>
                            </div>
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                <span className="block text-2xl font-bold text-green-500">{summary.creates}</span>
                                <span className="text-xs uppercase text-zinc-500">New Tasks</span>
                            </div>
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                <span className="block text-2xl font-bold text-red-500">{summary.invalid + summary.skips}</span>
                                <span className="text-xs uppercase text-zinc-500">Issues</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto border rounded-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-zinc-100 dark:bg-zinc-800 font-bold">
                                    <tr>
                                        <th className="p-3">Row</th>
                                        <th className="p-3">Action</th>
                                        <th className="p-3">ID</th>
                                        <th className="p-3">Issues</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rowsToProcess.map((row) => (
                                        <tr key={row.index} className="border-t border-zinc-100 dark:border-zinc-800">
                                            <td className="p-3 font-mono text-xs">{row.index}</td>
                                            <td className="p-3">
                                                <span className={cn("px-2 py-0.5 rounded textxs font-bold uppercase",
                                                    row.action === 'CREATE' ? "bg-green-100 text-green-700" :
                                                        row.action === 'UPDATE' ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-500"
                                                )}>{row.action}</span>
                                            </td>
                                            <td className="p-3 font-mono">{row.taskId || '-'}</td>
                                            <td className="p-3 text-red-500 text-xs">{row.errors.join(', ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button onClick={handleImport} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Import Valid Rows</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
