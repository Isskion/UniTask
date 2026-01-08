
"use client";

import { useEffect, useState } from "react";

type Theme = 'dark' | 'light' | 'red';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load from storage or default to dark
        const loadTheme = () => {
            const saved = localStorage.getItem('unitask-theme') as Theme;
            if (saved) {
                setTheme(saved);
                document.documentElement.setAttribute('data-theme', saved);
            } else {
                setTheme('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            }
        };

        loadTheme();
        setMounted(true);

        // Listen for custom theme change events
        const handleThemeChange = (e: CustomEvent) => {
            setTheme(e.detail);
        };

        window.addEventListener('theme-change', handleThemeChange as EventListener);
        return () => window.removeEventListener('theme-change', handleThemeChange as EventListener);
    }, []);

    const changeTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('unitask-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('theme-change', { detail: newTheme }));
    };

    return { theme, changeTheme, mounted };
}
