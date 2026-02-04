"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';
import { useFileUploader } from '@/hooks/useFileUploader';
import { useToast } from '@/context/ToastContext';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
    storagePath?: string; // Enable image uploads if provided
}

export default function RichTextEditor({ content, onChange, placeholder, className, storagePath }: RichTextEditorProps) {
    const { uploadFile } = useFileUploader();
    const { showToast } = useToast();

    const handleImageUpload = async (file: File) => {
        if (!storagePath) return;

        showToast("Editor", "Uploading image...", "info");
        try {
            const result = await uploadFile(file, storagePath);
            if (result && editor) {
                editor.chain().focus().setImage({ src: result.url }).run();
                showToast("Editor", "Image uploaded", "success");
            } else {
                showToast("Editor", "Upload failed", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Editor", "Upload error", "error");
        }
    };

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder || 'Write something...',
            }),
            Image.configure({
                inline: true,
                allowBase64: true, // Fallback
            })
        ],
        content: content,
        editorProps: {
            attributes: {
                class: `prose prose-sm prose-invert max-w-none focus:outline-none min-h-[150px] p-4 ${className}`,
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image/') && storagePath) {
                        event.preventDefault(); // Prevent default browser drop
                        handleImageUpload(file);
                        return true;
                    }
                }
                return false;
            },
            handlePaste: (view, event, slice) => {
                const items = event.clipboardData?.items;
                if (items) {
                    for (const item of items) {
                        if (item.type.startsWith('image/') && item.kind === 'file' && storagePath) {
                            const file = item.getAsFile();
                            if (file) {
                                event.preventDefault(); // Prevent default paste (which might be base64)
                                handleImageUpload(file);
                                return true;
                            }
                        }
                    }
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            // New: We MUST return HTML to store the <img> tags.
            // Text-only mode kills the images.
            // Using getHTML() is safe as long as the content is sanitized on display (Tiptap handles XSS mostly)
            // But we need to ensure backward compatibility for old text notes.
            onChange(editor.getHTML());
        },
    });

    // Sync content if it changes externally (e.g. tab switch)
    // Sync content if it changes externally (e.g. tab switch)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
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
