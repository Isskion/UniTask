"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

// Preserve background-color and text color from Excel/Sheets paste
const StyledTableCell = TableCell.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            backgroundColor: {
                default: null,
                parseHTML: el => el.style.backgroundColor || el.getAttribute('bgcolor') || null,
                renderHTML: attrs => attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}` } : {},
            },
            textColor: {
                default: null,
                parseHTML: el => el.style.color || null,
                renderHTML: attrs => attrs.textColor ? { style: `color: ${attrs.textColor}` } : {},
            },
        };
    },
    renderHTML({ HTMLAttributes }) {
        const { backgroundColor, textColor, ...rest } = HTMLAttributes;
        const style = [
            backgroundColor ? `background-color: ${backgroundColor}` : '',
            textColor ? `color: ${textColor}` : '',
        ].filter(Boolean).join('; ');
        return ['td', { ...rest, ...(style ? { style } : {}) }, 0];
    },
});

const StyledTableHeader = TableHeader.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            backgroundColor: {
                default: null,
                parseHTML: el => el.style.backgroundColor || el.getAttribute('bgcolor') || null,
                renderHTML: attrs => attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}` } : {},
            },
            textColor: {
                default: null,
                parseHTML: el => el.style.color || null,
                renderHTML: attrs => attrs.textColor ? { style: `color: ${attrs.textColor}` } : {},
            },
        };
    },
    renderHTML({ HTMLAttributes }) {
        const { backgroundColor, textColor, ...rest } = HTMLAttributes;
        const style = [
            backgroundColor ? `background-color: ${backgroundColor}` : '',
            textColor ? `color: ${textColor}` : '',
        ].filter(Boolean).join('; ');
        return ['th', { ...rest, ...(style ? { style } : {}) }, 0];
    },
});
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import * as XLSX from 'xlsx';
import { UniLeakNote } from "@/types";
import { saveNote } from "@/lib/unileaks";
import { addTenantWord, getTenantWords } from "@/lib/dictionary";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Check, Loader2, Globe, Lock, Trash2, List, Code, MessageSquareQuote, Download, FileText, FileCode, FileType, BookMarked, ImageIcon, Share2, PaintRoller, ClipboardCopy, Plus, Minus, FileSpreadsheet } from "lucide-react";
import { getShareUrl, copyToClipboard } from "@/lib/share";
import { useLanguage } from "@/context/LanguageContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { useFileUploader } from "@/hooks/useFileUploader";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { TenantDictionary } from "@/lib/tiptap-extensions/TenantDictionary";
import { FontSize, FontFamily } from "@/lib/tiptap-extensions/Typography";
import { FoldableHeading } from "@/lib/tiptap-extensions/FoldableHeading";
import { DataTable } from "@/lib/tiptap-extensions/DataTable";
import SpellCheckPopover from "@/components/unileaks/SpellCheckPopover";
import UniDocsTemplatePickerModal from "@/components/unileaks/UniDocsTemplatePickerModal";
import UniDocsMinutaWizard from "@/components/unidocs/UniDocsMinutaWizard";
import EditorContextMenu from "@/components/unileaks/EditorContextMenu";
import BulletList from '@tiptap/extension-bullet-list';
import UniLeaksSearch from "./UniLeaksSearch";

