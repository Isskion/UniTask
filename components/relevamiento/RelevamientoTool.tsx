'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Users, 
  Target, 
  Truck, 
  Settings, 
  Smartphone, 
  BarChart3, 
  HardDrive,
  ChevronRight,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Save,
  MessageSquare,
  History,
  Info,
  X,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RELEVAMIENTO_SECTIONS, Section, Question } from '@/lib/relevamiento_schema';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface RelevamientoToolProps {
  projectId: string;
  projectName?: string;
}

const ICON_MAP: Record<string, any> = {
  Users,
  Target,
  Truck,
  Settings,
  ClipboardCheck,
  HardDrive,
  Smartphone,
  BarChart3
};

export default function RelevamientoTool({ projectId, projectName }: RelevamientoToolProps) {
  const { tenantId } = useAuth();
  const { t } = useLanguage();
  const [activeSectionId, setActiveSectionId] = useState(RELEVAMIENTO_SECTIONS[0].id);
  const [activeTabId, setActiveTabId] = useState(RELEVAMIENTO_SECTIONS[0].tabs[0].id);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sectionComments, setSectionComments] = useState<Record<string, any[]>>({});

  const activeSection = RELEVAMIENTO_SECTIONS.find(s => s.id === activeSectionId) || RELEVAMIENTO_SECTIONS[0];
  const activeTab = activeSection.tabs.find(t => t.id === activeTabId) || activeSection.tabs[0];

  // Load answers and comments from Firestore
  useEffect(() => {
    if (!projectId || !tenantId) return;

    const docRef = doc(db, 'projects', projectId, 'relevamiento', 'main');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAnswers(data.answers || {});
        setSectionComments(data.comments || {});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, tenantId]);

  const handleSave = async () => {
    if (!projectId || !tenantId) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'projects', projectId, 'relevamiento', 'main');
      await setDoc(docRef, {
        projectId,
        projectName,
        tenantId,
        answers,
        comments: sectionComments,
        updatedAt: new Date().toISOString(),
        progress: calculateProgress()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving relevamiento:", error);
    } finally {
      setSaving(false);
    }
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    const newComment = {
      id: Date.now().toString(),
      text: commentText,
      author: 'Consultor',
      date: new Date().toISOString()
    };
    setSectionComments(prev => ({
      ...prev,
      [activeSectionId]: [...(prev[activeSectionId] || []), newComment]
    }));
    setCommentText('');
  };

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateProgress = () => {
    const totalQuestions = RELEVAMIENTO_SECTIONS.reduce((acc, s) => acc + s.tabs.reduce((acc2, t) => acc2 + t.questions.length, 0), 0);
    const answeredQuestions = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  const getSectionProgress = (sectionId: string) => {
    const section = RELEVAMIENTO_SECTIONS.find(s => s.id === sectionId);
    if (!section) return 0;
    const questions = section.tabs.flatMap(t => t.questions);
    const answered = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length;
    return Math.round((answered / questions.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden rounded-xl border border-border shadow-2xl">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col">
        <div className="p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <ClipboardCheck className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-tight">{t('nav.relevamiento')}</h2>
          </div>
          <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest truncate">{projectName || 'Proyecto'}</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {RELEVAMIENTO_SECTIONS.map((section) => {
            const Icon = ICON_MAP[section.icon] || Info;
            const progress = getSectionProgress(section.id);
            const isActive = activeSectionId === section.id;

            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSectionId(section.id);
                  setActiveTabId(section.tabs[0].id);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                )}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <Icon className={cn("w-4 h-4 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="text-[11px] font-bold tracking-tight text-left">{section.title.split('. ')[1] || section.title}</span>
                </div>
                <div className="flex flex-col items-end gap-1 relative z-10">
                  {progress === 100 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <span className={cn("text-[9px] font-black", isActive ? "text-primary" : "text-muted-foreground/50")}>{progress}%</span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Global Progress */}
        <div className="p-5 border-t border-border bg-muted/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Avance Global</span>
            <span className="text-[10px] font-black text-primary">{calculateProgress()}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden border border-border">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-1000" 
              style={{ width: `${calculateProgress()}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        <header className="h-14 flex-shrink-0 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4 text-xs min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-muted-foreground font-medium">{t('nav.relevamiento')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30" />
              <span className="font-bold tracking-tight truncate">{activeSection.title}</span>
            </div>
            
            <div className="h-4 w-px bg-border flex-shrink-0" />
            
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border overflow-x-auto no-scrollbar">
              {activeSection.tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                    activeTabId === tab.id 
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => setShowComments(!showComments)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all",
                showComments ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {sectionComments[activeSectionId]?.length || 0}
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-[9px] font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
            >
              {saving ? <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? '...' : t('common.save')}
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTab.questions.map((q) => (
                  <div key={q.id} className="group space-y-2 p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                        {q.text}
                      </label>
                      {answers[q.id] && <CheckCircle2 className="w-3 h-3 text-emerald-500 animate-in zoom-in" />}
                    </div>
                    
                    {q.type === 'textarea' ? (
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => updateAnswer(q.id, e.target.value)}
                        placeholder={q.placeholder}
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-28 text-foreground placeholder:text-muted-foreground/30 resize-none"
                      />
                    ) : q.type === 'select' ? (
                      <select
                        value={answers[q.id] || ''}
                        onChange={(e) => updateAnswer(q.id, e.target.value)}
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                      >
                        <option value="">Seleccionar...</option>
                        {q.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : q.type === 'boolean' ? (
                      <div className="flex gap-2">
                        {['Si', 'No'].map(val => (
                          <button
                            key={val}
                            onClick={() => updateAnswer(q.id, val === 'Si')}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                              (answers[q.id] === (val === 'Si'))
                                ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                                : "bg-background border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type={q.type === 'number' ? 'number' : 'text'}
                        value={answers[q.id] || ''}
                        onChange={(e) => updateAnswer(q.id, e.target.value)}
                        placeholder={q.placeholder}
                        className="w-full bg-background border border-border rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/30"
                      />
                    )}
                    {q.helpText && <p className="text-[9px] text-muted-foreground/60 italic px-1">{q.helpText}</p>}
                  </div>
                ))}
              </div>
              
              {/* Footer info */}
              <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-muted-foreground/60">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Revisión local: OK</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Estado: Borrador</span>
                  </div>
                </div>
                <p className="text-[9px] font-medium italic">{t('common.under_construction')} Senior Review Logic</p>
              </div>
            </div>
          </main>

          {/* Comments Sidebar */}
          {showComments && (
            <div className="w-72 border-l border-border bg-card flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comentarios</h3>
                <button onClick={() => setShowComments(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {sectionComments[activeSectionId]?.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 text-center space-y-2">
                    <MessageSquare className="w-6 h-6" />
                    <p className="text-[9px] font-black uppercase tracking-widest">Sin comentarios</p>
                  </div>
                ) : (
                  sectionComments[activeSectionId]?.map((comment: any) => (
                    <div key={comment.id} className="p-3 rounded-xl bg-background border border-border space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">{comment.author}</span>
                        <span className="text-[8px] text-muted-foreground/50">{new Date(comment.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-foreground leading-relaxed">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-border bg-muted/20">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Nota interna..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-20 text-foreground placeholder:text-muted-foreground/30 resize-none mb-2"
                />
                <button 
                  onClick={addComment}
                  className="w-full py-2 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm"
                >
                  Enviar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
