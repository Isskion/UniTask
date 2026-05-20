import { createContext } from 'react';

export interface UnifluxContextValue {
    markDirty: () => void;
    showLogisticsLabels: boolean;
}

export const UnifluxDirtyContext = createContext<UnifluxContextValue>({
    markDirty: () => {},
    showLogisticsLabels: true,
});
