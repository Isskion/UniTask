"use client";

// UniDocs V2.4 — Paso 3: Editor de contenido
// TipTap ligero — solo extensiones necesarias para revisión de minutas.

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { UniDocsMinuta } from "@/types/unidocs";
import { ChevronLeft, ChevronRight, Bold, Italic, List, Heading2, Heading3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MinutaStep3EditorProps {
    minuta: UniDocsMinuta;
    onChange: (updates: Partial<UniDocsMinuta>) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function MinutaStep3Editor({
    minuta,
    onChange,
    onNext,
    onBack,
}: MinutaStep3EditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                bulletList: {},
                orderedList: {},
                bold: {},
                italic: {},
            }),
            Table.configure({ resizable: false }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: minuta.editedHtml,
        onUpdate: ({ editor }) => {
            onChange({ editedHtml: editor.getHTML() });
        },
    });

    // Sync content when aiHtml changes (e.g. coming back from step 2)
    useEffect(() => {
        if (editor && minuta.editedHtml && editor.getHTML() !== minuta.editedHtml) {
            editor.commands.setContent(minuta.editedHtml, { emitUpdate: false });
        }
    }, [minuta.editedHtml]);

    const toolbarButton = (
        label: string,
        icon: React.ReactNode,
        onClick: () => void,
        isActive: boolean,
    ) => (
        <button
            onClick={onClick}
            className={cn(
                "p-1.5 rounded text-sm transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            title={label}
        >
            {icon}
        </button>
    );

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="shrink-0 border-b border-border bg-card px-4 py-2 flex items-center gap-1">
                {editor && (
                    <>
                        {toolbarButton("Título H2", <Heading2 className="w-4 h-4" />,
                            () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                            editor.isActive("heading", { level: 2 })
                        )}
                        {toolbarButton("Título H3", <Heading3 className="w-4 h-4" />,
                            () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
                            editor.isActive("heading", { level: 3 })
                        )}
                        <div className="w-px h-5 bg-border mx-1" />
                        {toolbarButton("Negrita", <Bold className="w-4 h-4" />,
                            () => editor.chain().focus().toggleBold().run(),
                            editor.isActive("bold")
                        )}
                        {toolbarButton("Cursiva", <Italic className="w-4 h-4" />,
                            () => editor.chain().focus().toggleItalic().run(),
                            editor.isActive("italic")
                        )}
                        <div className="w-px h-5 bg-border mx-1" />
                        {toolbarButton("Lista", <List className="w-4 h-4" />,
                            () => editor.chain().focus().toggleBulletList().run(),
                            editor.isActive("bulletList")
                        )}
                    </>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                    {minuta.aiHtml ? "Revisado por IA" : "Contenido original"}
                </span>
            </div>

            {/* Editor area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto py-8 px-6">
                    <style>{`
                        .minuta-editor .tiptap table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 0.75em 0;
                            font-size: 0.85em;
                        }
                        .minuta-editor .tiptap th,
                        .minuta-editor .tiptap td {
                            border: 1px solid hsl(var(--border));
                            padding: 6px 10px;
                            text-align: left;
                            vertical-align: top;
                        }
                        .minuta-editor .tiptap th {
                            background: hsl(var(--secondary) / 0.6);
                            font-weight: bold;
                            white-space: nowrap;
                        }
                        .minuta-editor .tiptap tr:nth-child(even) td {
                            background: hsl(var(--secondary) / 0.2);
                        }
                        .minuta-editor .tiptap .selectedCell {
                            background: hsl(var(--primary) / 0.15) !important;
                        }
                    `}</style>
                    <EditorContent
                        editor={editor}
                        className="minuta-editor prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px]"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-card px-6 py-4 flex justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Volver
                </button>
                <button
                    onClick={onNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
                >
                    Previsualizar documento <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