const CustomBulletList = BulletList.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            listType: {
                default: 'disc',
                renderHTML: attributes => {
                    return {
                        'data-list-type': attributes.listType,
                    }
                },
                parseHTML: element => element.getAttribute('data-list-type'),
            },
        }
    },
});

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
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [showMinutaWizard, setShowMinutaWizard] = useState(false);
    const [verifiedWords, setVerifiedWords] = useState<string[]>([]);

    // Excel Importer State
    const [xlsxSheets, setXlsxSheets] = useState<string[]>([]);
    const [showSheetModal, setShowSheetModal] = useState(false);
    const [pendingWorkbook, setPendingWorkbook] = useState<XLSX.WorkBook | null>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);

    // Format Painter State
    const [storedFormat, setStoredFormat] = useState<{ marks: any[], attributes: any } | null>(null);
    const [painterMode, setPainterMode] = useState<'none' | 'single' | 'multiple'>('none');

    // Image Zoom State
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [nativeSize, setNativeSize] = useState<{ w: number; h: number } | null>(null);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lightboxRef = useRef<HTMLDivElement>(null);
    const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
    const hasDragged = useRef(false);

    // --- LOAD TENANT DICTIONARY ON MOUNT ---
    useEffect(() => {
        if (!currentTenantId) return;

        const loadDictionary = async () => {
            try {
                const words = await getTenantWords(currentTenantId);
                const wordStrings = words.map(w => w.word);
                console.log(`[UniLeaks] 📖 Loaded ${wordStrings.length} tenant dictionary words`);
                setVerifiedWords(wordStrings);
            } catch (error) {
                console.error("[UniLeaks] Error loading tenant dictionary:", error);
            }
        };

        loadDictionary();
    }, [currentTenantId]);

    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; word: string | null }>({
        visible: false,
        x: 0,
        y: 0,
        word: null
    });

    const currentNoteIdRef = useRef<string | null>(null);
    const isSettingContentRef = useRef<boolean>(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);

    // Image zoom: click on any img inside the editor opens the lightbox
    useEffect(() => {
        const handleImageClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') {
                const imgEl = target as HTMLImageElement;
                const src = imgEl.src;
                // Load image to get native dimensions and compute fit-to-viewport scale
                const tmpImg = new window.Image();
                tmpImg.onload = () => {
                    const vw = window.innerWidth * 0.95;
                    const vh = window.innerHeight * 0.95;
                    const fitScale = Math.min(vw / tmpImg.naturalWidth, vh / tmpImg.naturalHeight, 1);
                    setNativeSize({ w: tmpImg.naturalWidth, h: tmpImg.naturalHeight });
                    setZoomScale(fitScale);
                    setPanOffset({ x: 0, y: 0 });
                    setZoomedImage(src);
                };
                tmpImg.src = src;
            }
        };
        document.addEventListener('click', handleImageClick);
        return () => document.removeEventListener('click', handleImageClick);
    }, []);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                bulletList: false, // Disable default to use our custom one
                heading: false,    // Disable default to use our FoldableHeading
            }),
            FoldableHeading,
            CustomBulletList,
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'text-left border-collapse table-auto',
                },
            }),
            TableRow,
            StyledTableHeader,
            StyledTableCell,
            Highlight.configure({
                multicolor: true,
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-xl border border-border max-w-full h-auto my-4 shadow-lg cursor-zoom-in',
                },
            }),
            Placeholder.configure({
                placeholder: 'Escribe aquí tus ideas, reuniones, tareas... soporta Markdown!',
                emptyEditorClass: 'is-editor-empty',
            }),
            TenantDictionary,
            Extension.create({
                name: 'listIndentation',
                addKeyboardShortcuts() {
                    return {
                        Tab: () => this.editor.commands.sinkListItem('listItem'),
                        'Shift-Tab': () => this.editor.commands.liftListItem('listItem'),
                    }
                },
            }),
            FontSize,
            FontFamily,
            DataTable,
        ],
        content: note.content || "",
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[50vh]',
                spellcheck: 'true',
                lang: language,
                style: 'font-family: Garamond, serif;',
            },
            handlePaste: (view, event) => {
                const items = Array.from(event.clipboardData?.items || []);

                // Image paste (from Excel, screenshot, etc.) — always takes priority
                const imageItem = items.find(item => item.type.startsWith('image'));
                if (imageItem) {
                    event.preventDefault();
                    const file = imageItem.getAsFile();
                    if (file) {
                        handleImageUpload(file);
                        return true;
                    }
                }

                // HTML content — let TipTap handle natively
                const htmlData = event.clipboardData?.getData('text/html');
                if (htmlData && htmlData.trim().length > 0) {
                    return false;
                }

                // Plain text paste: preserve tabs, multiple spaces, and blank lines
                const plainText = event.clipboardData?.getData('text/plain');
                if (plainText && plainText.length > 0) {
                    event.preventDefault();

                    const lines = plainText.split(/\r?\n/);
                    const processedLines = lines.map(line => {
                        if (line.trim() === '') {
                            return '<br>';
                        }
                        let escaped = line
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;');
                        escaped = escaped.replace(/\t/g, '\u00a0\u00a0\u00a0\u00a0');
                        escaped = escaped.replace(/^( +)/, (match) => '\u00a0'.repeat(match.length));
                        escaped = escaped.replace(/  /g, '\u00a0 ');
                        return escaped;
                    });

                    // Join all lines with <br> inside a single <p> — matches Enter=hardBreak behavior
                    const htmlContent = `<p>${processedLines.join('<br>')}</p>`;
                    const domParser = new DOMParser();
                    const domDoc = domParser.parseFromString(`<body>${htmlContent}</body>`, 'text/html');
                    const pmParser = PMDOMParser.fromSchema(view.state.schema);
                    const slice = pmParser.parseSlice(domDoc.body);
                    view.dispatch(view.state.tr.replaceSelection(slice));

                    return true;
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
            },
            handleDOMEvents: {
                contextmenu: (view, event) => {
                    event.preventDefault();

                    // Get word under cursor
                    let word = null;
                    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                    if (pos) {
                        const $pos = view.state.doc.resolve(pos.pos);
                        const textBefore = $pos.parent.textBetween(Math.max(0, $pos.parentOffset - 20), $pos.parentOffset, undefined, "\ufffc");
                        const textAfter = $pos.parent.textBetween($pos.parentOffset, Math.min($pos.parent.content.size, $pos.parentOffset + 20), undefined, "\ufffc");

                        const wordBefore = textBefore.split(/[\s,.;:!?]/).pop() || "";
                        const wordAfter = textAfter.split(/[\s,.;:!?]/).shift() || "";
                        const fullWord = (wordBefore + wordAfter).replace(/[.,!?;:"'()[\]{}<>]/g, "");

                        if (fullWord.length >= 2) {
                            word = fullWord;
                        }
                    }

                    setContextMenu({
                        visible: true,
                        x: event.clientX,
                        y: event.clientY,
                        word
                    });
                    return true;
                }
            }
        },
        onUpdate: ({ editor }) => {
            if (!isSettingContentRef.current) {
                setContent(editor.getHTML());
                setAutoSaveStatus('dirty');
            }
        },
        onSelectionUpdate: ({ editor }) => {
            if (painterMode !== 'none' && !editor.state.selection.empty) {
                handleApplyFormat();
            }
        },
    });

    const handleCopyFormat = useCallback(() => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        const marks = editor.state.doc.slice(from, to).content.firstChild?.marks || [];
        setStoredFormat({
            marks: marks.map(m => ({ type: m.type.name, attrs: m.attrs })),
            attributes: {} // Could expand to node attributes if needed
        });
        showToast("Formato Copiado", "Haz clic en otro texto para aplicarlo.", "info");
    }, [editor, showToast]);

    const handleApplyFormat = useCallback(() => {
        if (!editor || !storedFormat) return;

        let chain = editor.chain().focus();
        storedFormat.marks.forEach(m => {
            chain = chain.setMark(m.type, m.attrs);
        });
        chain.run();

        if (painterMode === 'single') {
            setPainterMode('none');
        }
    }, [editor, storedFormat, painterMode]);

    const togglePainterMode = useCallback((mode: 'single' | 'multiple') => {
        if (painterMode === mode) {
            setPainterMode('none');
        } else {
            handleCopyFormat();
            setPainterMode(mode);
        }
    }, [painterMode, handleCopyFormat]);

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
                    style: 'font-family: Garamond, serif;',
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
        if (!editor) return;
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    @media print { @page { margin: 20mm; } }
                    * { box-sizing: border-box; }
                    body { font-family: 'Georgia', serif; line-height: 1.7; color: #1a1a1a; max-width: 800px; margin: auto; padding: 2rem; }
                    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; border-bottom: 2px solid #1a1a1a; padding-bottom: 0.5rem; }
                    h2 { font-size: 1.4rem; margin-top: 1.5rem; }
                    h3 { font-size: 1.1rem; margin-top: 1.2rem; }
                    p { margin: 0.75rem 0; }
                    ul, ol { margin: 0.75rem 0; padding-left: 1.5rem; }
                    li { margin: 0.3rem 0; }
                    blockquote { border-left: 3px solid #888; padding-left: 1rem; color: #555; margin: 1rem 0; }
                    code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; }
                    pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow: auto; }
                    img { max-width: 100%; border-radius: 6px; }
                    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
                    th { background: #f0f0f0; font-weight: 600; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 1.5rem 0;">
                ${editor.getHTML()}
            </body>
            </html>`;

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            showToast('Error', 'El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.', 'error');
            return;
        }
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    const triggerDownload = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Descargado', `${filename} descargado correctamente.`, 'success');
    };

    const handleExportMarkdown = () => {
        if (!editor) return;
        const html = editor.getHTML();
        const contentMd = html
            .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        triggerDownload(`# ${title}\n\n${contentMd}`, `${title || 'nota'}.md`, 'text/markdown;charset=utf-8');
    };

    const handleExportHTML = () => {
        if (!editor) return;
        const htmlContent = `<!DOCTYPE html>
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
</html>`;
        triggerDownload(htmlContent, `${title || 'nota'}.html`, 'text/html;charset=utf-8');
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

    // --- EXCEL IMPORTER ---
    const importSheetToEditor = useCallback((workbook: XLSX.WorkBook, sheetName: string) => {
        if (!editor) return;
        const sheet = workbook.Sheets[sheetName];
        const allRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
        if (!allRows.length) return;

        const [headerRow, ...dataRows] = allRows;
        const headers = headerRow.map(c => String(c ?? ''));
        const rows = dataRows.map(row => headers.map((_, i) => String(row[i] ?? '')));

        editor.chain().focus().insertContent({
            type: 'dataTable',
            attrs: { headers, rows },
        }).run();
        setAutoSaveStatus('dirty');
        setShowSheetModal(false);
        setPendingWorkbook(null);
        setXlsxSheets([]);
    }, [editor]);

    const handleExcelFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const reader = new FileReader();
        reader.onload = (ev) => {
            const data = ev.target?.result;
            if (!data) return;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheets = workbook.SheetNames;
            if (sheets.length === 1) {
                importSheetToEditor(workbook, sheets[0]);
            } else {
                setPendingWorkbook(workbook);
                setXlsxSheets(sheets);
                setShowSheetModal(true);
            }
        };
        reader.readAsArrayBuffer(file);
    }, [importSheetToEditor]);

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
                    <UniLeaksSearch scope="form" contextId={note.id} />
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
                        {/* Nueva Minuta — wizard multi-nota */}
                        {note.projectId && (note.tenantId || currentTenantId) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setShowDownloadMenu(false);
                                    setShowMinutaWizard(true);
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Nueva Minuta de Cliente"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Minuta
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log('[UniDocs] Template picker button clicked, opening modal...');
                                setShowDownloadMenu(false);
                                setShowTemplatePicker(true);
                            }}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Imprimir con Plantilla UniDocs"
                        >
                            <BookMarked className="w-5 h-5" />
                        </button>
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

                        {/* Excel Importer */}
                        <input
                            ref={excelInputRef}
                            type="file"
                            id="unileaks-excel-upload"
                            className="hidden"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleExcelFile}
                        />
                        <label
                            htmlFor="unileaks-excel-upload"
                            className="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Importar tabla desde Excel"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
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
                                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                className={cn("px-3 py-1.5 text-sm font-bold hover:bg-muted transition-colors", editor.isActive('heading', { level: 1 }) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                                title="Título 1"
                            >
                                H1
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
                            <button
                                onClick={() => togglePainterMode('single')}
                                onDoubleClick={() => togglePainterMode('multiple')}
                                title="Copiar Formato (Doble clic para modo múltiple)"
                                className={cn(
                                    "px-3 py-2 text-sm hover:bg-muted transition-colors",
                                    painterMode !== 'none' ? "bg-amber-500 text-white" : "text-amber-600"
                                )}
                            >
                                <PaintRoller className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1 px-2 border-l border-border bg-muted/20">
                                <select
                                    onChange={(e) => {
                                        (editor.chain().focus() as any).setFontFamily(e.target.value).run();
                                    }}
                                    value={editor.getAttributes('fontFamily').font || 'Garamond'}
                                    className="bg-transparent text-[11px] font-medium focus:outline-none cursor-pointer h-full py-1 min-w-[80px]"
                                >
                                    <option value="Garamond">Garamond</option>
                                    <option value="Inter">Inter</option>
                                    <option value="Arial">Arial</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Courier New">Courier New</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1 px-2 border-l border-border bg-muted/20">
                                <button
                                    onClick={() => {
                                        const current = parseInt(editor.getAttributes('fontSize').size || '16');
                                        (editor.chain().focus() as any).setFontSize(`${Math.max(8, current - 2)}px`).run();
                                    }}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                >
                                    <Minus className="w-3 h-3 text-muted-foreground" />
                                </button>
                                <span className="text-[10px] font-bold min-w-[20px] text-center">
                                    {parseInt(editor.getAttributes('fontSize').size || '16')}
                                </span>
                                <button
                                    onClick={() => {
                                        const current = parseInt(editor.getAttributes('fontSize').size || '16');
                                        (editor.chain().focus() as any).setFontSize(`${Math.min(72, current + 2)}px`).run();
                                    }}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                >
                                    <Plus className="w-3 h-3 text-muted-foreground" />
                                </button>
                            </div>
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
                            "[&_pre]:bg-zinc-950 [&_pre]:text-zinc-50 [&_pre_code]:text-zinc-50 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
                            // Custom list styles based on data-list-type
                            "[&_ul[data-list-type='square']]:list-square",
                            "[&_ul[data-list-type='dash']]:list-none [&_ul[data-list-type='dash']>li]:before:content-['-\\2003'] [&_ul[data-list-type='dash']>li]:before:mr-1",
                            "[&_ul[data-list-type='arrow']]:list-none [&_ul[data-list-type='arrow']>li]:before:content-['\\2192\\2003'] [&_ul[data-list-type='arrow']>li]:before:mr-1",
                            "[&_ul[data-list-type='disc']]:list-disc"
                        )}
                    />

                    {/* Spell Check Popover - dictionary on hover */}
                    <SpellCheckPopover
                        editor={editor ?? null}
                        tenantId={currentTenantId ?? null}
                        userId={user?.uid ?? null}
                        language={language}
                        verifiedWords={verifiedWords}
                        onAddToDictionary={handleAddWordToDictionary}
                    />

                    {/* Custom Context Menu - formatting tools on right-click */}
                    {editor && (
                        <EditorContextMenu
                            editor={editor}
                            visible={contextMenu.visible}
                            x={contextMenu.x}
                            y={contextMenu.y}
                            wordUnderCursor={contextMenu.word}
                            onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                            onAddToDictionary={handleAddWordToDictionary}
                            canPasteFormat={!!storedFormat}
                            onCopyFormat={handleCopyFormat}
                            onPasteFormat={handleApplyFormat}
                        />
                    )}
                </div>
            </div>

            {/* UniDocs Template Picker Modal */}
            {showTemplatePicker && editor && (
                <UniDocsTemplatePickerModal
                    noteTitle={title}
                    noteHtml={editor.getHTML()}
                    projectId={note.projectId}
                    tenantId={note.tenantId || currentTenantId || undefined}
                    onClose={() => setShowTemplatePicker(false)}
                />
            )}

            {/* UniDocs Minuta Wizard */}
            {showMinutaWizard && note.projectId && (note.tenantId || currentTenantId) && (
                <UniDocsMinutaWizard
                    projectId={note.projectId}
                    folderId={note.folderId ?? null}
                    tenantId={(note.tenantId || currentTenantId)!}
                    onClose={() => setShowMinutaWizard(false)}
                />
            )}

            {/* Image Lightbox */}
            {/* Sheet Selector Modal */}
            {showSheetModal && pendingWorkbook && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                    onClick={() => { setShowSheetModal(false); setPendingWorkbook(null); setXlsxSheets([]); }}
                >
                    <div
                        className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-bold text-sm">Selecciona una hoja</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">El archivo tiene varias hojas. ¿Cuál quieres importar?</p>
                        <div className="flex flex-col gap-2">
                            {xlsxSheets.map((sheet) => (
                                <button
                                    key={sheet}
                                    onClick={() => importSheetToEditor(pendingWorkbook, sheet)}
                                    className="w-full text-left px-4 py-2.5 rounded-xl border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors text-sm font-medium"
                                >
                                    {sheet}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => { setShowSheetModal(false); setPendingWorkbook(null); setXlsxSheets([]); }}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {zoomedImage && (
                <div
                    ref={lightboxRef}
                    className="fixed inset-0 z-[9999] bg-black/85 overflow-hidden"
                    style={{ cursor: isDragging ? 'grabbing' : zoomScale > 1 ? 'grab' : 'zoom-in' }}
                    onClick={() => { if (!hasDragged.current) setZoomedImage(null); hasDragged.current = false; }}
                    onWheel={(e) => {
                        e.preventDefault();
                        const rect = lightboxRef.current!.getBoundingClientRect();
                        const mouseX = e.clientX - rect.left - rect.width / 2;
                        const mouseY = e.clientY - rect.top - rect.height / 2;
                        const factor = e.deltaY < 0 ? 1.12 : 0.9;
                        const newScale = Math.min(30, Math.max(0.5, zoomScale * factor));
                        const ratio = newScale / zoomScale;
                        setPanOffset(prev => ({
                            x: mouseX + ratio * (prev.x - mouseX),
                            y: mouseY + ratio * (prev.y - mouseY),
                        }));
                        setZoomScale(newScale);
                    }}
                    onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        hasDragged.current = false;
                        setIsDragging(true);
                        dragStart.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
                    }}
                    onMouseMove={(e) => {
                        if (!isDragging || !dragStart.current) return;
                        hasDragged.current = true;
                        setPanOffset({
                            x: dragStart.current.ox + (e.clientX - dragStart.current.x),
                            y: dragStart.current.oy + (e.clientY - dragStart.current.y),
                        });
                    }}
                    onMouseUp={() => { setIsDragging(false); dragStart.current = null; }}
                    onMouseLeave={() => { setIsDragging(false); dragStart.current = null; }}
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <img
                            src={zoomedImage}
                            alt="Imagen ampliada"
                            className="rounded-xl shadow-2xl"
                            style={{
                                width: nativeSize ? nativeSize.w : 'auto',
                                height: nativeSize ? nativeSize.h : 'auto',
                                maxWidth: 'none',
                                maxHeight: 'none',
                                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                                transformOrigin: 'center center',
                                transition: isDragging ? 'none' : 'transform 0.06s ease-out',
                                userSelect: 'none',
                                imageRendering: zoomScale > 2 ? 'pixelated' : 'auto',
                            }}
                            draggable={false}
                        />
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button
                            className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full hover:bg-black/80 transition-colors"
                            onClick={() => { setZoomScale(1); setPanOffset({ x: 0, y: 0 }); }}
                        >Reset</button>
                        <button
                            className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full hover:bg-black/80 transition-colors"
                            onClick={() => setZoomedImage(null)}
                        >✕ Cerrar</button>
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                        {Math.round(zoomScale * 100)}% · Rueda = zoom · Drag = mover
                    </div>
                </div>
            )}
        </div>
    );
}
