"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
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

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setIsSearching(false);
            return;
        }
        
        // Evitar que busque en el formulario cada vez que se teclea una letra (evita robar el foco)
        if (scope === "form") {
            return;
        }

        const timer = setTimeout(() => {
            setIsSearching(true);
            
            // Logic for folder or global search
            const q = query.toLowerCase();
            const newResults: {note: UniLeakNote, snippets: string[]}[] = [];

            for (const n of notesToSearch) {
                if (scope === "folder" && typeof contextId === "string" && n.folderId !== contextId) continue;
                
                const titleMatch = (n.title || "").toLowerCase().includes(q);
                const plainContent = (n.content || "").replace(/<[^>]+>/g, ' ');
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
                        idx = lowerText.indexOf(q, idx + q.length);
                    }
                    
                    if (snippets.length === 0 && titleMatch) {
                        snippets.push("Coincidencia en el título...");
                    }
                    newResults.push({ note: n, snippets });
                }
            }

            setResults(newResults.slice(0, 15)); // Max 15 results for UI performance
            setIsSearching(false);
        }, 200);

        return () => clearTimeout(timer);
    }, [query, scope, contextId, notesToSearch]);

    // Cerrar al clickear afuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        } else {
            setQuery("");
        }
    }, [isOpen]);

    let placeholder = "Buscar...";
    if (scope === "global") placeholder = "Buscar en Base de Conocimiento...";
    if (scope === "folder") placeholder = "Buscar en esta carpeta...";
    if (scope === "form") placeholder = "Buscar en este documento...";

    return (
        <div ref={containerRef} className={cn("relative flex items-center", className)} onClick={(e) => e.stopPropagation()}>
            {!isOpen ? (
                <button
                    onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                    className={cn(
                        "p-1 hover:bg-muted text-muted-foreground hover:text-primary rounded transition-colors flex items-center justify-center",
                        scope === "form" && "p-2 border border-border bg-background shadow-sm hover:bg-muted"
                    )}
                    title={placeholder}
                >
                    <Search className={scope === "form" ? "w-4 h-4" : "w-3.5 h-3.5"} />
                </button>
            ) : (
                <div className={cn(
                    "flex items-center bg-background border border-primary/50 shadow-sm rounded overflow-hidden animate-in fade-in slide-in-from-right-2",
                    scope === "form" ? "w-64 h-8" : "absolute right-0 z-50 min-w-[200px] h-7 -mt-[2px]"
                )}>
                    <div className="pl-2 flex items-center justify-center text-muted-foreground shrink-0">
                        {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && scope === "form" && query.trim()) {
                                e.preventDefault();
                                if (typeof window !== "undefined" && (window as any).find) {
                                    (window as any).find(query, false, false, true, false, false, false);
                                    // Ya no devolvemos el foco al input. Al dejar el foco en el editor, el navegador
                                    // mantiene vivo el color de "selección" azul/primario sobre la palabra encontrada.
                                }
                            }
                        }}
                        placeholder={placeholder + (scope === "form" ? " (Enter p/ buscar)" : "")}
                        className="w-full bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground px-2 py-1 outline-none h-full"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-3 h-3" />
                    </button>
                    
                    {/* Resultados interactivos */}
                    {isOpen && query.trim() && !isSearching && scope !== "form" && (
                        <div className="absolute top-full right-0 mt-1 bg-popover border border-border shadow-2xl rounded-lg max-h-96 overflow-y-auto z-50 flex flex-col w-[300px] sm:w-[360px] origin-top-right">
                            {results.length === 0 ? (
                                <div className="p-3 text-center text-xs text-muted-foreground">
                                    No se encontraron notas
                                </div>
                            ) : (
                                results.map((r, idx) => (
                                    <div key={`${r.note.id}-${idx}`} className="border-b border-border/40 last:border-0 flex flex-col">
                                        <div className="px-3 py-1.5 text-xs font-semibold text-foreground bg-muted/30 truncate border-b border-border/20 flex items-center gap-2 sticky top-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0"></span> {r.note.title || "Nota sin título"}
                                        </div>
                                        {r.snippets.map((snip, sIdx) => (
                                            <button 
                                                key={sIdx}
                                                className="text-left px-4 py-2 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground cursor-pointer transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onResultClick) onResultClick(r.note);
                                                    setIsOpen(false);
                                                    // Emit event for the editor to highlight text
                                                    window.dispatchEvent(new CustomEvent('unileaks-focus-search', { detail: query }));
                                                }}
                                            >
                                                {/* Hilight Match logic inline */}
                                                {(() => {
                                                    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
