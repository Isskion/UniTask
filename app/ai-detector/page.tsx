'use client';

import React, { useState } from 'react';
import { 
    Sparkles, 
    ShieldAlert, 
    CheckCircle, 
    ArrowRight, 
    Copy, 
    Download, 
    Cpu, 
    User, 
    RefreshCw, 
    Lightbulb, 
    FileText,
    AlertTriangle,
    Eye,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import { analyzeTextForAI, humanizeText } from './actions';
import { useAuth } from '@/context/AuthContext';
import { getRoleLevel, RoleLevel } from '@/types';

interface AIHighlight {
    sentence: string;
    score: number;
    reason: string;
}

interface AnalysisResult {
    score: number;
    summary: string;
    highlights: AIHighlight[];
    cliches: string[];
    tips: string[];
}

export default function AIDetectorPage() {
    const { user, userRole, loading } = useAuth();
    const [inputText, setInputText] = useState('');
    const [tone, setTone] = useState<'technical' | 'conversational' | 'corporate'>('technical');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isHumanizing, setIsHumanizing] = useState(false);
    
    // Original Analysis
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    
    // Humanized Text & its Analysis
    const [humanizedText, setHumanizedText] = useState('');
    const [humanizedAnalysis, setHumanizedAnalysis] = useState<AnalysisResult | null>(null);
    
    const [activeTab, setActiveTab] = useState<'detector' | 'comparador'>('detector');
    const [copySuccess, setCopySuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
            </div>
        );
    }

    if (!user || getRoleLevel(userRole) < RoleLevel.ADMIN) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-6 space-y-6 relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-950/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500">
                    <ShieldAlert className="h-12 w-12" />
                </div>
                <div className="space-y-2 max-w-sm">
                    <h1 className="text-xl font-bold text-zinc-100">Acceso Denegado</h1>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                        Esta herramienta está restringida únicamente a administradores del sistema. Contacta con soporte si consideras que deberías tener acceso.
                    </p>
                </div>
                <a 
                    href="/" 
                    className="flex items-center space-x-2 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 h-10 rounded-xl transition-all"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Volver a UniTask</span>
                </a>
            </div>
        );
    }


    // Analiza el texto original
    const handleAnalyze = async () => {
        if (!inputText.trim()) {
            setErrorMessage('Por favor, introduce algún texto para analizar.');
            return;
        }
        setErrorMessage('');
        setIsAnalyzing(true);
        setAnalysis(null);
        setHumanizedText('');
        setHumanizedAnalysis(null);
        
        try {
            const res = await analyzeTextForAI(inputText);
            if (res.success && res.result) {
                setAnalysis(res.result);
            } else {
                setErrorMessage(res.error || 'Error al analizar el texto.');
            }
        } catch (e: any) {
            setErrorMessage(e.message || 'Error de conexión.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Humaniza el texto y automáticamente analiza la versión humanizada
    const handleHumanize = async () => {
        if (!inputText.trim()) {
            setErrorMessage('Por favor, introduce algún texto para humanizar.');
            return;
        }
        setErrorMessage('');
        setIsHumanizing(true);
        setHumanizedText('');
        setHumanizedAnalysis(null);
        
        try {
            // 1. Humanizar el texto
            const res = await humanizeText(inputText, tone);
            if (res.success && res.humanizedText) {
                const textResult = res.humanizedText.trim();
                setHumanizedText(textResult);
                setActiveTab('comparador');

                // 2. Analizar el texto humanizado inmediatamente para ver la mejora
                const analysisRes = await analyzeTextForAI(textResult);
                if (analysisRes.success && analysisRes.result) {
                    setHumanizedAnalysis(analysisRes.result);
                }
            } else {
                setErrorMessage(res.error || 'Error al humanizar el texto.');
            }
        } catch (e: any) {
            setErrorMessage(e.message || 'Error de conexión.');
        } finally {
            setIsHumanizing(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleDownload = (text: string, filename: string) => {
        const element = document.createElement("a");
        const file = new Blob([text], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const getScoreColor = (score: number) => {
        if (score < 25) return 'text-emerald-500 stroke-emerald-500';
        if (score < 60) return 'text-amber-500 stroke-amber-500';
        return 'text-rose-500 stroke-rose-500';
    };

    const getScoreBg = (score: number) => {
        if (score < 25) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        if (score < 60) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    };

    const renderHighlightedText = (text: string, highlights: AIHighlight[]) => {
        if (!highlights || highlights.length === 0) return <p className="whitespace-pre-wrap leading-relaxed text-zinc-300">{text}</p>;

        // Split text into lines/paragraphs first to maintain formatting
        const paragraphs = text.split('\n');
        
        return (
            <div className="space-y-4 leading-relaxed text-zinc-300">
                {paragraphs.map((pText, pIdx) => {
                    if (!pText.trim()) return <div key={pIdx} className="h-4" />;
                    
                    // Simple sentence matching in paragraph
                    let content: React.ReactNode[] = [pText];
                    
                    highlights.forEach((h, hIdx) => {
                        const sentenceToFind = h.sentence.trim();
                        if (!sentenceToFind) return;
                        
                        const newContent: React.ReactNode[] = [];
                        content.forEach((segment) => {
                            if (typeof segment !== 'string') {
                                newContent.push(segment);
                                return;
                            }
                            
                            const index = segment.toLowerCase().indexOf(sentenceToFind.toLowerCase());
                            if (index !== -1) {
                                const before = segment.substring(0, index);
                                const match = segment.substring(index, index + sentenceToFind.length);
                                const after = segment.substring(index + sentenceToFind.length);
                                
                                if (before) newContent.push(before);
                                newContent.push(
                                    <span 
                                        key={`${hIdx}-${index}`} 
                                        className="relative group bg-rose-500/15 border-b border-rose-500/40 hover:bg-rose-500/25 transition-colors cursor-help px-0.5 rounded-sm"
                                    >
                                        {match}
                                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-zinc-950 border border-zinc-800 text-rose-300 text-xs rounded-lg p-2.5 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 leading-normal font-sans">
                                            <span className="font-semibold text-rose-400 block mb-1">Detección de IA ({h.score}%):</span>
                                            {h.reason}
                                        </span>
                                    </span>
                                );
                                if (after) newContent.push(after);
                            } else {
                                newContent.push(segment);
                            }
                        });
                        content = newContent;
                    });
                    
                    return <p key={pIdx} className="whitespace-pre-wrap">{content}</p>;
                })}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased overflow-x-hidden">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Header Navigation */}
            <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <Sparkles className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                                UniHumanize
                            </h1>
                            <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Detector & Humanizador de Agentes</p>
                        </div>
                    </div>
                    
                    <a 
                        href="/" 
                        className="flex items-center space-x-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 px-3 h-9 rounded-lg"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Volver a UniTask</span>
                    </a>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
                
                {/* Intro Hero banner */}
                <div className="mb-8 p-6 bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-zinc-950 border border-zinc-900 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
                            <Cpu className="h-3.5 w-3.5" />
                            <span>Supervisión e Inspección Extrema</span>
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-100">
                            Evade la detección de IA en tus Agentes
                        </h2>
                        <p className="text-sm text-zinc-400">
                            Analiza los reportes, resúmenes y documentos técnicos generados por tus subagentes. Identifica las palabras repetitivas y clichés, y reescribe con voz humana real para que los clientes validen el alcance sin notar trazas automatizadas.
                        </p>
                    </div>
                    
                    {/* Tabs switcher */}
                    <div className="flex bg-zinc-950 p-1 border border-zinc-800 rounded-xl self-stretch md:self-auto">
                        <button
                            onClick={() => setActiveTab('detector')}
                            className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                                activeTab === 'detector' 
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <Cpu className="h-3.5 w-3.5" />
                            <span>Detector de IA</span>
                        </button>
                        <button
                            onClick={() => {
                                if (humanizedText) setActiveTab('comparador');
                            }}
                            disabled={!humanizedText}
                            className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                                !humanizedText ? 'opacity-40 cursor-not-allowed' : ''
                            } ${
                                activeTab === 'comparador' 
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Comparador Humanizado</span>
                        </button>
                    </div>
                </div>

                {errorMessage && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center space-x-3 text-rose-400 text-sm">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Main Content Areas based on Active Tab */}
                {activeTab === 'detector' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Side: Input area */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-900 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-zinc-300 flex items-center space-x-2">
                                        <FileText className="h-4 w-4 text-purple-400" />
                                        <span>Texto o documento a evaluar</span>
                                    </label>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                        {inputText.length} caracteres
                                    </span>
                                </div>

                                <textarea
                                    className="w-full h-80 bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all font-mono leading-relaxed"
                                    placeholder="Pega el informe de tu agente, las transiciones de estado o cualquier documento aquí..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                />

                                {/* Control Bar */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                                    {/* Tone Selector */}
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-zinc-500 font-semibold">Tono:</span>
                                        <div className="flex bg-zinc-950 p-0.5 border border-zinc-800 rounded-lg">
                                            <button 
                                                onClick={() => setTone('technical')}
                                                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                                                    tone === 'technical' ? 'bg-zinc-850 text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
                                                }`}
                                            >
                                                Técnico
                                            </button>
                                            <button 
                                                onClick={() => setTone('conversational')}
                                                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                                                    tone === 'conversational' ? 'bg-zinc-850 text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
                                                }`}
                                            >
                                                Conversar
                                            </button>
                                            <button 
                                                onClick={() => setTone('corporate')}
                                                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                                                    tone === 'corporate' ? 'bg-zinc-850 text-purple-400' : 'text-zinc-400 hover:text-zinc-200'
                                                }`}
                                            >
                                                Corporativo
                                            </button>
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={handleAnalyze}
                                            disabled={isAnalyzing || isHumanizing || !inputText.trim()}
                                            className="flex-1 sm:flex-none px-4 h-10 bg-zinc-900 border border-zinc-800 hover:bg-zinc-855 hover:border-zinc-700 disabled:opacity-40 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 text-zinc-200"
                                        >
                                            {isAnalyzing ? (
                                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />
                                            ) : (
                                                <Cpu className="h-3.5 w-3.5" />
                                            )}
                                            <span>Analizar</span>
                                        </button>

                                        <button
                                            onClick={handleHumanize}
                                            disabled={isAnalyzing || isHumanizing || !inputText.trim()}
                                            className="flex-1 sm:flex-none px-5 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20 disabled:opacity-40 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                                        >
                                            {isHumanizing ? (
                                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="h-3.5 w-3.5" />
                                            )}
                                            <span>Humanizar Texto</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Cliches / AI Hallmark words card */}
                            {analysis && (
                                <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-900 rounded-2xl p-6 space-y-4">
                                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center space-x-2">
                                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                                        <span>Clichés de IA Detectados</span>
                                    </h3>
                                    <p className="text-xs text-zinc-500">
                                        Estas palabras y expresiones gatillan de forma inmediata los detectores por ser sobreutilizadas por modelos LLM.
                                    </p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {analysis.cliches.length > 0 ? (
                                            analysis.cliches.map((w, idx) => (
                                                <span 
                                                    key={idx} 
                                                    className="px-2.5 py-1 text-xs font-mono bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg"
                                                >
                                                    {w}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-zinc-600 italic">No se detectaron clichés clásicos de IA. ¡Buen ritmo!</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Analysis and results */}
                        <div className="lg:col-span-5 space-y-6">
                            {analysis ? (
                                <>
                                    {/* Score Card */}
                                    <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
                                        {/* Score Color Glow */}
                                        <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-[40px] opacity-20 ${
                                            analysis.score < 25 ? 'bg-emerald-500' : analysis.score < 60 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`} />

                                        {/* Radial Gauge */}
                                        <div className="relative h-32 w-32 flex items-center justify-center">
                                            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <path
                                                    className="text-zinc-800"
                                                    strokeWidth="2.5"
                                                    stroke="currentColor"
                                                    fill="none"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                                <path
                                                    className={`${getScoreColor(analysis.score)} transition-all duration-1000 ease-out`}
                                                    strokeWidth="2.8"
                                                    strokeDasharray={`${analysis.score}, 100`}
                                                    strokeLinecap="round"
                                                    stroke="currentColor"
                                                    fill="none"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                            </svg>
                                            <div className="text-center">
                                                <span className="text-3xl font-extrabold font-mono tracking-tighter text-zinc-100">{analysis.score}%</span>
                                                <span className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mt-0.5">Score de IA</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 max-w-sm">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getScoreBg(analysis.score)}`}>
                                                {analysis.score < 25 ? (
                                                    <>
                                                        <CheckCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                        <span>Altamente Humano</span>
                                                    </>
                                                ) : analysis.score < 60 ? (
                                                    <>
                                                        <AlertTriangle className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                        <span>Sospecha de IA</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldAlert className="h-3.5 w-3.5 mr-1 shrink-0" />
                                                        <span>100% IA Detectada</span>
                                                    </>
                                                )}
                                            </span>
                                            <p className="text-xs text-zinc-400 px-2 leading-relaxed">
                                                {analysis.summary}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Highlights Editor Visualizer */}
                                    <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-900 rounded-2xl p-6 space-y-3">
                                        <h3 className="text-sm font-semibold text-zinc-300 flex items-center space-x-2">
                                            <Eye className="h-4.5 w-4.5 text-purple-400" />
                                            <span>Visualizador de Oraciones Resaltadas</span>
                                        </h3>
                                        <p className="text-xs text-zinc-500">
                                            Pasa el ratón (o pulsa) sobre los fragmentos resaltados en rojo para ver el diagnóstico técnico de la supervisión.
                                        </p>
                                        <div className="bg-zinc-950/65 border border-zinc-800 rounded-xl p-4 max-h-64 overflow-y-auto text-sm font-sans">
                                            {renderHighlightedText(inputText, analysis.highlights)}
                                        </div>
                                    </div>

                                    {/* Extreme Inspector Tips */}
                                    <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-900 rounded-2xl p-6 space-y-4">
                                        <h3 className="text-sm font-semibold text-zinc-300 flex items-center space-x-2">
                                            <Lightbulb className="h-4.5 w-4.5 text-purple-400" />
                                            <span>Tips del Inspector para Humanizar</span>
                                        </h3>
                                        <div className="space-y-3">
                                            {analysis.tips.map((tip, idx) => (
                                                <div key={idx} className="flex items-start space-x-2.5 text-xs text-zinc-400 leading-relaxed">
                                                    <ChevronRight className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                                                    <span>{tip}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full bg-zinc-900/20 border border-zinc-900 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 text-zinc-500 py-24">
                                    <div className="p-3 bg-zinc-900 rounded-full border border-zinc-800">
                                        <Cpu className="h-8 w-8 text-zinc-650" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-zinc-400">Sin análisis activo</p>
                                        <p className="text-xs text-zinc-600 max-w-xs">
                                            Introduce un texto y haz clic en "Analizar" o "Humanizar Texto" para ejecutar la supervisión.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* COMPARADOR TAB */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Side: Original Text with Highlights */}
                        <div className="space-y-6">
                            <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-900 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Cpu className="h-4.5 w-4.5 text-rose-400" />
                                        <h3 className="text-sm font-semibold text-zinc-300">Texto Original</h3>
                                    </div>
                                    {analysis && (
                                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${getScoreBg(analysis.score)}`}>
                                            IA: {analysis.score}%
                                        </span>
                                    )}
                                </div>
                                <div className="bg-zinc-950/60 border border-zinc-850 rounded-xl p-4 h-96 overflow-y-auto text-sm leading-relaxed text-zinc-400">
                                    {analysis ? renderHighlightedText(inputText, analysis.highlights) : <p className="whitespace-pre-wrap">{inputText}</p>}
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => handleCopy(inputText)}
                                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center space-x-1"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        <span>Copiar Original</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Humanized Text with its Analysis */}
                        <div className="space-y-6">
                            <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-900 rounded-2xl p-6 space-y-4 relative overflow-hidden">
                                {/* Success glow */}
                                <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                                        <h3 className="text-sm font-semibold text-zinc-100">Texto Humanizado</h3>
                                    </div>
                                    {humanizedAnalysis ? (
                                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border ${getScoreBg(humanizedAnalysis.score)}`}>
                                            IA: {humanizedAnalysis.score}%
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-zinc-500 animate-pulse flex items-center space-x-1">
                                            <RefreshCw className="h-3 w-3 animate-spin text-purple-400" />
                                            <span>Analizando mejora...</span>
                                        </span>
                                    )}
                                </div>

                                <div className="bg-zinc-950/60 border border-zinc-850 rounded-xl p-4 h-96 overflow-y-auto text-sm leading-relaxed text-zinc-200">
                                    {humanizedAnalysis ? renderHighlightedText(humanizedText, humanizedAnalysis.highlights) : <p className="whitespace-pre-wrap">{humanizedText}</p>}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <div className="text-[11px] text-zinc-500 font-semibold flex items-center space-x-1">
                                        <User className="h-3.5 w-3.5 text-emerald-400" />
                                        <span>Tono reescrito: <span className="text-zinc-400 capitalize">{tone}</span></span>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3">
                                        <button 
                                            onClick={() => handleDownload(humanizedText, "documento_humanizado.txt")}
                                            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center space-x-1 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            <span>Descargar</span>
                                        </button>
                                        <button 
                                            onClick={() => handleCopy(humanizedText)}
                                            className="text-xs text-zinc-100 hover:text-white transition-colors flex items-center space-x-1 bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg shadow-lg shadow-purple-500/10"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            <span>{copySuccess ? '¡Copiado!' : 'Copiar Texto'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
