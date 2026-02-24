"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { BookMarked, X, Check, Wand2 } from "lucide-react";

import { spellCheckerService } from "@/lib/spellchecker";

interface SpellSuggestion {
    word: string;
    suggestions: string[];
    position: { x: number; y: number };
    range: { from: number; to: number } | null;
}

interface SpellCheckPopoverProps {
    editor: Editor | null;
    tenantId: string | null;
    userId: string | null;
    language: string;
    verifiedWords: string[];
    onAddToDictionary: (word: string) => Promise<void>;
}

/**
 * SpellCheckPopover component.
 * 
 * Listens for clicks/hovers on native spell-error underlines in the editor
 * and shows a popover with:
 * - "Añadir al diccionario" button
 * - Suggestions if available (via nspell offline dictionary)
 */
export default function SpellCheckPopover({
    editor,
    tenantId,
    userId,
    language,
    verifiedWords,
    onAddToDictionary,
}: SpellCheckPopoverProps) {
    const [popover, setPopover] = useState<SpellSuggestion | null>(null);
    const [loading, setLoading] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Close popover on outside click
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setPopover(null);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    /**
     * Finds the misspelled word at a given DOM point by inspecting the
     * browser's native spell-check markup.
     */
    const getWordAtPoint = useCallback((x: number, y: number): {
        word: string;
        range: { from: number; to: number } | null;
    } | null => {
        if (!editor) return null;

        // Use document.caretPositionFromPoint or caretRangeFromPoint
        let domNode: Node | null = null;
        let domOffset = 0;

        if ((document as any).caretPositionFromPoint) {
            const pos = (document as any).caretPositionFromPoint(x, y);
            if (pos) { domNode = pos.offsetNode; domOffset = pos.offset; }
        } else if (document.caretRangeFromPoint) {
            const r = document.caretRangeFromPoint(x, y);
            if (r) { domNode = r.startContainer; domOffset = r.startOffset; }
        }

        if (!domNode || domNode.nodeType !== Node.TEXT_NODE) return null;

        const text = domNode.textContent || '';

        // Find word boundaries around the caret offset
        let start = domOffset;
        let end = domOffset;

        while (start > 0 && /\S/.test(text[start - 1])) start--;
        while (end < text.length && /\S/.test(text[end])) end++;

        if (start === end) return null;

        const word = text.slice(start, end).replace(/[.,!?;:"'()[\]{}<>]/g, '');
        if (!word || word.length < 2) return null;

        // Map DOM position to ProseMirror position
        try {
            const view = editor.view;
            const pmPos = view.posAtDOM(domNode, start);
            return {
                word,
                range: { from: pmPos, to: pmPos + word.length },
            };
        } catch {
            return { word, range: null };
        }
    }, [editor]);

    /**
     * Shows the popover for a misspelled word at the given position.
     */
    const showPopover = useCallback(async (word: string, x: number, y: number, range: { from: number; to: number } | null) => {
        // Don't show for tenant verified words
        if (verifiedWords.some(w => w.toLowerCase() === word.toLowerCase())) return;

        setLoading(true);
        setPopover({ word, suggestions: [], position: { x, y }, range });

        // Get offline suggestions using nspell
        const suggestions = await spellCheckerService.getSuggestions(word, language, verifiedWords);

        setPopover(prev => prev ? { ...prev, suggestions } : null);
        setLoading(false);
    }, [verifiedWords, language]);


    /**
     * Click handler on the editor container - detects clicks on spell-errored words.
     */
    const handleEditorClick = useCallback(async (e: MouseEvent) => {
        if (!editor) return;

        const target = e.target as HTMLElement;
        const editorEl = editor.view.dom;

        // Only handle clicks inside the editor
        if (!editorEl.contains(target)) return;

        // Check if the click landed on a text node that's spell-errored
        // We detect this by checking if the element or its parent has a misspelled marker
        // Browsers don't expose this via CSS, so we check coordinates
        const wordData = getWordAtPoint(e.clientX, e.clientY);
        if (!wordData) return;

        // We show the popover for any word in the editor
        // The user can decide if it's wrong or not (dictionary feature)
        const { word, range } = wordData;

        // Only show if word is NOT in dictionary and it's a real word (not numbers/urls)
        if (!word || word.length < 2) return;
        if (/^\d+/.test(word)) return;
        if (verifiedWords.some(w => w.toLowerCase() === word.toLowerCase())) return;

        e.preventDefault();
        e.stopPropagation();

        // Position popover below the click point
        await showPopover(word, e.clientX, e.clientY + 20, range);
    }, [editor, getWordAtPoint, showPopover, verifiedWords]);

    /**
     * Handles hover - shows popover after a short delay.
     */
    const handleEditorMouseOver = useCallback((e: MouseEvent) => {
        if (!editor) return;

        const target = e.target as HTMLElement;
        const editorEl = editor.view.dom;
        if (!editorEl.contains(target)) return;

        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

        hoverTimerRef.current = setTimeout(async () => {
            const wordData = getWordAtPoint(e.clientX, e.clientY);
            if (!wordData) return;
            const { word, range } = wordData;
            if (!word || word.length < 2) return;
            if (/^\d+/.test(word)) return;
            // Only show hover popover if popover is not already visible for another word
            if (popover?.word === word) return;
            if (verifiedWords.some(w => w.toLowerCase() === word.toLowerCase())) return;
        }, 800);
    }, [editor, getWordAtPoint, popover, verifiedWords]);

    // Attach/detach event listeners to the editor DOM
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom as HTMLElement;

        // We listen on CTRL+click or middle-click to avoid interfering with normal editing
        // But per the design, a simple click shows the popover
        // We'll use contextmenu (right click) AND ctrl+click for now,
        // with an option for a special "spell-click" that only fires when clicking
        // on a browser-underlined word. Since we can't detect that via CSS, 
        // we listen on all clicks but only show the popover for likely misspelled words.

        // Use contextmenu to intercept native right-click spell suggestions
        const handleContextMenu = async (e: MouseEvent) => {
            const editorEl = editor.view.dom;
            if (!editorEl.contains(e.target as Node)) return;

            const wordData = getWordAtPoint(e.clientX, e.clientY);
            if (!wordData) return;

            const { word, range } = wordData;
            if (!word || word.length < 2) return;
            if (/^\d+/.test(word)) return;

            // Show our popover instead of/alongside native context menu
            e.preventDefault();
            await showPopover(word, e.clientX, e.clientY, range);
        };

        dom.addEventListener('contextmenu', handleContextMenu);
        dom.addEventListener('mouseover', handleEditorMouseOver as EventListener);

        return () => {
            dom.removeEventListener('contextmenu', handleContextMenu);
            dom.removeEventListener('mouseover', handleEditorMouseOver as EventListener);
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        };
    }, [editor, handleEditorClick, handleEditorMouseOver, getWordAtPoint, showPopover]);

    // Replace word in editor with suggestion
    const handleReplace = (suggestion: string) => {
        if (!editor || !popover?.range) return;
        const { from, to } = popover.range;
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, suggestion).run();
        setPopover(null);
    };

    // Add word to tenant dictionary
    const handleAddToDictionary = async () => {
        if (!popover) return;
        setLoading(true);
        try {
            await onAddToDictionary(popover.word);
        } finally {
            setLoading(false);
            setPopover(null);
        }
    };

    if (!popover) return null;

    // Clamp position to viewport
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 800;
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 600;
    const popoverW = 220;
    const posX = Math.min(popover.position.x, viewportW - popoverW - 16);
    const posY = popover.position.y + 8;

    return (
        <div
            ref={popoverRef}
            style={{ position: 'fixed', left: posX, top: posY, zIndex: 9999, width: popoverW }}
            className="bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onMouseDown={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
                        &ldquo;{popover.word}&rdquo;
                    </span>
                </div>
                <button
                    onClick={() => setPopover(null)}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Suggestions */}
            {loading ? (
                <div className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
                    <div className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
                    Buscando sugerencias...
                </div>
            ) : popover.suggestions.length > 0 ? (
                <div className="py-1">
                    <p className="px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        Sugerencias
                    </p>
                    {popover.suggestions.slice(0, 5).map(s => (
                        <button
                            key={s}
                            onClick={() => handleReplace(s)}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors text-foreground"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground italic">
                    Sin sugerencias disponibles
                </div>
            )}

            {/* Divider + Actions */}
            <div className="border-t border-border py-1">
                <button
                    onClick={handleAddToDictionary}
                    disabled={loading}
                    className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-emerald-500/10 hover:text-emerald-600 text-muted-foreground transition-colors disabled:opacity-50"
                >
                    <BookMarked className="w-3.5 h-3.5" />
                    Añadir al diccionario
                </button>
                {popover.range && (
                    <button
                        onClick={() => {
                            // Mark as ignored in this session (don't show popover again)
                            setPopover(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <Check className="w-3.5 h-3.5" />
                        Ignorar
                    </button>
                )}
            </div>
        </div>
    );
}
