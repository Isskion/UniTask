import { createContext } from 'react';

export interface UnifluxContextValue {
    markDirty: () => void;
    showLogisticsLabels: boolean;
    // Multi-mensaje por arista (ver EdgeMessage en core/types.ts): permiten que
    // UnifluxOrthogonalEdge añada/quite mensajes directamente desde el canvas sin
    // necesitar acceso al estado `edges` (que vive controlado en UnifluxWorkspace).
    // onQuickAddMessage abre el panel de edición con una fila nueva ya añadida (no muta en frío,
    // para no persistir nunca un mensaje vacío); onRemoveEdgeMessage sí muta directo (es seguro).
    onQuickAddMessage: (edgeId: string) => void;
    onRemoveEdgeMessage: (edgeId: string, messageId: string) => void;
}

export const UnifluxDirtyContext = createContext<UnifluxContextValue>({
    markDirty: () => {},
    showLogisticsLabels: true,
    onQuickAddMessage: () => {},
    onRemoveEdgeMessage: () => {},
});
