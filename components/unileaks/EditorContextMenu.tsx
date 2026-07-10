"use client";

import { useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import {
    Bold, Italic, Strikethrough, Heading2,
    Quote, List, Code, BookMarked,
    Highlighter, ChevronRight, X,
    Circle, Square, Minus, MoveRight,
    PaintRoller, ClipboardCopy,
    Type, ChevronDown, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorContextMenuProps {
    editor: Editor;
    visible: boolean;
    x: number;
    y: number;
    wordUnderCursor: string | null;
    onClose: () => void;
    onAddToDictionary: (word: string) => Promise<void>;
    canPasteFormat: boolean;
    onCopyFormat: () => void;
    onPasteFormat: () => void;
}

export default function EditorContextMenu({
    editor,
    visible,
    x,
    y,
    wordUnderCursor,
    onClose,
    onAddToDictionary,
    canPasteFormat,
    onCopyFormat,
    onPasteFormat,
}: EditorContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState({ top: y, left: x });
    const [isPositioned, setIsPositioned] = useState(false);

    // Handle viewport clamping
    useEffect(() => {
        if (!visible || !menuRef.current) {
            if (!visible) setIsPositioned(false);
            return;
        }

        const menuHeight = menuRef.current.offsetHeight;
        const menuWidth = menuRef.current.offsetWidth;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = y;
        let left = x;

        // Clamp right edge
        if (left + menuWidth > viewportWidth) {
            left = viewportWidth - menuWidth - 10;
        }

        // Clamp bottom edge
        if (top + menuHeight > viewportHeight) {
            top = viewportHeight - menuHeight - 10;
        }

        setAdjustedPos({ top, left });
        setIsPositioned(true);
    }, [visible, x, y, wordUnderCursor]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        let timer: ReturnType<typeof setTimeout>;
        if (visible) {
            // Wait one frame to avoid capturing the mousedown that opened the menu
            timer = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 0);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            if (timer) clearTimeout(timer);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    // Highlights palette
    const highlightColors = [
        { name: 'Amarillo', color: '#fef08a', tailwind: 'bg-yellow-200' },
        { name: 'Verde', color: '#bbf7d0', tailwind: 'bg-emerald-200' },
        { name: 'Azul', color: '#bfdbfe', tailwind: 'bg-blue-200' },
        { name: 'Rosa', color: '#fbcfe8', tailwind: 'bg-pink-200' },
    ];

    const handleToggleHighlight = (color: string) => {
        editor.chain().focus().toggleHighlight({ color }).run();
        onClose();
    };

    const handleClearFormatting = () => {
        editor.chain().focus().unsetAllMarks().run();
        editor.chain().focus().clearNodes().run();
        onClose();
    };

    const bulletTypes = [
        { name: 'Punto', type: 'disc', icon: Circle },
        { name: 'Cuadrado', type: 'square', icon: Square },
        { name: 'Línea', type: 'dash', icon: Minus },
        { name: 'Flecha', type: 'arrow', icon: MoveRight },
    ];

    const handleSetBulletType = (type: string) => {
        if (!editor.isActive('bulletList')) {
            editor.chain().focus().toggleBulletList().updateAttributes('bulletList', { listType: type }).run();
        } else {
            editor.chain().focus().updateAttributes('bulletList', { listType: type }).run();
        }
        onClose();
    };

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                left: adjustedPos.left,
                top: adjustedPos.top,
                zIndex: 10000,
                visibility: isPositioned ? 'visible' : 'hidden'
            }}
            className="w-56 bg-popover border border-border rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
            {/* Formatting Group */}
            <div className="px-2 pb-1.5 mb-1.5 border-b border-border">
                <p className="px-2 py-1 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Formato</p>
                <div className="grid grid-cols-4 gap-1">
                    <button
                        onClick={() => { editor.chain().focus().toggleBold().run(); onClose(); }}
                        className={cn("p-2 rounded-lg hover:bg-muted flex items-center justify-center transition-colors", editor.isActive('bold') && "bg-primary/10 text-primary")}
                        title="Negrita"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { editor.chain().focus().toggleItalic().run(); onClose(); }}
                        className={cn("p-2 rounded-lg hover:bg-muted flex items-center justify-center transition-colors", editor.isActive('italic') && "bg-primary/10 text-primary")}
                        title="Cursiva"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { editor.chain().focus().toggleStrike().run(); onClose(); }}
                        className={cn("p-2 rounded-lg hover:bg-muted flex items-center justify-center transition-colors", editor.isActive('strike') && "bg-primary/10 text-primary")}
                        title="Tachado"
                    >
                        <Strikethrough className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); onClose(); }}
                        className={cn("p-2 rounded-lg hover:bg-muted flex items-center justify-center transition-colors", editor.isActive('heading', { level: 2 }) && "bg-primary/10 text-primary")}
                        title="Título 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Highlighting Group (Señalar) */}
            <div className="px-2 pb-1.5 mb-1.5 border-b border-border">
                <p className="px-2 py-1 text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
                    <Highlighter className="w-3 h-3" /> Señalar
                </p>
                <div className="flex items-center gap-2 px-1 pb-1">
                    {highlightColors.map((hc) => (
                        <button
                            key={hc.color}
                            onClick={() => handleToggleHighlight(hc.color)}
                            className={cn(
                                "w-8 h-8 rounded-full border border-black/5 hover:scale-110 transition-transform shadow-sm",
                                hc.tailwind
                            )}
                            title={hc.name}
                        />
                    ))}
                    <button
                        onClick={() => { editor.chain().focus().unsetHighlight().run(); onClose(); }}
                        className="ml-auto p-1.5 hover:bg-muted rounded text-muted-foreground"
                        title="Quitar resaltado"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Typography Group */}
            <div className="px-2 pb-1.5 mb-1.5 border-b border-border">
                <p className="px-2 py-1 text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
                    <Type className="w-3 h-3" /> Tipografía
                </p>
                <div className="space-y-2 px-1">
                    {/* Font Family Selector */}
                    <div className="relative group/font">
                        <select
                            onChange={(e) => {
                                (editor.chain().focus() as any).setFontFamily(e.target.value).run();
                                onClose();
                            }}
                            value={editor.getAttributes('fontFamily').font || 'Garamond'}
                            className="w-full bg-muted/50 hover:bg-muted border border-border rounded-lg px-2 py-1.5 text-xs font-medium focus:outline-none appearance-none cursor-pointer transition-colors"
                        >
                            <option value="Garamond">Garamond (Defecto)</option>
                            <option value="Inter">Inter (Estándar)</option>
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Courier New">Courier New (Mono)</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Font Size Selector */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                const current = parseInt(editor.getAttributes('fontSize').size || '16');
                                (editor.chain().focus() as any).setFontSize(`${Math.max(8, current - 2)}px`).run();
                            }}
                            className="p-1 px-2 hover:bg-muted border border-border rounded-lg transition-colors"
                            title="Reducir tamaño"
                        >
                            <Minus className="w-3 h-3" />
                        </button>

                        <div className="flex-1 min-w-0 relative">
                            <input
                                type="number"
                                value={parseInt(editor.getAttributes('fontSize').size || '16')}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val > 0) (editor.chain().focus() as any).setFontSize(`${val}px`).run();
                                }}
                                className="w-full bg-muted/50 border border-border rounded-lg px-2 py-1 text-xs text-center font-bold focus:outline-none focus:border-primary transition-all"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-30 pointer-events-none">pt</span>
                        </div>

                        <button
                            onClick={() => {
                                const current = parseInt(editor.getAttributes('fontSize').size || '16');
                                (editor.chain().focus() as any).setFontSize(`${Math.min(72, current + 2)}px`).run();
                            }}
                            className="p-1 px-2 hover:bg-muted border border-border rounded-lg transition-colors"
                            title="Aumentar tamaño"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Blocks & Lists Group */}
            <div className="px-2 pb-1.5 mb-1.5 border-b border-border">
                <p className="px-2 py-1 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Listas y Bloques</p>
                <div className="grid grid-cols-4 gap-1 mb-2">
                    {bulletTypes.map((bt) => (
                        <button
                            key={bt.type}
                            onClick={() => handleSetBulletType(bt.type)}
                            className={cn(
                                "p-2 rounded-lg hover:bg-muted flex items-center justify-center transition-colors",
                                editor.isActive('bulletList', { listType: bt.type }) && "bg-primary/10 text-primary"
                            )}
                            title={`Lista: ${bt.name}`}
                        >
                            <bt.icon className="w-4 h-4" />
                        </button>
                    ))}
                </div>
                <div className="px-1 space-y-0.5">
                    <button
                        onClick={() => { editor.chain().focus().toggleBlockquote().run(); onClose(); }}
                        className={cn(
                            "w-full flex items-center gap-3 px-2 py-1.5 text-sm hover:bg-muted rounded-lg transition-colors",
                            editor.isActive('blockquote') ? 'bg-primary/10 text-primary' : 'text-foreground'
                        )}
                    >
                        <Quote className="w-4 h-4 text-muted-foreground" />
                        <span>Cita</span>
                    </button>
                    <button
                        onClick={() => { editor.chain().focus().toggleCodeBlock().run(); onClose(); }}
                        className={cn(
                            "w-full flex items-center gap-3 px-2 py-1.5 text-sm hover:bg-muted rounded-lg transition-colors",
                            editor.isActive('codeBlock') ? 'bg-primary/10 text-primary' : 'text-foreground'
                        )}
                    >
                        <Code className="w-4 h-4 text-muted-foreground" />
                        <span>Bloque de código</span>
                    </button>
                </div>
            </div>

            {/* Actions Group */}
            <div className="px-1 space-y-0.5">
                {wordUnderCursor && (
                    <button
                        onClick={() => { onAddToDictionary(wordUnderCursor); onClose(); }}
                        className="w-full flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-emerald-500/10 text-emerald-600 rounded-lg transition-colors"
                    >
                        <BookMarked className="w-4 h-4" />
                        <span className="truncate">Añadir "{wordUnderCursor}"</span>
                    </button>
                )}
                <button
                    onClick={handleClearFormatting}
                    className="w-full flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                >
                    <ChevronRight className="w-4 h-4 opacity-50" />
                    <span>Limpiar formato</span>
                </button>
            </div>

            {/* Format Painter Group */}
            <div className="px-1 pt-1.5 mt-1.5 border-t border-border space-y-0.5">
                <button
                    onClick={() => { onCopyFormat(); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted rounded-lg transition-colors text-foreground"
                >
                    <ClipboardCopy className="w-4 h-4 text-muted-foreground" />
                    <span>Copiar formato</span>
                </button>
                <button
                    disabled={!canPasteFormat}
                    onClick={() => { onPasteFormat(); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted rounded-lg transition-colors text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <PaintRoller className="w-4 h-4 text-amber-600" />
                    <span>Pegar formato</span>
                </button>
            </div>
        </div>
    );
}

