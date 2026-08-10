'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Building2, 
  Truck, 
  MapPin, 
  Package, 
  Route, 
  Smartphone, 
  Users, 
  Calculator, 
  Radio, 
  Globe, 
  Network, 
  Database, 
  TrendingUp, 
  ShieldAlert, 
  FileCheck, 
  Users2, 
  ListChecks, 
  GitCompare, 
  CheckSquare, 
  Calendar, 
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Save,
  Printer,
  Download,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  LayoutGrid,
  Wand2,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RELEVAMIENTO_SECTIONS_FULL, RelevamientoSection, INDUSTRY_TEMPLATES_FULL } from '@/lib/relevamiento_schema';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/hooks/useTheme';

interface RelevamientoToolProps {
  projectId: string;
  projectName?: string;
}

const ICON_MAP: Record<string, any> = {
  BarChart3,
  Building2,
  Truck,
  MapPin,
  Package,
  Route,
  Smartphone,
  Users,
  Calculator,
  Radio,
  Globe,
  Network,
  Database,
  TrendingUp,
  ShieldAlert,
  FileCheck,
  Users2,
  ListChecks,
  GitCompare,
  CheckSquare,
  Calendar,
  Lightbulb
};

export default function RelevamientoTool({ projectId, projectName }: RelevamientoToolProps) {
  const { tenantId } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'matrix' | 'wizard' | 'dds_print'>('matrix');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [tablesData, setTablesData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('europastry');

  const currentSection = RELEVAMIENTO_SECTIONS_FULL[activeSectionIndex] || RELEVAMIENTO_SECTIONS_FULL[0];

  // Carga de Firestore y Auto-completado de Datos del Proyecto
  useEffect(() => {
    if (!projectId || !tenantId) return;

    const docRef = doc(db, 'projects', projectId, 'relevamiento', 'main');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      let loadedAnswers: Record<string, any> = {};
      let loadedTables: Record<string, any[]> = {};

      if (docSnap.exists()) {
        const data = docSnap.data();
        loadedAnswers = data.answers || {};
        loadedTables = data.tablesData || {};
      }

      // Auto-completar Nombre de Proyecto (p1_1) y Cliente (p1_2) si están vacíos
      if (projectName) {
        if (!loadedAnswers['p1_1']) {
          loadedAnswers['p1_1'] = projectName;
        }
        if (!loadedAnswers['p1_2']) {
          loadedAnswers['p1_2'] = projectName;
        }
      }

      setAnswers(loadedAnswers);
      setTablesData(loadedTables);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, tenantId, projectName]);

  // Guardar en Firestore
  const handleSave = async () => {
    if (!projectId || !tenantId) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'projects', projectId, 'relevamiento', 'main');
      await setDoc(docRef, {
        projectId,
        projectName: answers['p1_1'] || projectName || projectId,
        tenantId,
        answers,
        tablesData,
        updatedAt: new Date().toISOString(),
        progressPercent: calculateProgress()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving relevamiento:", error);
    } finally {
      setSaving(false);
    }
  };

  // Cálculo de Progreso
  const calculateProgress = () => {
    let total = 0;
    let filled = 0;
    RELEVAMIENTO_SECTIONS_FULL.forEach(sec => {
      sec.questions?.forEach(q => {
        total++;
        if (answers[q.id]) filled++;
      });
    });
    return total > 0 ? Math.round((filled / total) * 100) : 0;
  };

  const progressPercent = calculateProgress();

  // Precarga de Plantilla 1-Clic
  const handleApplyTemplate = () => {
    const tmpl = INDUSTRY_TEMPLATES_FULL[selectedTemplate];
    if (tmpl && confirm(`¿Deseas precargar las respuestas y módulos estándar para "${tmpl.name}"?`)) {
      const updatedAnswers = { 
        ...answers, 
        p1_1: answers['p1_1'] || projectName || tmpl.name,
        p1_2: tmpl.name, 
        p2_1: tmpl.sector 
      };
      setAnswers(updatedAnswers);
      alert(`⚡ Plantilla "${tmpl.name}" precargada.`);
    }
  };

  // Exportar JSON
  const handleExportJSON = () => {
    const displayProjName = answers['p1_1'] || projectName || projectId;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ projectId, projectName: displayProjName, answers, tablesData }, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `Relevamiento_${displayProjName}.json`;
    a.click();
  };

  // Atajos de teclado para Wizard (Ctrl + Left/Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'ArrowRight') {
        if (activeSectionIndex < RELEVAMIENTO_SECTIONS_FULL.length - 1) {
          setActiveSectionIndex(prev => prev + 1);
        }
      } else if (e.ctrlKey && e.key === 'ArrowLeft') {
        if (activeSectionIndex > 0) {
          setActiveSectionIndex(prev => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSectionIndex]);

  const activeProjectTitle = answers['p1_1'] || projectName || projectId;

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-12", isLight ? "text-slate-700" : "text-slate-400")}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mr-3"></div>
        <span className="font-semibold">Cargando Relevamiento UNIGIS...</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-full w-full rounded-xl overflow-hidden border shadow-xl transition-colors duration-200",
      isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-slate-100"
    )}>
      
      {/* Header Institucional UNIGIS TMS / Unitask */}
      <div className={cn(
        "px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 shrink-0",
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/90 border-slate-800"
      )}>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-red-600 text-white font-black text-xs rounded-md tracking-wider">
            UNIGIS TMS
          </div>
          <div>
            <h1 className={cn("text-lg font-black tracking-tight", isLight ? "text-slate-900" : "text-white")}>
              Relevamiento de Proyectos
            </h1>
            <p className={cn("text-xs font-semibold", isLight ? "text-slate-600" : "text-slate-400")}>
              Proyecto: <span className="text-red-600 dark:text-red-400 font-extrabold">{activeProjectTitle}</span>
            </p>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-3">
          {/* Progress Pill */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold",
            isLight ? "bg-slate-100 border-slate-300 text-slate-900" : "bg-slate-800/60 border-slate-700 text-slate-100"
          )}>
            <div className={cn("w-20 h-2 rounded-full overflow-hidden", isLight ? "bg-slate-300" : "bg-slate-700")}>
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-red-600 font-extrabold">{progressPercent}%</span>
          </div>

          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Guardando..." : "Guardar"}
          </button>

          <button 
            onClick={handleExportJSON}
            className={cn(
              "flex items-center gap-2 px-3 py-2 border text-xs font-bold rounded-lg transition-all",
              isLight ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            )}
          >
            <Download className="w-3.5 h-3.5" />
            JSON
          </button>

          <button 
            onClick={() => { setViewMode('dds_print'); setTimeout(() => window.print(), 300); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir DDS
          </button>
        </div>
      </div>

      {/* Sub-toolbar: Modos de Vista & Smart Pre-fills */}
      <div className={cn(
        "px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 text-xs",
        isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900/40 border-slate-800"
      )}>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewMode('matrix')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md font-bold transition-all",
              viewMode === 'matrix' 
                ? "bg-red-600 text-white shadow-sm" 
                : isLight ? "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50" : "bg-slate-800 text-slate-300 border border-slate-700"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Matriz Libre
          </button>

          <button 
            onClick={() => setViewMode('wizard')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md font-bold transition-all",
              viewMode === 'wizard' 
                ? "bg-red-600 text-white shadow-sm" 
                : isLight ? "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50" : "bg-slate-800 text-slate-300 border border-slate-700"
            )}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-500" />
            Modo Workshop Guiado (Wizard)
          </button>

          <button 
            onClick={() => setViewMode('dds_print')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md font-bold transition-all",
              viewMode === 'dds_print' 
                ? "bg-red-600 text-white shadow-sm" 
                : isLight ? "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50" : "bg-slate-800 text-slate-300 border border-slate-700"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Vista Previa Documento DDS
          </button>
        </div>

        {/* Smart Templates Dropdown */}
        <div className="flex items-center gap-2">
          <span className={cn("font-bold", isLight ? "text-slate-700" : "text-slate-400")}>Plantilla Rápida:</span>
          <select 
            value={selectedTemplate} 
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className={cn(
              "px-2.5 py-1 rounded-md border text-xs font-semibold outline-none",
              isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-200"
            )}
          >
            <option value="europastry">Última Milla & Temperatura (Europastry)</option>
            <option value="transpais">LTL / FTL Internacional (Transpais)</option>
            <option value="standard">Distribución Industrial Estándar</option>
          </select>

          <button 
            onClick={handleApplyTemplate}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 border border-amber-500/40 rounded-md font-bold transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-500" />
            1-Clic Precargar
          </button>
        </div>
      </div>

      {/* Layout Main Content: Sidebar + Section Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* Sidebar (22 Secciones) */}
        {viewMode !== 'dds_print' && (
          <aside className={cn(
            "w-72 border-r flex flex-col overflow-y-auto shrink-0 custom-scrollbar",
            isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
          )}>
            <div className={cn("p-3 border-b", isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950/40 border-slate-800/40")}>
              <span className={cn("text-[10px] font-black uppercase tracking-wider", isLight ? "text-slate-700" : "text-slate-400")}>
                SECCIONES DE RELEVAMIENTO (22)
              </span>
            </div>
            
            <nav className="p-2 space-y-1">
              {RELEVAMIENTO_SECTIONS_FULL.map((sec, idx) => {
                const IconComp = ICON_MAP[sec.icon] || BarChart3;
                const isActive = idx === activeSectionIndex;
                const answeredCount = sec.questions ? sec.questions.filter(q => answers[q.id]).length : 0;
                const isComplete = sec.questions && sec.questions.length > 0 && answeredCount === sec.questions.length;
                const isInProgress = answeredCount > 0 && !isComplete;

                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSectionIndex(idx)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-all",
                      isActive 
                        ? "bg-red-600/15 text-red-600 dark:text-red-400 font-bold border border-red-500/40 shadow-sm" 
                        : isLight ? "hover:bg-slate-100 text-slate-800 font-semibold" : "hover:bg-slate-800/60 text-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComp className={cn("w-4 h-4 shrink-0", isActive ? "text-red-600 dark:text-red-400" : isLight ? "text-slate-500" : "text-slate-400")} />
                      <span className="truncate">{sec.code}. {sec.title}</span>
                    </div>

                    {isComplete && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40">
                        OK
                      </span>
                    )}
                    {isInProgress && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                        ...
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Section Body / Wizard / Print View */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          
          {viewMode === 'dds_print' ? (
            /* Vista Impresa DDS */
            <div className="bg-white text-slate-900 p-12 max-w-4xl mx-auto rounded-xl shadow-2xl border border-slate-200 font-serif">
              <div className="text-center py-12 border-b-4 border-red-600 mb-8">
                <div className="inline-block px-4 py-1.5 bg-red-600 text-white font-sans font-black text-sm rounded mb-4">UNIGIS TMS</div>
                <h1 className="text-3xl font-black font-sans text-slate-900 tracking-tight">Guía de Descubrimiento y Consultoría</h1>
                <h2 className="text-lg font-sans text-red-600 font-bold mt-2">DOCUMENTO DE DISEÑO DE SOLUCIÓN (DDS)</h2>
                <p className="text-xs font-sans text-slate-700 mt-4">PROYECTO: {activeProjectTitle}</p>
                <p className="text-xs font-sans text-slate-500">Fecha de Generación: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="space-y-8 font-sans">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b pb-2">Índice de Secciones Relevadas</h3>
                <ul className="grid grid-cols-2 gap-2 text-xs text-slate-800">
                  {RELEVAMIENTO_SECTIONS_FULL.map(s => (
                    <li key={s.id}><strong>Sección {s.code}:</strong> {s.title}</li>
                  ))}
                </ul>

                {RELEVAMIENTO_SECTIONS_FULL.map(sec => (
                  <div key={sec.id} className="pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 border-l-4 border-red-600 pl-3 mb-3">
                      {sec.code}. {sec.title}
                    </h4>
                    {sec.questions && sec.questions.length > 0 && (
                      <table className="w-full text-xs text-left border border-slate-200 mb-4">
                        <tbody>
                          {sec.questions.map(q => (
                            <tr key={q.id} className="border-b border-slate-100">
                              <td className="p-2.5 font-bold bg-slate-100 w-1/3 text-slate-900">{q.label}</td>
                              <td className="p-2.5 text-slate-900 font-medium">{answers[q.id] || 'No especificado'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Matriz Libre / Wizard Body */
            <div className="space-y-8 max-w-5xl">
              
              {/* Wizard Navigation Top Bar */}
              {viewMode === 'wizard' && (
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-xl border shadow-sm",
                  isLight ? "bg-white border-slate-300" : "bg-slate-900 border-slate-800"
                )}>
                  <button 
                    disabled={activeSectionIndex === 0}
                    onClick={() => setActiveSectionIndex(prev => Math.max(0, prev - 1))}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 disabled:opacity-40 text-xs font-bold rounded-lg transition-all",
                      isLight ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Sección Anterior
                  </button>

                  <span className={cn("text-xs font-bold", isLight ? "text-slate-700" : "text-slate-400")}>
                    Navega con <kbd className={cn("px-1.5 py-0.5 border rounded text-[10px]", isLight ? "bg-slate-100 border-slate-300 text-slate-800" : "bg-slate-800 border-slate-700 text-slate-200")}>Ctrl + Flecha</kbd>
                  </span>

                  <button 
                    disabled={activeSectionIndex === RELEVAMIENTO_SECTIONS_FULL.length - 1}
                    onClick={() => setActiveSectionIndex(prev => Math.min(RELEVAMIENTO_SECTIONS_FULL.length - 1, prev + 1))}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Siguiente Sección
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Section Header Card */}
              <div className={cn(
                "p-6 rounded-2xl border-l-4 border-l-red-600 border shadow-md relative overflow-hidden",
                isLight ? "bg-white border-slate-300" : "bg-slate-900 border-slate-800"
              )}>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-500">SECCIÓN {currentSection.code} DE 22</span>
                <h2 className={cn("text-2xl font-black tracking-tight mt-1", isLight ? "text-slate-900" : "text-white")}>
                  {currentSection.title}
                </h2>
                <p className={cn("text-xs mt-1 font-medium", isLight ? "text-slate-600" : "text-slate-400")}>
                  {currentSection.desc}
                </p>
              </div>

              {/* Questions Grid */}
              {currentSection.questions && currentSection.questions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentSection.questions.map(q => {
                    const currentVal = answers[q.id] || '';

                    return (
                      <div 
                        key={q.id} 
                        className={cn(
                          "p-4 rounded-xl border transition-all space-y-2.5",
                          isLight ? "bg-white border-slate-300 shadow-sm" : "bg-slate-900/80 border-slate-800"
                        )}
                      >
                        <label className={cn("text-xs font-bold block", isLight ? "text-slate-900" : "text-slate-200")}>
                          {q.label}
                        </label>

                        {q.type === 'chip' ? (
                          <div className="flex flex-wrap gap-2">
                            {q.options?.map(opt => {
                              const isSelected = currentVal === opt;

                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    setAnswers(prev => ({ ...prev, [q.id]: opt }));
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                    isSelected 
                                      ? "bg-red-600 text-white shadow-md" 
                                      : isLight ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                  )}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <input 
                            type={q.type || 'text'}
                            value={currentVal}
                            placeholder={q.placeholder || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAnswers(prev => ({ ...prev, [q.id]: val }));
                            }}
                            className={cn(
                              "w-full px-3 py-2 rounded-lg border text-xs font-semibold outline-none transition-all",
                              isLight ? "bg-slate-50 border-slate-300 focus:border-red-600 text-slate-900" : "bg-slate-950 border-slate-800 focus:border-red-600 text-slate-100"
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dynamic Tables (67 Tables) */}
              {currentSection.tables && currentSection.tables.length > 0 && (
                <div className="space-y-6">
                  {currentSection.tables.map(tbl => {
                    const currentRows = tablesData[tbl.id] || tbl.rows;

                    const handleCellChange = (rIdx: number, key: string, val: any) => {
                      const updated = [...currentRows];
                      updated[rIdx] = { ...updated[rIdx], [key]: val };
                      setTablesData(prev => ({ ...prev, [tbl.id]: updated }));
                    };

                    const handleAddRow = () => {
                      const newRow: Record<string, any> = {};
                      tbl.columns.forEach(c => {
                        newRow[c.key] = c.options ? c.options[0] : '';
                      });
                      setTablesData(prev => ({ ...prev, [tbl.id]: [...currentRows, newRow] }));
                    };

                    const handleDeleteRow = (rIdx: number) => {
                      const updated = currentRows.filter((_, idx) => idx !== rIdx);
                      setTablesData(prev => ({ ...prev, [tbl.id]: updated }));
                    };

                    return (
                      <div 
                        key={tbl.id} 
                        className={cn(
                          "p-5 rounded-2xl border shadow-sm space-y-4",
                          isLight ? "bg-white border-slate-300" : "bg-slate-900/80 border-slate-800"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className={cn("text-sm font-extrabold", isLight ? "text-slate-900" : "text-slate-100")}>{tbl.title}</h3>
                          <button 
                            onClick={handleAddRow}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                              isLight ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                            )}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Añadir Fila
                          </button>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className={cn(
                                "border-b text-[10px] font-black uppercase tracking-wider",
                                isLight ? "bg-slate-100 text-slate-800 border-slate-300" : "bg-slate-950/60 text-slate-400 border-slate-800"
                              )}>
                                {tbl.columns.map(c => (
                                  <th key={c.key} className="p-3">{c.label}</th>
                                ))}
                                <th className="p-3 text-center w-12">Acción</th>
                              </tr>
                            </thead>
                            <tbody className={cn("divide-y", isLight ? "divide-slate-200" : "divide-slate-800/40")}>
                              {currentRows.map((row, rIdx) => {
                                const isGapRow = row.cobertura === "No (Desarrollo)" || row.cobertura === "Parcial" || row.aplica === "No";

                                return (
                                  <tr 
                                    key={rIdx} 
                                    className={cn(
                                      "transition-colors",
                                      isGapRow ? "bg-red-500/10" : isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
                                    )}
                                  >
                                    {tbl.columns.map(col => {
                                      const cellVal = row[col.key] || '';

                                      if (col.type === 'readonly') {
                                        return (
                                          <td key={col.key} className={cn("p-3 font-bold", isLight ? "text-slate-900" : "text-slate-200")}>
                                            {cellVal}
                                          </td>
                                        );
                                      }

                                      if (col.type === 'chip') {
                                        return (
                                          <td key={col.key} className="p-3">
                                            <div className="flex flex-wrap gap-1.5">
                                              {col.options?.map(opt => {
                                                const isSel = cellVal === opt;

                                                return (
                                                  <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => handleCellChange(rIdx, col.key, opt)}
                                                    className={cn(
                                                      "px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                                                      isSel 
                                                        ? "bg-red-600 text-white shadow-sm" 
                                                        : isLight ? "bg-slate-200 text-slate-800 hover:bg-slate-300" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                                    )}
                                                  >
                                                    {opt}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </td>
                                        );
                                      }

                                      return (
                                        <td key={col.key} className="p-3">
                                          <input 
                                            type="text" 
                                            value={cellVal}
                                            onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                                            className={cn(
                                              "w-full px-2.5 py-1.5 rounded border text-xs font-semibold outline-none transition-all",
                                              isLight ? "bg-white border-slate-300 focus:border-red-600 text-slate-900" : "bg-slate-950 border-slate-800 focus:border-red-600 text-slate-200"
                                            )}
                                          />
                                        </td>
                                      );
                                    })}
                                    <td className="p-3 text-center">
                                      <button 
                                        onClick={() => handleDeleteRow(rIdx)}
                                        className="text-red-600 hover:text-red-500 p-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

        </main>
      </div>

    </div>
  );
}
