
"use client";

import { useEffect, useState } from "react";

type Theme = 'dark' | 'light' | 'red';

export function useTheme() {
    const [theme, setTheme] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load from storage or default to dark
        const saved = localStorage.getItem('unitask-theme') as Theme;
        if (saved) {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        } else {
            setTheme('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        setMounted(true);
    }, []);

    const changeTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('unitask-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return { theme, changeTheme, mounted };
}
