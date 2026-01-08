"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface UIContextType {
    isCommandMenuOpen: boolean;
    setCommandMenuOpen: (open: boolean) => void;
    toggleCommandMenu: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
    const [isCommandMenuOpen, setCommandMenuOpen] = useState(false);

    const toggleCommandMenu = () => setCommandMenuOpen(prev => !prev);

    return (
        <UIContext.Provider value={{ isCommandMenuOpen, setCommandMenuOpen, toggleCommandMenu }}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error("useUI must be used within a UIProvider");
    }
    return context;
}
