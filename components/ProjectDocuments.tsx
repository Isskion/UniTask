"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, orderBy } from "firebase/firestore";
import { Project, DocumentType, UserProfile } from "@/types";
import { PDFScanner } from "./PDFScanner";
import { FileText, CheckCircle2, AlertCircle, Loader2, Trash2, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { format } from "date-fns";

interface ProjectDocumentsProps {
    project: Project;
    tenantId: string;
}

interface ProjectDocument {
    id: string;
    name: string;
    url?: string; // Optional (legacy)
    content?: string; // Extracted Text
    pageCount?: number;
    type: string; // MIME
    size: number;
    typeId?: string; // Link to DocumentType
    typeCode?: string; // Snapshot
    uploadedBy: string;
    uploadedByName?: string;
    uploadedAt: any;
}

export function ProjectDocuments({ project, tenantId }: ProjectDocumentsProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
    const [documents, setDocuments] = useState<ProjectDocument[]>([]);
    const [uploadingType, setUploadingType] = useState<string | null>(null); // To track which item is being uploaded
    const [viewingDoc, setViewingDoc] = useState<ProjectDocument | null>(null); // For Text Preview Modal

    useEffect(() => {
        loadData();
    }, [project.id, tenantId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Master Data Types
            const typesQ = query(
                collection(db, "document_types"),
                where("tenantId", "==", tenantId),
                where("isActive", "==", true)
                // orderBy("code") // Removed for safety during index creation
            );
            const typesSnap = await getDocs(typesQ);
            const loadedTypes = typesSnap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentType));
            setDocTypes(loadedTypes.sort((a, b) => a.code.localeCompare(b.code)));

            // 2. Fetch Project Documents
            const docsQ = query(
                collection(db, "projects", project.id, "documents"),
                where("tenantId", "==", tenantId), // CRITICAL: Must match security rules
                orderBy("uploadedAt", "desc") // Re-enable orderBy now that we have refined the query (might need index)
            );
            const docsSnap = await getDocs(docsQ);
            setDocuments(docsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectDocument)));

        } catch (e) {
            console.error("Error loading project docs:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleScanComplete = async (data: { text: string; pageCount: number; fileName: string; size: number }, typeId?: string) => {
        if (!user) return;

        try {
            const docType = docTypes.find(t => t.id === typeId);

            const newDoc = {
                name: data.fileName,
                // url: "", // No URL, pure text
                content: data.text,
                pageCount: data.pageCount,
                type: "application/pdf (parsed)",
                size: data.size,
                typeId: typeId || null,
                typeCode: docType?.code || "GENERIC",
                uploadedBy: user.uid,
                uploadedByName: user.displayName || "User",
                uploadedAt: serverTimestamp(),
                tenantId: tenantId // CRITICAL for Security Rules
            };

            await addDoc(collection(db, "projects", project.id, "documents"), newDoc);

            showToast("Documentos", "Texto extraído y guardado correctamente", "success");
            setUploadingType(null);
            loadData(); // Refresh

        } catch (e) {
            console.error("Error saving doc metadata:", e);
            showToast("Error", "No se pudo guardar la información extraída", "error");
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm("¿Seguro que quieres eliminar este documento?")) return;
        try {
            await deleteDoc(doc(db, "projects", project.id, "documents", docId));
            showToast("Papelera", "Documento eliminado", "success");
            loadData();
        } catch (e) {
            showToast("Error", "No se pudo eliminar", "error");
        }
    };

    // Filter Logic
    const checklistTypes = docTypes.filter(t => t.isProjectChecklist);
    const otherDocs = documents.filter(d => !d.typeId || !checklistTypes.find(t => t.id === d.typeId));

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* 1. CHECKLIST SECTION */}
            <div className="bg-card/50 border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-muted/20 flex justify-between items-start">
                    <div>
                        <h3 className="font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                            Checklist de Proyecto
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">Documentación requerida para este proyecto.</p>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {checklistTypes.length === 0 && (
                        <div className="p-6 text-center text-muted-foreground text-sm italic">
                            No hay requisitos definidos en Tipos de Documento.
                        </div>
                    )}

                    {checklistTypes.map(type => {
                        // Find matching doc(s)
                        const matches = documents.filter(d => d.typeId === type.id);
                        const isComplete = matches.length > 0;

                        return (
                            <div key={type.id} className={cn("p-4 flex flex-col md:flex-row gap-4 md:items-center transition-colors", isComplete ? "bg-green-500/5" : "hover:bg-muted/30")}>
                                {/* Status Icon */}
                                <div className="shrink-0 pt-1 md:pt-0">
                                    {isComplete ? (
                                        <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-600 flex items-center justify-center animate-pulse">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                            {type.code}
                                        </span>
                                        <span className={cn("font-medium", isComplete ? "text-foreground" : "text-orange-600 font-bold")}>
                                            {type.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{type.description || "Documento requerido"}</p>

                                    {/* Matches List */}
                                    {matches.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {matches.map(doc => (
                                                <button
                                                    key={doc.id}
                                                    onClick={() => setViewingDoc(doc)}
                                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-background border text-xs hover:text-primary hover:border-primary transition-all group"
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    <span className="truncate max-w-[150px]">{doc.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">({doc.pageCount} págs)</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Action */}
                                <div className="shrink-0 flex items-center gap-2">
                                    {uploadingType === type.id ? (
                                        <div className="w-80">
                                            <PDFScanner
                                                onExtractComplete={(data) => handleScanComplete(data, type.id)}
                                                onCancel={() => setUploadingType(null)}
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setUploadingType(type.id)}
                                            className={cn("px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-2",
                                                isComplete
                                                    ? "bg-transparent border-border text-muted-foreground hover:bg-muted"
                                                    : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
                                            )}
                                        >
                                            {isComplete ? "Escanear otro" : "Escanear PDF"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 2. OTHER DOCUMENTS */}
            {otherDocs.length > 0 && (
                <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-5 h-5" /> Otros Documentos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherDocs.map(doc => (
                            <div key={doc.id} className="bg-card border rounded-lg p-3 flex gap-3 group hover:border-primary/50 transition-all">
                                <div className="shrink-0 w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <a href={doc.url} target="_blank" rel="noreferrer" className="block font-medium text-sm truncate hover:text-primary hover:underline">
                                        {doc.name}
                                    </a>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                                        <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                                        <span>•</span>
                                        <span>{doc.uploadedAt ? format(doc.uploadedAt.toDate(), "dd/MM/yyyy") : "?"}</span>
                                    </div>
                                    <div className="text-[10px] text-indigo-400 mt-0.5">
                                        Subido por {doc.uploadedByName}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDelete(doc.id)} className="p-1 hover:text-red-500 transition-colors" title="Eliminar">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal for Viewing Text */}
            {viewingDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{viewingDoc.name}</h3>
                                <p className="text-xs text-muted-foreground">Extraído el {viewingDoc.uploadedAt ? format(viewingDoc.uploadedAt.toDate(), "dd/MM/yyyy HH:mm") : ""}</p>
                            </div>
                            <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-muted rounded-full">
                                <Trash2 className="w-5 h-5 opacity-0 pointer-events-none" /> {/* Spacer */}
                                <span className="sr-only">Cerrar</span>
                                <div className="text-xl">×</div>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs whitespace-pre-wrap bg-muted/20">
                            {viewingDoc.content || "Sin contenido extraído."}
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    handleDelete(viewingDoc.id);
                                    setViewingDoc(null);
                                }}
                                className="text-red-500 text-xs px-4 py-2 hover:underline"
                            >
                                Eliminar Documento
                            </button>
                            <button onClick={() => setViewingDoc(null)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
