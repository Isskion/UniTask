import { createContext } from 'react';

// Exposed to edge components so they can signal dirtiness without prop drilling.
export const UnifluxDirtyContext = createContext<() => void>(() => {});
