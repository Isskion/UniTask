"use client";

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Loader2, FileText, Download, ExternalLink } from 'lucide-react';

export default function ManualViewer() {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    useEffect(() => {
        fetch('/MANUAL_USUARIO.md')
            .then(res => res.text())
            .then(text => {
                setContent(text);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading manual:', err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="px-8 py-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Manual de Usuario</h2>
                        <p className="text-xs text-muted-foreground">Documentación oficial del sistema</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="/UniTask_Manual_Usuario.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Descargar PDF
                    </a>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-8 py-10 overflow-y-auto custom-scrollbar">
                <div className={cn(
                    "max-w-4xl mx-auto prose prose-sm md:prose-base dark:prose-invert",
                    "prose-headings:font-bold prose-h1:text-4xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:border-b prose-h2:border-border prose-h2:pb-2",
                    "prose-p:text-muted-foreground prose-p:leading-relaxed",
                    "prose-li:text-muted-foreground prose-strong:text-foreground prose-strong:font-semibold",
                    "prose-hr:border-border prose-hr:my-12"
                )}>
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>

                {/* Footer Gradient */}
                <div className="h-20" />
            </div>
        </div>
    );
}
