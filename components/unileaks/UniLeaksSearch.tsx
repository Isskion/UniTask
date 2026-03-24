"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { UniLeakNote } from "@/types";

interface UniLeaksSearchProps {
    scope: "global" | "folder" | "form";
    contextId?: string | null; // null for global, folderId for folder, noteId for form
    notesToSearch?: UniLeakNote[]; // Array of notes to filter from (for folder/global)
    onResultClick?: (note: UniLeakNote) => void;
    className?: string;
}

export default function UniLeaksSearch({ scope, contextId, notesToSearch = [], onResultClick, className }: UniLeaksSearchProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<{note: UniLeakNote, snippets: string[]}[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Escape regex helpers
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    useEffect(() => {
        if (!isOpen) {
            setQuery("");
            setResults([]);
            return;
        }

        if (!query.trim()) {
            setResults([]);
            setIsSearching(false);
            return;
        }
        
        // Evitar busqueda continua en el form
        if (scope === "form") {
            return;
        }

        const timer = setTimeout(() => {
            setIsSearching(true);
            
            const q = query.toLowerCase();
            const newResults: {note: UniLeakNote, snippets: string[]}[] = [];

            for (const n of notesToSearch) {
                if (scope === "folder" && typeof contextId === "string" && n.folderId !== contextId) continue;
                
                const titleMatch = (n.title || "").toLowerCase().includes(q);
                // Si la nota no tiene contenido por alguna razón, usamos string vacío
                const safeContent = n.content || "";
                const plainContent = safeContent.replace(/<[^>]+>/g, ' ');
                const contentMatch = plainContent.toLowerCase().includes(q);
                
                if (titleMatch || contentMatch) {
                    let snippets: string[] = [];
                    let lowerText = plainContent.toLowerCase();
                    let idx = lowerText.indexOf(q);
                    let lastIdx = -1;
                    
                    while (idx !== -1 && snippets.length < 4) {
                        if (lastIdx === -1 || idx > lastIdx + 50) {
                            const s = Math.max(0, idx - 50);
                            const e = Math.min(plainContent.length, idx + q.length + 50);
                            snippets.push(
                                (s > 0 ? "..." : "") + plainContent.substring(s, e).trim() + (e < plainContent.length ? "..." : "")
                            );
                            lastIdx = idx;
                        }
                        // Evitar loop infinito si q es vacío (aunque ya validamos trim arriba)
                        if (q.length === 0) break;
                        idx = lowerText.indexOf(q, idx + q.length);
                    }
                    
                    if (snippets.length === 0 && titleMatch) {
                        snippets.push("Coincidencia en el título...");
                    }
                    newResults.push({ note: n, snippets });
                }
            }

            setResults(newResults.slice(0, 20)); // Max 20 results in modal
            setIsSearching(false);
        }, 200);

        return () => clearTimeout(timer);
    }, [query, scope, contextId, notesToSearch, isOpen]);

    // Cerrar con Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    // Cerrar form search al clickear fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (scope === "form" && isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, scope]);

    // Auto focus
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    let placeholder = "Buscar...";
    if (scope === "global") placeholder = "Buscar en toda la Base de Conocimiento...";
    if (scope === "folder") placeholder = "Buscar en esta carpeta...";
    if (scope === "form") placeholder = "Escribe y pulsa Enter para buscar...";

    // Render del botón disparador ("Lupa")
    if (!isOpen) {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                className={cn(
                    "p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded transition-colors flex items-center justify-center",
                    scope === "form" && "p-2 border border-border bg-background shadow-sm hover:bg-muted",
                    className
                )}
                title={placeholder}
            >
                <Search className={scope === "form" ? "w-4 h-4" : "w-3.5 h-3.5"} />
            </button>
        );
    }

    // Modal Style: Formulario (Pequeño, inline)
    if (scope === "form") {
        return (
            <div ref={containerRef} className={cn("flex items-center bg-background border border-primary/50 shadow-sm rounded overflow-hidden animate-in fade-in slide-in-from-right-2 h-8 w-64", className)} onClick={(e) => e.stopPropagation()}>
                <div className="pl-2 flex items-center justify-center text-muted-foreground shrink-0">
                    <Search className="w-4 h-4" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && query.trim()) {
                            e.preventDefault();
                            if (typeof window !== "undefined" && (window as any).find) {
                                (window as any).find(query, false, false, true, false, false, false);
                            }
                        }
                    }}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground px-2 py-1 outline-none h-full"
                />
                <button
                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                    className="p-1.5 text-muted-foreground hover:text-foreground shrink-0"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    // Modal Style: Global y Carpetas (Obsidian/Notion CMD+K palette gigante en el centro de la pantalla)
    return (
        <div 
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        >
            <div 
                className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 mx-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Cabecera del Buscador */}
                <div className="flex items-center border-b border-border/50 px-4 py-3 bg-muted/30">
                    {isSearching ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mr-3 shrink-0" /> : <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-transparent border-none text-base md:text-lg text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Área de Resultados */}
                {query.trim().length > 0 && (
                    <div className="max-h-[60vh] overflow-y-auto w-full pb-2">
                        {results.length === 0 && !isSearching ? (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                <FileText className="w-10 h-10 mb-3 opacity-20" />
                                <p>No se encontraron resultados para "{query}"</p>
                            </div>
                        ) : (
                            results.map((r, idx) => (
                                <div key={`${r.note.id}-${idx}`} className="flex flex-col border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors group">
                                    <button 
                                        className="px-4 py-2 flex items-center text-left text-sm font-semibold text-foreground bg-muted/20"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onResultClick) onResultClick(r.note);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <FileText className="w-4 h-4 mr-2 text-primary/70" />
                                        <span>{r.note.title || "Nota sin título"}</span>
                                    </button>
                                    
                                    <div className="flex flex-col py-1">
                                        {r.snippets.map((snip, sIdx) => (
                                            <button 
                                                key={sIdx}
                                                className="text-left px-10 py-1.5 text-[13px] text-muted-foreground cursor-pointer transition-colors hover:bg-primary/5 hover:text-foreground"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onResultClick) onResultClick(r.note);
                                                    setIsOpen(false);
                                                    // Disparar evento global para auto-scroll y resaltado
                                                    window.dispatchEvent(new CustomEvent('unileaks-focus-search', { detail: query }));
                                                }}
                                            >
                                                {/* Resaltador In-line escapado */}
                                                {(() => {
                                                    const escapedQuery = escapeRegExp(query);
                                                    const parts = snip.split(new RegExp(`(${escapedQuery})`, 'gi'));
                                                    return (
                                                        <span className="break-words line-clamp-2 leading-relaxed">
                                                            {parts.map((part, i) => 
                                                                part.toLowerCase() === query.toLowerCase() 
                                                                    ? <span key={i} className="bg-primary/20 text-primary font-bold rounded-sm px-0.5">{part}</span> 
                                                                    : <span key={i}>{part}</span>
                                                            )}
                                                        </span>
                                                    );
                                                })()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
