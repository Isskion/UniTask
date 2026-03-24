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
    const [results, setResults] = useState<UniLeakNote[]>([]);
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
            const filtered = notesToSearch.filter(n => {
                // If folder scope, must match folderId
                if (scope === "folder" && typeof contextId === "string" && n.folderId !== contextId) {
                    return false;
                }
                
                // Match title or content
                const titleMatch = (n.title || "").toLowerCase().includes(q);
                // Strip HTML tags roughly for content search
                const plainContent = (n.content || "").replace(/<[^>]+>/g, '').toLowerCase();
                const contentMatch = plainContent.includes(q);
                
                return titleMatch || contentMatch;
            });

            setResults(filtered.slice(0, 10)); // Max 10 results for UI performance
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
                                    // Devolver el foco al input para que no se sobreescriba el documento si el usuario sigue tecleando
                                    setTimeout(() => inputRef.current?.focus(), 10);
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
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border shadow-lg rounded-lg max-h-64 overflow-y-auto z-50 flex flex-col">
                            {results.length === 0 ? (
                                <div className="p-3 text-center text-xs text-muted-foreground">
                                    No se encontraron notas
                                </div>
                            ) : (
                                results.map((r, idx) => (
                                    <button 
                                        key={`${r.id}-${idx}`}
                                        className="text-left px-3 py-2 text-xs hover:bg-muted border-b border-border/50 last:border-0 truncate"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onResultClick) onResultClick(r);
                                            setIsOpen(false);
                                            setQuery("");
                                        }}
                                    >
                                        <span className="font-medium text-primary">{r.title || "Nota sin título"}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
