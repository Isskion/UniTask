"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

export default function RichTextEditor({ content, onChange, placeholder, className }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder || 'Write something...',
            }),
        ],
        content: content, // Initial content
        editorProps: {
            attributes: {
                class: `prose prose-sm prose-invert max-w-none focus:outline-none min-h-[150px] p-4 ${className}`,
            },
        },
        onUpdate: ({ editor }) => {
            // We return HTML or Text depending on needs. For now, pure text for compatibility with `smartParser`, 
            // but eventually HTML for rich storage.
            // Using getText() strictly for now to avoid HTML soup in legacy fields.
            // TODO: Switch to getHTML() when we fully migrate to 'Update Objects' rich content.
            onChange(editor.getText());
        },
    });

    // Sync content if it changes externally (e.g. tab switch)
    useEffect(() => {
        if (editor && content !== editor.getText()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div className="border border-white/10 rounded-xl bg-black/20 overflow-hidden focus-within:border-white/30 transition-colors">
            {/* Toolbar could go here */}
            <EditorContent editor={editor} />
        </div>
    );
}
