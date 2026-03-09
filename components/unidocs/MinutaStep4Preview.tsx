"use client";

// UniDocs V2.4 — Paso 4: Previsualización y exportación
// Reutiliza buildPrintHtml y buildWordHtml de la lib compartida.
// Minuta efímera — no se guarda en Firestore (Fase 1).

import { useRef, useEffect, useState } from "react";
import { UniDocsTemplate, UniDocsMinuta, MinutaContext } from "@/types/unidocs";
import { buildPrintHtml, buildWordHtml } from "@/lib/unidocs-print";
import { Printer, Download, ChevronLeft, X, Loader2 } from "lucide-react";

interface MinutaStep4PreviewProps {
    minuta: UniDocsMinuta;
    bodyTemplate: UniDocsTemplate;
    coverTemplate: UniDocsTemplate | null;
    tenantLogo: string | null;
    clientLogo: string | null;
    minutaContext: MinutaContext;
    onBack: () => void;
    onClose: () => void;
}

export default function MinutaStep4Preview({
    minuta,
    bodyTemplate,
    coverTemplate,
    tenantLogo,
    clientLogo,
    minutaContext,
    onBack,
    onClose,
}: MinutaStep4PreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        const html = buildPrintHtml(
            bodyTemplate,
            minuta.title,
            minuta.editedHtml,
            tenantLogo,
            clientLogo,
            coverTemplate ?? undefined,
            minutaContext,
        );
        const blob = new Blob([html], { type: "text/html; charset=utf-8" });
        const url = URL.createObjectURL(blob);
        setBlobUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
        });
        return () => URL.revokeObjectURL(url);
    }, [minuta.editedHtml, bodyTemplate, coverTemplate, tenantLogo, clientLogo, minutaContext, minuta.title]);

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.print();
    };

    const handleWordDownload = () => {
        const wordHtml = buildWordHtml(
            bodyTemplate,
            minuta.title,
            minuta.editedHtml,
            tenantLogo,
            clientLogo,
            coverTemplate ?? undefined,
            minutaContext,
        );
        const blob = new Blob([wordHtml], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${minuta.title || "minuta"}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="shrink-0 bg-card border-b border-border flex items-center gap-2 px-4 py-2 print:hidden">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Volver al editor
                </button>

                <div className="flex-1 min-w-0 px-2">
                    <p className="text-sm font-medium text-foreground truncate">{minuta.title}</p>
                    <p className="text-xs text-muted-foreground">{bodyTemplate.name}{coverTemplate ? ` + ${coverTemplate.name}` : ""}</p>
                </div>

                <button
                    onClick={handleWordDownload}
                    className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold hover:bg-secondary/80 transition-all"
                >
                    <Download className="w-4 h-4" />
                    Word (.doc)
                </button>

                <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all"
                >
                    <Printer className="w-4 h-4" />
                    Imprimir / PDF
                </button>

                <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors ml-2">
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* iframe preview */}
            {blobUrl ? (
                <iframe
                    ref={iframeRef}
                    src={blobUrl}
                    className="flex-1 w-full border-0 bg-white"
                    title={`Previsualización: ${minuta.title}`}
                />
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    );
}
