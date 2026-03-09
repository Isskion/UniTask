"use client";

// UniDocs V2.4 — Paso 2: Revisión IA (opcional)
// Pregunta al usuario si quiere revisar con Gemini.
// Si acepta → spinner → HTML revisado reemplaza el rawHtml.
// Si rechaza → pasa directo con rawHtml.

import { useState } from "react";
import { UniDocsMinuta } from "@/types/unidocs";
import { reviewMinutaWithGemini, NoteInput } from "@/app/actions/unidocs-gemini";
import { Loader2, Sparkles, ChevronRight, ChevronLeft, CheckCircle, XCircle } from "lucide-react";

interface MinutaStep2AIReviewProps {
    minuta: UniDocsMinuta;
    projectName: string;
    onChange: (updates: Partial<UniDocsMinuta>) => void;
    onNext: () => void;
    onBack: () => void;
}

// Build NoteInput array from ordered notes (with title, content, date metadata)
function buildNoteInputs(minuta: UniDocsMinuta): NoteInput[] {
    return minuta.orderedNoteIds
        .map(id => minuta.notes.find(n => n.id === id))
        .filter(Boolean)
        .map(note => ({
            title: note!.title || "Sin título",
            content: note!.content || "",
            date: note!.updatedAt
                ? (typeof note!.updatedAt.toDate === 'function'
                    ? note!.updatedAt.toDate().toLocaleDateString('es-ES')
                    : String(note!.updatedAt))
                : undefined,
        }));
}

type ReviewState = "idle" | "loading" | "done" | "error" | "skipped";

export default function MinutaStep2AIReview({
    minuta,
    projectName,
    onChange,
    onNext,
    onBack,
}: MinutaStep2AIReviewProps) {
    const [reviewState, setReviewState] = useState<ReviewState>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleReviewWithAI = async () => {
        setReviewState("loading");
        setErrorMsg(null);
        try {
            const noteInputs = buildNoteInputs(minuta);
            const result = await reviewMinutaWithGemini(noteInputs, projectName);
            if (result.error) {
                setErrorMsg(result.error);
                setReviewState("error");
            } else {
                onChange({ aiHtml: result.html, editedHtml: result.html });
                setReviewState("done");
            }
        } catch (e: any) {
            setErrorMsg(e.message || "Error inesperado al contactar con Gemini.");
            setReviewState("error");
        }
    };

    const handleSkip = () => {
        onChange({ aiHtml: null, editedHtml: minuta.rawHtml });
        setReviewState("skipped");
        onNext();
    };

    const handleContinueAfterReview = () => {
        onNext();
    };

    const handleRetry = () => {
        setReviewState("idle");
        setErrorMsg(null);
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-lg">

                {/* Idle: ask the user */}
                {reviewState === "idle" && (
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground mb-2">¿Revisar con Gemini?</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Gemini analizará las notas seleccionadas, eliminará duplicados, unificará el tono y generará una minuta profesional estructurada.
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">Este paso es opcional — puedes continuar con el contenido bruto si lo prefieres.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={handleSkip}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold hover:bg-secondary/80 transition-all"
                            >
                                <XCircle className="w-4 h-4" />
                                No, continuar sin revisar
                            </button>
                            <button
                                onClick={handleReviewWithAI}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all"
                            >
                                <Sparkles className="w-4 h-4" />
                                Sí, revisar con IA
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading: Gemini is working */}
                {reviewState === "loading" && (
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground mb-2">Gemini revisando...</h3>
                            <p className="text-sm text-muted-foreground">Analizando las notas y redactando la minuta. Puede tardar unos segundos.</p>
                        </div>
                    </div>
                )}

                {/* Done: review complete */}
                {reviewState === "done" && (
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground mb-2">Revisión completada</h3>
                            <p className="text-sm text-muted-foreground">Gemini ha generado la minuta. Puedes revisarla y editarla en el siguiente paso.</p>
                        </div>
                        <button
                            onClick={handleContinueAfterReview}
                            className="flex items-center justify-center gap-2 mx-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
                        >
                            Continuar al editor <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Error */}
                {reviewState === "error" && (
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-destructive" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground mb-2">Error al contactar con Gemini</h3>
                            <p className="text-sm text-muted-foreground">{errorMsg}</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={handleRetry}
                                className="px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-bold hover:bg-secondary/80 transition-all"
                            >
                                Reintentar
                            </button>
                            <button
                                onClick={handleSkip}
                                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
                            >
                                Continuar sin IA
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Back button (only in idle/error) */}
            {(reviewState === "idle" || reviewState === "error") && (
                <button
                    onClick={onBack}
                    className="absolute bottom-6 left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" /> Volver
                </button>
            )}
        </div>
    );
}
