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
    const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });
    const [isPositioned, setIsPositioned] = useState(false);

    // Handle viewport clamping
    useEffect(() => {
        if (!popover || !popoverRef.current) {
            setIsPositioned(false);
            return;
        }

        const menuHeight = popoverRef.current.offsetHeight;
        const menuWidth = popoverRef.current.offsetWidth;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let posX = popover.position.x;
        let posY = popover.position.y + 8;

        // Clamp right edge
        if (posX + menuWidth > viewportWidth) {
            posX = viewportWidth - menuWidth - 16;
        }

        // Clamp bottom edge
        if (posY + menuHeight > viewportHeight) {
            posY = viewportHeight - menuHeight - 16;
        }

        setAdjustedPos({ x: posX, y: posY });
        setIsPositioned(true);
    }, [popover]);

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



    // Attach/detach event listeners to the editor DOM
    // Dictionary popover shows when user DWELLS (stops moving) over a word.
    // Right-click is NOT intercepted → browser context menu / formatting tools work normally.
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom as HTMLElement;
        let dwellTimer: ReturnType<typeof setTimeout> | null = null;
        let lastX = 0;
        let lastY = 0;

        const handleMouseMove = (e: MouseEvent) => {
            const editorEl = editor.view.dom;
            if (!editorEl.contains(e.target as Node)) return;

            lastX = e.clientX;
            lastY = e.clientY;

            // Reset the dwell timer on every move
            if (dwellTimer) clearTimeout(dwellTimer);

            // After 800ms of no movement, check if there's a word under the cursor
            dwellTimer = setTimeout(async () => {
                const wordData = getWordAtPoint(lastX, lastY);
                if (!wordData) return;
                const { word, range } = wordData;
                if (!word || word.length < 2) return;
                if (/^\d+/.test(word)) return;
                if (verifiedWords.some(w => w.toLowerCase() === word.toLowerCase())) return;

                // [ADD] ONLY show if the word is actually misspelled
                const isCorrect = await spellCheckerService.checkWord(word, language, verifiedWords);
                if (isCorrect) return;

                // Don't re-show for the same word
                if (popover?.word === word) return;

                await showPopover(word, lastX, lastY + 20, range);
            }, 800);
        };

        // Close popover when mouse leaves the editor entirely
        const handleMouseLeave = () => {
            if (dwellTimer) clearTimeout(dwellTimer);
        };

        dom.addEventListener('mousemove', handleMouseMove);
        dom.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            dom.removeEventListener('mousemove', handleMouseMove);
            dom.removeEventListener('mouseleave', handleMouseLeave);
            if (dwellTimer) clearTimeout(dwellTimer);
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        };
    }, [editor, getWordAtPoint, showPopover, verifiedWords, popover]);


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

    return (
        <div
            ref={popoverRef}
            style={{
                position: 'fixed',
                left: adjustedPos.x,
                top: adjustedPos.y,
                zIndex: 9999,
                width: 220,
                visibility: isPositioned ? 'visible' : 'hidden'
            }}
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
