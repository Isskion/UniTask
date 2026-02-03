"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, FileText, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// PDF.js Imports
// We allow dynamic import to avoid SSR issues
import * as pdfjsLib from 'pdfjs-dist';

// IMPORTANT: Set worker source
// This path depends on your Next.js public/static setup. 
// For standard installs, usually we need to point to a CDN or a local copy in public.
// Using CDN for reliability in this environment.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFScannerProps {
    onExtractComplete: (data: { text: string; pageCount: number; fileName: string; size: number }) => void;
    onCancel: () => void;
    className?: string;
}

export function PDFScanner({ onExtractComplete, onCancel, className }: PDFScannerProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'processing' | 'error' | 'success'>('idle');
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setErrorMessage("Por favor, selecciona un archivo PDF.");
            setStatus('error');
            return;
        }

        processFile(file);
    };

    const processFile = async (file: File) => {
        setStatus('loading');
        setErrorMessage(null);
        setProgress({ current: 0, total: 0 });

        try {
            const arrayBuffer = await file.arrayBuffer();

            // Load PDF
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            const totalPages = pdf.numPages;
            setProgress({ current: 0, total: totalPages });
            setStatus('processing');

            let fullText = "";

            // Process page by page
            for (let i = 1; i <= totalPages; i++) {
                try {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');

                    fullText += `\n--- Page ${i} ---\n${pageText}\n`;

                    // Update progress
                    setProgress({ current: i, total: totalPages });

                    // Yield to event loop to allow UI updates (prevents freezing)
                    await new Promise(resolve => setTimeout(resolve, 10));

                } catch (pageError) {
                    console.error(`Error parsing page ${i}`, pageError);
                    fullText += `\n--- Page ${i} (Error parsing) ---\n`;
                }
            }

            setStatus('success');

            // Short delay to show 100% completion before closing
            setTimeout(() => {
                onExtractComplete({
                    text: fullText,
                    pageCount: totalPages,
                    fileName: file.name,
                    size: file.size
                });
            }, 500);

        } catch (error: any) {
            console.error("PDF Scan Error", error);
            setStatus('error');
            setErrorMessage(error.message || "Error al leer el archivo PDF.");
        }
    };

    return (
        <div className={cn("border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all bg-card/50", className)}>

            {status === 'idle' && (
                <>
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3">
                        <FileText className="w-6 h-6 text-indigo-500" />
                    </div>
                    <h3 className="font-bold text-sm">Escanear Contenido de PDF</h3>
                    <p className="text-xs text-muted-foreground text-center mt-1 mb-4 max-w-xs">
                        Extrae el texto automáticamente sin subir el archivo. Ideal para análisis y checklists.
                    </p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold text-xs transition-all shadow-lg shadow-indigo-500/20"
                    >
                        Seleccionar PDF
                    </button>
                    <button onClick={onCancel} className="mt-4 text-[10px] text-muted-foreground hover:text-foreground">
                        Cancelar
                    </button>
                </>
            )}

            {(status === 'loading' || status === 'processing') && (
                <div className="w-full max-w-sm flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                    <div className="w-full flex justify-between text-xs font-bold mb-2">
                        <span>Procesando...</span>
                        <span>{progress.current} / {progress.total} páginas</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                            style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-center animate-pulse">
                        Esto puede tardar unos segundos para documentos grandes.
                    </p>
                </div>
            )}

            {status === 'success' && (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <h3 className="font-bold text-green-600">¡Completado!</h3>
                    <p className="text-xs text-muted-foreground">Procesando datos...</p>
                </div>
            )}

            {status === 'error' && (
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="font-bold text-red-600 mb-1">Error al escanear</h3>
                    <p className="text-xs text-muted-foreground text-center mb-4 max-w-xs">
                        {errorMessage}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-full text-xs font-medium border hover:bg-muted"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded-full text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
            />
        </div>
    );
}
