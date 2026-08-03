import React, { useState } from 'react';
import { UniLeakNote } from '@/types';
import { DiscoveryTemplate } from '@/types/relevamiento';
import DiscoveryNotesPanel from './DiscoveryNotesPanel';
import DiscoveryQuestionnaire from './DiscoveryQuestionnaire';
import { X } from 'lucide-react';

interface SplitScreenDiscoveryUIProps {
    tenantId: string;
    projectId: string;
    uid: string;
    notes: UniLeakNote[];
    template: DiscoveryTemplate; // Reservado: la instancia real se resuelve dentro de DiscoveryQuestionnaire
    isInternalViewer?: boolean;
}

export default function SplitScreenDiscoveryUI({ tenantId, projectId, uid, notes, isInternalViewer = false }: SplitScreenDiscoveryUIProps) {
    const [selectedNote, setSelectedNote] = useState<UniLeakNote | null>(null);
    const [selectedText, setSelectedText] = useState<string>('');
    const [notesPanelCollapsed, setNotesPanelCollapsed] = useState(false);

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            setSelectedText(selection.toString().trim());
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground border-t border-border">
            <div className="flex flex-1 min-h-0" onMouseUp={handleTextSelection}>
                {/* Panel Izquierdo: Unileaks (consulta/edición de notas del proyecto, colapsable) */}
                <DiscoveryNotesPanel
                    tenantId={tenantId}
                    projectId={projectId}
                    uid={uid}
                    isInternalViewer={isInternalViewer}
                    initialNotes={notes}
                    collapsed={notesPanelCollapsed}
                    onToggleCollapse={() => setNotesPanelCollapsed(c => !c)}
                    onActiveNoteChange={setSelectedNote}
                />

                {/* Panel Derecho: cuestionario de Discovery (navegación de secciones + campos editables) */}
                <DiscoveryQuestionnaire
                    tenantId={tenantId}
                    projectId={projectId}
                    uid={uid}
                    selectedText={selectedText}
                    selectedNoteId={selectedNote?.id || null}
                    onTextConsumed={() => setSelectedText('')}
                />
            </div>

            {selectedText && (
                <div className="shrink-0 border-t border-border bg-primary/5 px-4 py-2 flex items-center justify-between gap-3">
                    <p className="text-sm text-foreground truncate">
                        <span className="font-semibold">Texto seleccionado:</span> "{selectedText}" — usa "Asignar" junto a la pregunta destino.
                    </p>
                    <button
                        onClick={() => setSelectedText('')}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded shrink-0"
                        title="Cancelar selección"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
