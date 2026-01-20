'use client';

import React from 'react';
import { useLanguage, Language } from '@/context/LanguageContext';
import { ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Popover from '@radix-ui/react-popover';

const flags: Record<Language, string> = {
    en: "🇺🇸",
    es: "🇪🇸",
    de: "🇩🇪",
    fr: "🇫🇷",
    ca: "🏴", // Using black flag or similar for simplicity, ideally custom SVG
    pt: "🇵🇹",
};

const names: Record<Language, string> = {
    en: "English",
    es: "Español",
    de: "Deutsch",
    fr: "Français",
    ca: "Català",
    pt: "Português",
};

export function LanguageSelector() {
    const { language, setLanguage } = useLanguage();
    const [open, setOpen] = React.useState(false);

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/50 hover:bg-accent hover:text-accent-foreground transition-all text-sm font-medium",
                        open && "bg-accent"
                    )}
                >
                    <span className="text-lg leading-none">{flags[language]}</span>
                    <span className="hidden sm:inline text-xs opacity-80">{names[language]}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground opacity-50" />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    className="z-50 min-w-[140px] bg-popover text-popover-foreground rounded-lg border border-border shadow-xl animate-in fade-in-0 zoom-in-95 p-1"
                    align="end"
                    sideOffset={5}
                >
                    {(Object.keys(names) as Language[]).map((lang) => (
                        <button
                            key={lang}
                            onClick={() => {
                                setLanguage(lang);
                                setOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-left",
                                language === lang && "bg-accent/50 font-medium text-primary"
                            )}
                        >
                            <span className="text-lg leading-none">{flags[lang]}</span>
                            <span>{names[lang]}</span>
                        </button>
                    ))}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
