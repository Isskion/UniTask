"use client";

import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import { UniLeakNote } from "@/types";
import { saveNote } from "@/lib/unileaks";
import { useToast } from "@/context/ToastContext";
import { Loader2, Save, Globe, Lock, Trash2, ChevronRight, List, ListOrdered, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Type, Quote, Code, ListPlus, Minus, Table as TableIcon, MessageSquareQuote, Highlighter } from "lucide-react";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface UniLeaksEditorProps {
    note: UniLeakNote;
    onSaveSuccess: (note: UniLeakNote) => void;
    onDeleteSuccess: (noteId: string) => void;
}

export default function UniLeaksEditor({ note, onSaveSuccess, onDeleteSuccess }: UniLeaksEditorProps) {
    const { showToast } = useToast();
    const { deleteDoc: deleteFirebaseDoc } = useSafeFirestore();

    // Local State for Edit
    const [title, setTitle] = useState(note.title || "");
    const [content, setContent] = useState(note.content || "");
    const [isPublic, setIsPublic] = useState(note.isPublic || false);
    const [isSaving, setIsSaving] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });

    const currentNoteIdRef = useRef<string | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'w-full text-left border-collapse table-auto',
                },
            }),
            TableRow,
            TableHeader,
            TableCell,
            Highlight.configure({
                multicolor: true,
            }),
            Placeholder.configure({
                placeholder: 'Escribe aquí tus ideas, reuniones, tareas... soporta Markdown!',
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: note.content || "",
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[50vh]',
            },
        },
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
    });

    // Update local state when a new note prop comes in
    useEffect(() => {
        setTitle(note.title || "");
        setContent(note.content || "");
        setIsPublic(note.isPublic || false);

        if (editor && currentNoteIdRef.current !== note.id) {
            editor.commands.setContent(note.content || "");
            currentNoteIdRef.current = note.id;
        }
    }, [note, editor]);

    // Close context menu on external click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu({ visible: false, x: 0, y: 0 });
            }
        };
        // Using mousedown is strictly better for click-outside detection to avoid drag-outs
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) {
            showToast("Atención", "Escribe un título o contenido antes de guardar", "info");
            return;
        }

        setIsSaving(true);
        try {
            const noteDataToSave: Partial<UniLeakNote> = {
                ...note,
                title,
                content,
                isPublic
            };

            // Only send id if it's not a new note (new notes have empty id locally)
            if (!note.id) {
                delete noteDataToSave.id;
            }

            const savedId = await saveNote(noteDataToSave);

            showToast("Guardado", "Nota guardada correctamente.", "success");

            // Refresh parent state
            onSaveSuccess({
                ...note,
                ...noteDataToSave,
                id: savedId
            } as UniLeakNote);

        } catch (error) {
            console.error("Error saving note:", error);
            showToast("Error", "No se pudo guardar la nota.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!note.id) {
            // Already new, just pretend delete
            onDeleteSuccess(note.id);
            return;
        }

        if (!confirm("¿Estás seguro de que deseas eliminar esta nota de forma permanente?")) return;

        try {
            await deleteFirebaseDoc(doc(db, "unileaks_notes", note.id));
            showToast("Eliminada", "La nota ha sido eliminada.", "success");
            onDeleteSuccess(note.id);
        } catch (error) {
            console.error("Error deleting note", error);
            showToast("Error", "No se pudo eliminar la nota", "error");
        }
    };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between py-6 px-10 border-b border-border bg-background sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <label className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-sm font-medium",
                        isPublic ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    )}>
                        <input
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="hidden"
                        />
                        {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {isPublic ? "Visible para todo el proyecto" : "Nota Privada"}
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    {note.id && (
                        <button
                            onClick={handleDelete}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Eliminar Nota"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Guardar
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col p-10 pb-20">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título de la nota..."
                    className="w-full text-5xl font-extrabold bg-transparent border-none outline-none mb-8 text-foreground placeholder-muted-foreground placeholder-opacity-50"
                />

                <div className="flex-1 w-full relative">
                    {editor && (
                        <BubbleMenu editor={editor} className="flex bg-card rounded-lg shadow-xl overflow-hidden border border-border">
                            <button
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                className={cn("px-3 py-1.5 text-sm font-bold hover:bg-muted transition-colors", editor.isActive('bold') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                            >
                                B
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                className={cn("px-3 py-1.5 text-sm font-serif italic hover:bg-muted transition-colors", editor.isActive('italic') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                            >
                                I
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                className={cn("px-3 py-1.5 text-sm font-medium line-through hover:bg-muted transition-colors", editor.isActive('strike') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                            >
                                S
                            </button>
                            <div className="w-px bg-border mx-1" />
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={cn("px-3 py-1.5 text-sm font-bold hover:bg-muted transition-colors", editor.isActive('heading', { level: 2 }) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                            >
                                H2
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                className={cn("px-3 py-1.5 text-sm hover:bg-muted transition-colors", editor.isActive('bulletList') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                            >
                                • Lista
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                className={cn("px-3 py-1.5 text-sm hover:bg-muted transition-colors", editor.isActive('blockquote') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                            >
                                " Cita
                            </button>
                        </BubbleMenu>
                    )}
                    <div
                        onContextMenu={(e) => {
                            e.preventDefault();
                            let x = e.clientX;
                            let y = e.clientY;

                            // Safe bounding box calculations
                            // Main menu ~224px width, + 2 levels of submenus (~450px)
                            const estimatedTotalWidth = 224 + 224 + 224;
                            const estimatedHeight = 420; // Enough for the longest root menu

                            if (x + estimatedTotalWidth > window.innerWidth) {
                                x = window.innerWidth - estimatedTotalWidth - 20;
                                if (x < 10) x = 10;
                            }
                            if (y + estimatedHeight > window.innerHeight) {
                                y = window.innerHeight - estimatedHeight - 20;
                                if (y < 10) y = 10;
                            }

                            setContextMenu({ visible: true, x, y });
                        }}
                    >
                        <EditorContent
                            editor={editor}
                            className={cn(
                                "prose prose-neutral max-w-none text-foreground focus:outline-none min-h-[50vh]",
                                "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground",
                                "prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground",
                                "prose-blockquote:text-foreground prose-a:text-primary",
                                "prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md",
                                "[&_pre]:bg-zinc-950 [&_pre]:text-zinc-50 [&_pre_code]:text-zinc-50 [&_pre_code]:bg-transparent [&_pre_code]:p-0"
                            )}
                        />
                    </div>

                    {/* Obsidian-Style Formatting Context Menu */}
                    {contextMenu.visible && editor && (
                        <div
                            ref={contextMenuRef}
                            className="fixed z-50 bg-popover border border-border rounded-lg shadow-2xl py-1 w-56 text-sm overflow-visible animate-in fade-in zoom-in-95 duration-100 flex flex-col"
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                        >
                            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Formato</div>
                            <button
                                onClick={() => { editor.chain().focus().toggleBold().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center justify-between", editor.isActive('bold') ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                            >
                                <span className="font-bold">Negrita</span>
                                <span className="text-muted-foreground text-xs">Ctrl+B</span>
                            </button>
                            <button
                                onClick={() => { editor.chain().focus().toggleItalic().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center justify-between", editor.isActive('italic') ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                            >
                                <span className="italic">Cursiva</span>
                                <span className="text-muted-foreground text-xs">Ctrl+I</span>
                            </button>
                            <button
                                onClick={() => { editor.chain().focus().toggleStrike().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center justify-between", editor.isActive('strike') ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                            >
                                <span className="line-through">Tachado</span>
                            </button>

                            {/* Nested Highlight Menu */}
                            <div className="relative group/highlight pb-1">
                                <button className="w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center justify-between text-popover-foreground">
                                    <div className="flex items-center gap-3">
                                        <Highlighter className="w-4 h-4 text-muted-foreground" />
                                        Subrayado (Color)
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>
                                {/* Highlight Color Picker Submenu */}
                                <div className="hidden group-hover/highlight:flex flex-col absolute top-0 -translate-y-1 bg-popover border border-border rounded-lg shadow-2xl p-2 w-48 text-sm" style={{ left: 'calc(100% + 4px)' }} onClick={(e) => e.stopPropagation()}>
                                    <div className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">Color de Resaltado</div>
                                    <div className="flex items-center justify-between gap-2 mb-3 px-2">
                                        <label className="text-xs text-muted-foreground font-medium">Color:</label>
                                        <input
                                            type="color"
                                            defaultValue="#facc15"
                                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
                                            id="highlight-color-input"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button
                                            className="w-full bg-primary text-primary-foreground rounded py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const color = (document.getElementById('highlight-color-input') as HTMLInputElement)?.value || "#facc15";
                                                editor.chain().focus().toggleHighlight({ color }).run();
                                                setContextMenu({ visible: false, x: 0, y: 0 });
                                            }}
                                        >
                                            Aplicar Color
                                        </button>
                                        <button
                                            className="w-full bg-muted text-foreground rounded py-1.5 text-xs font-semibold hover:bg-muted/80 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                editor.chain().focus().unsetHighlight().run();
                                                setContextMenu({ visible: false, x: 0, y: 0 });
                                            }}
                                        >
                                            Quitar Subrayado
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border my-1 pb-1" />

                            {/* Nested Paragraph Menu */}
                            <div className="relative group/paragraph">
                                <button className="w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center justify-between text-popover-foreground">
                                    <div className="flex items-center gap-2">
                                        <Type className="w-4 h-4 text-muted-foreground" />
                                        Párrafo
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>

                                {/* Submenu */}
                                <div className="hidden group-hover/paragraph:flex flex-col absolute top-0 -translate-y-1 bg-popover border border-border rounded-lg shadow-2xl py-1 w-56 text-sm" style={{ left: 'calc(100% + 4px)' }}>
                                    <button
                                        onClick={() => { editor.chain().focus().toggleBulletList().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('bulletList') ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <List className="w-4 h-4 text-muted-foreground" /> Bullet list
                                    </button>
                                    <button
                                        onClick={() => { editor.chain().focus().toggleOrderedList().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('orderedList') ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <ListOrdered className="w-4 h-4 text-muted-foreground" /> Numbered list
                                    </button>


                                    <div className="border-t border-border my-1" />

                                    <button
                                        onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3 font-semibold", editor.isActive('heading', { level: 1 }) ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <Heading1 className="w-4 h-4 text-muted-foreground" /> Heading 1
                                    </button>
                                    <button
                                        onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('heading', { level: 2 }) ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <Heading2 className="w-4 h-4 text-muted-foreground" /> Heading 2
                                    </button>
                                    <button
                                        onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('heading', { level: 3 }) ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <Heading3 className="w-4 h-4 text-muted-foreground" /> Heading 3
                                    </button>
                                    <button
                                        onClick={() => { editor.chain().focus().toggleHeading({ level: 4 }).run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('heading', { level: 4 }) ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <Heading4 className="w-4 h-4 text-muted-foreground" /> Heading 4
                                    </button>
                                    <button
                                        onClick={() => { editor.chain().focus().toggleHeading({ level: 5 }).run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('heading', { level: 5 }) ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <Heading5 className="w-4 h-4 text-muted-foreground" /> Heading 5
                                    </button>
                                    <button
                                        onClick={() => { editor.chain().focus().toggleHeading({ level: 6 }).run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('heading', { level: 6 }) ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <Heading6 className="w-4 h-4 text-muted-foreground" /> Heading 6
                                    </button>

                                    <div className="border-t border-border my-1" />

                                    <button
                                        onClick={() => { editor.chain().focus().setParagraph().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('paragraph') ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <Type className="w-4 h-4 text-muted-foreground" /> Body
                                    </button>
                                    <button
                                        onClick={() => { editor.chain().focus().toggleBlockquote().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('blockquote') ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <Quote className="w-4 h-4 text-muted-foreground" /> Quote
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-border my-1 pb-1" />
                            {/* Nested Insert Menu */}
                            <div className="relative group/insert pb-1">
                                <button className="w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center justify-between text-popover-foreground">
                                    <div className="flex items-center gap-2">
                                        <ListPlus className="w-4 h-4 text-muted-foreground" />
                                        Insert
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>

                                {/* Submenu */}
                                <div className="hidden group-hover/insert:flex flex-col absolute top-0 -translate-y-1 bg-popover border border-border rounded-lg shadow-2xl py-1 w-56 text-sm" style={{ left: 'calc(100% + 4px)' }}>

                                    <button
                                        onClick={() => { editor.chain().focus().setHorizontalRule().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", 'text-popover-foreground')}
                                    >
                                        <Minus className="w-4 h-4 text-muted-foreground" /> Horizontal rule
                                    </button>

                                    <button
                                        onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('codeBlock') ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <Code className="w-4 h-4 text-muted-foreground" /> Code block
                                    </button>

                                    {/* Nested Table Menu */}
                                    <div className="relative group/table">
                                        <button className="w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center justify-between text-popover-foreground">
                                            <div className="flex items-center gap-3">
                                                <TableIcon className="w-4 h-4 text-muted-foreground" />
                                                Table
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                        {/* Table Config Submenu */}
                                        <div className="hidden group-hover/table:flex flex-col absolute top-0 -translate-y-1 bg-popover border border-border rounded-lg shadow-2xl p-3 w-52 text-sm" style={{ left: 'calc(100% + 4px)' }} onClick={(e) => e.stopPropagation()}>
                                            <div className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Dimensiones</div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <label className="text-xs text-muted-foreground font-medium">Filas:</label>
                                                <input type="number" min="1" max="20" defaultValue="3" className="w-16 bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" id="table-rows-input" />
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mb-4">
                                                <label className="text-xs text-muted-foreground font-medium">Columnas:</label>
                                                <input type="number" min="1" max="20" defaultValue="3" className="w-16 bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" id="table-cols-input" />
                                            </div>
                                            <button
                                                className="w-full bg-primary text-primary-foreground rounded py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rows = parseInt((document.getElementById('table-rows-input') as HTMLInputElement)?.value || "3", 10);
                                                    const cols = parseInt((document.getElementById('table-cols-input') as HTMLInputElement)?.value || "3", 10);

                                                    // Ensure rows and cols are at least 1
                                                    editor.chain().focus().insertTable({ rows: Math.max(1, rows), cols: Math.max(1, cols), withHeaderRow: true }).run();
                                                    setContextMenu({ visible: false, x: 0, y: 0 });
                                                }}
                                            >
                                                Insertar Tabla
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { editor.chain().focus().toggleBlockquote().run(); setContextMenu({ visible: false, x: 0, y: 0 }); }}
                                        className={cn("w-full text-left px-4 py-1.5 hover:bg-muted transition-colors flex items-center gap-3", editor.isActive('blockquote') ? 'text-primary bg-muted/50' : 'text-popover-foreground')}
                                    >
                                        <MessageSquareQuote className="w-4 h-4 text-muted-foreground" /> Callout
                                    </button>

                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
