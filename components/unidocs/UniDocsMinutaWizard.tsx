"use client";

// UniDocs V2.4 — Wizard de Minutas
// Orquestador de los 4 pasos: Config → IA Review → Editor → Preview/Export
// No persiste nada en Firestore (minutas efímeras en fase 1).

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { X } from "lucide-react";
import { UniDocsTemplate, UniDocsMinuta, UniLeakNote, MinutaContext } from "@/types/unidocs";
import MinutaStep1Config from "./MinutaStep1Config";
import MinutaStep2AIReview from "./MinutaStep2AIReview";
import MinutaStep3Editor from "./MinutaStep3Editor";
import MinutaStep4Preview from "./MinutaStep4Preview";

export interface UniDocsMinutaWizardProps {
    projectId: string;
    folderId?: string | null;
    tenantId: string;
    onClose: () => void;
}

const STEP_LABELS = ["Configuración", "Revisión IA", "Editor", "Previsualizar"];

export default function UniDocsMinutaWizard({
    projectId,
    folderId,
    tenantId,
    onClose,
}: UniDocsMinutaWizardProps) {
    const [step, setStep] = useState(1);
    const [templates, setTemplates] = useState<UniDocsTemplate[]>([]);
    const [tenantLogo, setTenantLogo] = useState<string | null>(null);
    const [clientLogo, setClientLogo] = useState<string | null>(null);
    const [minutaContext, setMinutaContext] = useState<MinutaContext | null>(null);

    // Wizard state — the full minuta being built
    const [minuta, setMinuta] = useState<UniDocsMinuta>({
        title: "",
        meetingDate: new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }),
        notes: [],
        orderedNoteIds: [],
        coverTemplateId: null,
        bodyTemplateId: "",
        pageBreakBetweenNotes: true,
        rawHtml: "",
        aiHtml: null,
        editedHtml: "",
    });

    // Load templates, logos, and project context on mount
    useEffect(() => {
        let isMounted = true;

        const loadTemplates = async () => {
            try {
                const q = query(collection(db, "unidocs_templates"), where("tenantId", "==", tenantId));
                const snap = await getDocs(q);
                if (isMounted) setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as UniDocsTemplate)));
            } catch (e) {
                console.error("[Wizard] Error loading templates:", e);
            }
        };

        const loadTenantLogo = async () => {
            try {
                const tenantDoc = await getDoc(doc(db, "tenants", tenantId));
                if (isMounted && tenantDoc.exists()) {
                    const data = tenantDoc.data();
                    if (data.logos?.length > 0) {
                        const principal = data.logos.find((l: any) => l.label?.toLowerCase().includes("principal"));
                        setTenantLogo(principal?.url || data.logos[0].url);
                    } else if (data.logoUrl) {
                        setTenantLogo(data.logoUrl);
                    }
                }
            } catch (e) {
                console.error("[Wizard] Error loading tenant logo:", e);
            }
        };

        const loadProjectContext = async () => {
            try {
                const projectDoc = await getDoc(doc(db, "projects", projectId));
                if (!isMounted || !projectDoc.exists()) return;
                const p = projectDoc.data();

                if (isMounted) {
                    setMinutaContext({
                        minutaTitle: "",        // filled at step 1
                        meetingDate: "",        // filled at step 1
                        projectName: p.name || "",
                        clientName: p.clientName || "",
                        projectCode: p.code || "",
                        projectEmail: p.email || undefined,
                        projectPhone: p.phone || undefined,
                    });
                }

                // Client logo — same strategy as UniDocsTemplatePickerModal:
                // 1. Check project.clientLogoUrl direct field
                // 2. Then search projects/{id}/documents subcollection for a logo document
                if (p.clientLogoUrl && isMounted) {
                    setClientLogo(p.clientLogoUrl);
                    return;
                }
                try {
                    const docsSnap = await getDocs(collection(db, "projects", projectId, "documents"));
                    let logoDoc = docsSnap.docs.find(d => d.data().typeCode?.toUpperCase() === 'LOGO');
                    if (!logoDoc) logoDoc = docsSnap.docs.find(d => d.data().name?.toUpperCase().includes('LOGO'));
                    if (!logoDoc) logoDoc = docsSnap.docs.find(d => (d.data().type || '').toLowerCase().startsWith('image/') && d.data().url);
                    if (logoDoc && isMounted) {
                        const data = logoDoc.data();
                        const logoUrl = data.url || data.fileUrl || data.downloadURL;
                        if (logoUrl) setClientLogo(logoUrl);
                    }
                } catch (_) {
                    // documents subcollection may not exist — not an error
                }
            } catch (e) {
                console.error("[Wizard] Error loading project context:", e);
            }
        };

        loadTemplates();
        loadTenantLogo();
        loadProjectContext();
        return () => { isMounted = false; };
    }, [projectId, tenantId]);

    // Helpers to navigate between steps
    const goNext = () => setStep(s => Math.min(s + 1, 4));
    const goBack = () => setStep(s => Math.max(s - 1, 1));

    // Update minuta state from any step
    const updateMinuta = (updates: Partial<UniDocsMinuta>) => {
        setMinuta(prev => ({ ...prev, ...updates }));
    };

    // Build the MinutaContext with current step-1 values before going to step 2
    const buildContext = (): MinutaContext => ({
        ...(minutaContext ?? { projectName: "", clientName: "", projectCode: "" }),
        minutaTitle: minuta.title,
        meetingDate: minuta.meetingDate,
    });

    // Resolve template objects for preview
    const bodyTemplate = templates.find(t => t.id === minuta.bodyTemplateId) ?? null;
    const coverTemplate = minuta.coverTemplateId ? templates.find(t => t.id === minuta.coverTemplateId) ?? null : null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="shrink-0 bg-card border-b border-border flex items-center gap-4 px-6 py-3">
                <div className="flex-1">
                    <h2 className="text-base font-bold text-foreground">Nueva Minuta</h2>
                    <p className="text-xs text-muted-foreground">{minuta.title || "Sin título"}</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-1">
                    {STEP_LABELS.map((label, i) => {
                        const n = i + 1;
                        const isActive = step === n;
                        const isDone = step > n;
                        return (
                            <div key={n} className="flex items-center gap-1">
                                <div className={`
                                    flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all
                                    ${isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}
                                `}>
                                    {isDone ? "✓" : n}
                                </div>
                                <span className={`text-xs hidden sm:inline ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                    {label}
                                </span>
                                {n < 4 && <div className="w-4 h-px bg-border mx-1" />}
                            </div>
                        );
                    })}
                </div>

                <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors ml-4">
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-hidden">
                {step === 1 && (
                    <MinutaStep1Config
                        projectId={projectId}
                        folderId={folderId ?? null}
                        tenantId={tenantId}
                        templates={templates}
                        minuta={minuta}
                        onChange={updateMinuta}
                        onNext={() => {
                            // Build raw HTML from selected notes before proceeding
                            const orderedNotes = minuta.orderedNoteIds
                                .map(id => minuta.notes.find(n => n.id === id))
                                .filter(Boolean) as UniLeakNote[];

                            const rawHtml = orderedNotes.map(note => `
<section>
    <h2>${note.title}</h2>
    ${note.content}
    ${minuta.pageBreakBetweenNotes ? '<div style="page-break-after:always;"></div>' : ''}
</section>`).join('\n');

                            updateMinuta({ rawHtml, editedHtml: rawHtml });
                            goNext();
                        }}
                    />
                )}

                {step === 2 && (
                    <MinutaStep2AIReview
                        minuta={minuta}
                        projectName={minutaContext?.projectName ?? ""}
                        onChange={updateMinuta}
                        onNext={goNext}
                        onBack={goBack}
                    />
                )}

                {step === 3 && (
                    <MinutaStep3Editor
                        minuta={minuta}
                        onChange={updateMinuta}
                        onNext={goNext}
                        onBack={goBack}
                    />
                )}

                {step === 4 && bodyTemplate && (
                    <MinutaStep4Preview
                        minuta={minuta}
                        bodyTemplate={bodyTemplate}
                        coverTemplate={coverTemplate}
                        tenantLogo={tenantLogo}
                        clientLogo={clientLogo}
                        minutaContext={buildContext()}
                        onBack={goBack}
                        onClose={onClose}
                    />
                )}

                {step === 4 && !bodyTemplate && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground text-sm">No se pudo cargar la plantilla de cuerpo seleccionada.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
