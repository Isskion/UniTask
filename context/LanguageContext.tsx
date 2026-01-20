'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { en, Dictionary } from '@/app/locales/en';
import { es } from '@/app/locales/es';
import { de } from '@/app/locales/de';
import { fr } from '@/app/locales/fr';
import { ca } from '@/app/locales/ca';
import { pt } from '@/app/locales/pt';

export type Language = 'en' | 'es' | 'de' | 'fr' | 'ca' | 'pt';

const dictionaries: Record<Language, Dictionary> = {
    en, es, de, fr, ca, pt
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (path: string) => string;
    dictionary: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('es'); // Default to Spanish for this project

    useEffect(() => {
        const savedLang = localStorage.getItem('unitask_language') as Language;
        if (savedLang && dictionaries[savedLang]) {
            setLanguage(savedLang);
        }
    }, []);

    const changeLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('unitask_language', lang);
    };

    const t = (path: string) => {
        const keys = path.split('.');
        let current: any = dictionaries[language];
        for (const key of keys) {
            if (current[key] === undefined) {
                console.warn(`Missing translation for key: ${path} in language: ${language}`);
                // Fallback to English
                let fallback: any = dictionaries['en'];
                for (const fbKey of keys) {
                    fallback = fallback?.[fbKey];
                }
                return fallback || path;
            }
            current = current[key];
        }
        return current;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, dictionary: dictionaries[language] }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
