"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { UniLeakNote } from "@/types";
import { saveNote } from "@/lib/unileaks";
import { addTenantWord, getTenantWords } from "@/lib/dictionary";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Check, Loader2, Globe, Lock, Trash2, List, Code, MessageSquareQuote, Download, FileText, FileCode, FileType, BookMarked, ImageIcon, Share2 } from "lucide-react";
import { getShareUrl, copyToClipboard } from "@/lib/share";
import { useLanguage } from "@/context/LanguageContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { useFileUploader } from "@/hooks/useFileUploader";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { TenantDictionary } from "@/lib/tiptap-extensions/TenantDictionary";
import SpellCheckPopover from "@/components/unileaks/SpellCheckPopover";

interface UniLeaksEditorProps {
    note: UniLeakNote;
    onSaveSuccess: (note: UniLeakNote) => void;
    onDeleteSuccess: (noteId: string) => void;
}

export default function UniLeaksEditor({ note, onSaveSuccess, onDeleteSuccess }: UniLeaksEditorProps) {
    const { showToast } = useToast();
    const { user, tenantId: currentTenantId } = useAuth();
    const { deleteDoc: deleteFirebaseDoc } = useSafeFirestore();
    const { uploadFile, uploading: isUploadingImage } = useFileUploader();
    const { t, language } = useLanguage();

    // Local State for Edit
    const [title, setTitle] = useState(note.title || "");
    const [content, setContent] = useState(note.content || "");
    const [isPublic, setIsPublic] = useState(note.isPublic || false);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'dirty' | 'error'>('idle');
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [verifiedWords, setVerifiedWords] = useState<string[]>([]);

    const currentNoteIdRef = useRef<string | null>(null);
    const isSettingContentRef = useRef<boolean>(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);

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
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-xl border border-border max-w-full h-auto my-4 shadow-lg',
                },
            }),
            Placeholder.configure({
                placeholder: 'Escribe aquí tus ideas, reuniones, tareas... soporta Markdown!',
                emptyEditorClass: 'is-editor-empty',
            }),
            TenantDictionary,
        ],
        content: note.content || "",
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[50vh]',
                spellcheck: 'true',
                lang: language,
            },
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || []);
                const imageItem = items.find(item => item.type.startsWith('image'));

                if (imageItem) {
                    event.preventDefault(); // [ADD] Explicitly prevent default paste
                    const file = imageItem.getAsFile();
                    if (file) {
                        handleImageUpload(file);
                        return true; // handled
                    }
                }
                return false;
            },
            handleDrop: (view, event) => {
                const files = Array.from(event.dataTransfer?.files || []);
                const imageFile = files.find(file => file.type.startsWith('image'));

                if (imageFile) {
                    event.preventDefault();
                    handleImageUpload(imageFile);
                    return true;
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            if (!isSettingContentRef.current) {
                setContent(editor.getHTML());
                setAutoSaveStatus('dirty');
            }
        },
    });

    // Update local state when a new note prop comes in
    useEffect(() => {
        setIsSettingContentRef(true);
        setTitle(note.title || "");
        setContent(note.content || "");
        setIsPublic(note.isPublic || false);

        if (editor && currentNoteIdRef.current !== note.id) {
            // Compare content to avoid redundant updates if only metadata/other fields changed
            const currentHTML = editor.getHTML();
            const newHTML = note.content || "";
            if (currentHTML !== newHTML) {
                editor.commands.setContent(newHTML);
            }
            currentNoteIdRef.current = note.id;
        }

        // Use a small timeout to ensure Tiptap has processed the change before we release the lock
        setTimeout(() => {
            setIsSettingContentRef(false);
        }, 50);
    }, [note, editor]);

    function setIsSettingContentRef(val: boolean) {
        isSettingContentRef.current = val;
    }

    // AI/Storage path helper
    const handleImageUpload = async (file: File) => {
        try {
            const effectiveTenantId = note.tenantId || currentTenantId || 'global';
            const path = `tenants/${effectiveTenantId}/unileaks/images/${note.id || 'temp_' + Date.now()}`;
            console.log("[UniLeaks] 🚀 Uploading image to path:", path);
            showToast("Subiendo...", "Estamos guardando tu imagen...", "info");
            const result = await uploadFile(file, path);
            if (result && editor) {
                editor.chain().focus().setImage({ src: result.url }).run();
                showToast("Éxito", "Imagen subida correctamente", "success");
            }
        } catch (err) {
            console.error("Error uploading image:", err);
            showToast("Error", "No se pudo subir la imagen", "error");
        }
    };

    // Update editor attributes when language changes or editor initializes
    useEffect(() => {
        if (!editor || editor.isDestroyed) return;

        // Map internal language codes to browser-friendly tags
        const langMap: Record<string, string> = {
            'es': 'es-ES',
            'en': 'en-US',
            'de': 'de-DE',
            'fr': 'fr-FR',
            'ca': 'ca-ES',
            'pt': 'pt-PT'
        };
        const browserLang = langMap[language] || language;

        // Force attributes on the DOM element of the editor
        setTimeout(() => {
            const dom = (editor.view.dom as HTMLElement);
            if (dom) {
                dom.setAttribute('lang', browserLang);
                dom.setAttribute('spellcheck', 'true');
                // Ensure classes are preserved
                if (!dom.classList.contains('focus:outline-none')) {
                    dom.classList.add('focus:outline-none');
                }
            }
        }, 100);

        // Also update options for consistency
        editor.setOptions({
            editorProps: {
                attributes: {
                    lang: browserLang,
                    spellcheck: 'true',
                    class: 'focus:outline-none min-h-[50vh]',
                },
            },
        });
    }, [editor, language]);

    // Close menus on external click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showDownloadMenu && downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setShowDownloadMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showDownloadMenu]);

    // --- EXPORT LOGIC ---
    const handleExportPDF = () => {
        window.print();
    };

    const handleExportMarkdown = () => {
        if (!editor) return;

        // Simple HTML to Markdown conversion logic
        let md = `# ${title}\n\n`;
        const html = editor.getHTML();

        // Very basic conversion (replace tags with MD equivalents)
        const contentMd = html
            .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<ul>(.*?)<\/ul>/gi, '$1\n')
            .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
            .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, ''); // Strip remaining tags

        md += contentMd;

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'nota'}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportHTML = () => {
        if (!editor) return;
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: auto; }
                    h1 { font-size: 2.5rem; margin-bottom: 2rem; }
                    img { max-width: 100%; border-radius: 8px; }
                    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                ${editor.getHTML()}
            </body>
            </html>
        `;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'nota'}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- AUTO-SAVE LOGIC ---
    useEffect(() => {
        // Only trigger if dirty and not already saving
        if (autoSaveStatus !== 'dirty' || isSaving) return;

        const timer = setTimeout(() => {
            handleSave(true); // true = isAutoSave
        }, 2000); // 2 second debounce

        return () => clearTimeout(timer);
    }, [title, content, isPublic, autoSaveStatus, isSaving]);

    const handleSave = async (isAutoSave = false) => {
        if (!title.trim() && !content.trim()) {
            if (!isAutoSave) showToast("Atención", "Escribe un título o contenido antes de guardar", "info");
            return;
        }

        if (isAutoSave) setAutoSaveStatus('saving');
        else setIsSaving(true);

        const startTime = Date.now();
        console.log(`[UniLeaks] 💾 Saving note: ${title.substring(0, 20)}... (isAutoSave: ${isAutoSave})`);

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
            const duration = Date.now() - startTime;
            console.log(`[UniLeaks] ✅ Saved successfully (id: ${savedId}) in ${duration}ms`);

            if (!isAutoSave) showToast("Guardado", "Nota guardada correctamente.", "success");

            setAutoSaveStatus('saved');

            // Update local ref immediately to avoid sync loops
            currentNoteIdRef.current = savedId;

            // Refresh parent state
            onSaveSuccess({
                ...note,
                ...noteDataToSave,
                id: savedId
            } as UniLeakNote);

        } catch (error) {
            console.error("Error saving note:", error);
            if (!isAutoSave) showToast("Error", "No se pudo guardar la nota.", "error");
            setAutoSaveStatus('error');
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
            console.error("Error deleting note:", error);
            showToast("Error", "No se pudo eliminar la nota.", "error");
        }
    };

    // Dictionary Actions
    // Called from the BubbleMenu (uses current text selection)
    const handleAddToDictionaryFromSelection = async () => {
        if (!editor || !currentTenantId || !user) return;

        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');

        if (!selectedText || selectedText.trim().length < 2) {
            showToast("Aviso", "Selecciona una palabra válida primero.", "warning");
            return;
        }

        if (selectedText.trim().length > 100) {
            showToast("Aviso", "La selección es demasiado larga para ser una palabra.", "warning");
            return;
        }

        await handleAddWordToDictionary(selectedText.trim());
    };

    // Called from the SpellCheckPopover (receives the word directly)
    const handleAddWordToDictionary = useCallback(async (word: string) => {
        if (!currentTenantId || !user) return;
        const clean = word.trim();
        if (!clean || clean.length < 2 || clean.length > 100) return;

        try {
            await addTenantWord(currentTenantId, clean, user.uid);
            if (editor) {
                editor.chain().focus().setMark('tenantDictionary', { spellcheck: 'false' }).run();
            }
            // Update local verified words list to prevent re-triggering popover
            setVerifiedWords(prev => prev.includes(clean) ? prev : [...prev, clean]);
            showToast("Diccionario", `"${clean}" añadido y validado.`, "success");
        } catch (err) {
            console.error("Error adding word:", err);
            showToast("Error", "No se pudo añadir al diccionario", "error");
        }
    }, [currentTenantId, user, editor, showToast]);

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
                            onChange={(e) => {
                                setIsPublic(e.target.checked);
                                setAutoSaveStatus('dirty');
                            }}
                            className="hidden"
                        />
                        {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {isPublic ? "Visible para todo el proyecto" : "Nota Privada"}
                    </label>
                </div>

                <div className="flex items-center gap-6 print:hidden">
                    {/* Auto-save Status Indicator */}
                    <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        {autoSaveStatus === 'saving' ? (
                            <span className="text-amber-500 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                            </span>
                        ) : autoSaveStatus === 'saved' ? (
                            <span className="text-emerald-500 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Cambios guardados
                            </span>
                        ) : autoSaveStatus === 'dirty' ? (
                            <span className="text-muted-foreground opacity-50 italic">
                                Editando...
                            </span>
                        ) : autoSaveStatus === 'error' ? (
                            <span className="text-red-500">
                                Error al guardar
                            </span>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-1 border-l border-border pl-4">
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDownloadMenu(!showDownloadMenu);
                                }}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Exportar / Descargar"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            {showDownloadMenu && (
                                <div
                                    ref={downloadMenuRef}
                                    className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                                >
                                    <button
                                        onClick={() => { handleExportPDF(); setShowDownloadMenu(false); }}
                                        className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-3 text-sm"
                                    >
                                        <FileText className="w-4 h-4 text-red-500" /> PDF (Imprimir)
                                    </button>
                                    <button
                                        onClick={() => { handleExportMarkdown(); setShowDownloadMenu(false); }}
                                        className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-3 text-sm"
                                    >
                                        <FileCode className="w-4 h-4 text-primary" /> Markdown (.md)
                                    </button>
                                    <button
                                        onClick={() => { handleExportHTML(); setShowDownloadMenu(false); }}
                                        className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-3 text-sm"
                                    >
                                        <FileType className="w-4 h-4 text-amber-500" /> HTML (.html)
                                    </button>
                                </div>
                            )}
                        </div>
                        {note.id && (
                            <button
                                onClick={handleDelete}
                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                title="Eliminar Nota"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <input
                            type="file"
                            id="unileaks-image-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                            }}
                        />
                        <label
                            htmlFor="unileaks-image-upload"
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title="Insertar Imagen"
                        >
                            {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                        </label>

                        {note.id && (
                            <button
                                onClick={async () => {
                                    const url = getShareUrl('unileaks', note.id);
                                    const success = await copyToClipboard(url);
                                    if (success) showToast("UniTask", t('common.link_copied'), "success");
                                }}
                                className="p-2 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                title="Compartir Nota"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col p-10 pb-20 print:p-0">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        setAutoSaveStatus('dirty');
                    }}
                    placeholder="Título de la nota..."
                    className="w-full text-5xl font-extrabold bg-transparent border-none outline-none mb-8 text-foreground placeholder-muted-foreground placeholder-opacity-50 print:text-4xl print:mb-4"
                />

                <div className="flex-1 w-full relative">
                    {editor && (
                        <BubbleMenu
                            editor={editor}
                            className="bg-popover border border-border rounded-lg shadow-xl flex items-center divide-x divide-border overflow-hidden"
                        >
                            <button
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                className={cn("px-3 py-1.5 text-sm font-bold hover:bg-muted transition-colors", editor.isActive('bold') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                                title="Negrita"
                            >
                                B
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                className={cn("px-3 py-1.5 text-sm font-serif italic hover:bg-muted transition-colors", editor.isActive('italic') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                                title="Cursiva"
                            >
                                I
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                className={cn("px-3 py-1.5 text-sm font-medium line-through hover:bg-muted transition-colors", editor.isActive('strike') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                                title="Tachado"
                            >
                                S
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={cn("px-3 py-1.5 text-sm font-bold hover:bg-muted transition-colors", editor.isActive('heading', { level: 2 }) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                                title="Título 2"
                            >
                                H2
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                className={cn("px-3 py-2 text-sm hover:bg-muted transition-colors", editor.isActive('bulletList') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                                title="Lista de viñetas"
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                className={cn("px-3 py-2 text-sm hover:bg-muted transition-colors", editor.isActive('blockquote') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                                title="Cita"
                            >
                                <MessageSquareQuote className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleCode().run()}
                                className={cn("px-3 py-2 text-sm hover:bg-muted transition-colors", editor.isActive('code') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                                title="Código"
                            >
                                <Code className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleAddToDictionaryFromSelection}
                                title="Añadir al diccionario"
                                className="px-3 py-2 text-sm hover:bg-muted text-emerald-500 transition-colors"
                            >
                                <BookMarked className="w-4 h-4" />
                            </button>
                        </BubbleMenu>
                    )}
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

                    {/* Spell Check Popover - intercepts right-click on words */}
                    <SpellCheckPopover
                        editor={editor ?? null}
                        tenantId={currentTenantId ?? null}
                        userId={user?.uid ?? null}
                        language={language}
                        verifiedWords={verifiedWords}
                        onAddToDictionary={handleAddWordToDictionary}
                    />
                </div>
            </div>
        </div>
    );
}
