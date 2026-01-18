"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface Option {
    value: string;
    label: string;
    color?: string;
}

interface MultiPowerSelectProps {
    values: string[];
    onChange: (values: string[]) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    maxBadges?: number;
}

export function MultiPowerSelect({ values, onChange, options, placeholder = "Seleccionar...", className, maxBadges = 2 }: MultiPowerSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const isLight = theme === 'light';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (val: string) => {
        if (values.includes(val)) {
            onChange(values.filter(v => v !== val));
        } else {
            onChange([...values, val]);
        }
    };

    const selectedOptions = options.filter(o => values.includes(o.value));

    // Handle "Unknown" or implicit values if passed
    const unknownCount = values.length - selectedOptions.length;

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none flex items-center justify-between transition-all min-h-[34px]",
                    isLight
                        ? "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50"
                        : "bg-black/20 border-white/10 text-white hover:bg-white/5",
                    isOpen && "ring-2 ring-indigo-500/20 border-indigo-500"
                )}
            >
                <div className="flex flex-wrap gap-1 flex-1">
                    {selectedOptions.length === 0 ? (
                        <span className={isLight ? "text-zinc-500" : "text-zinc-400"}>{placeholder}</span>
                    ) : (
                        <>
                            {selectedOptions.slice(0, maxBadges).map(opt => (
                                <span
                                    key={opt.value}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1"
                                    style={{
                                        backgroundColor: opt.color ? `${opt.color}20` : 'transparent',
                                        borderColor: opt.color ? `${opt.color}40` : 'rgba(128,128,128,0.3)',
                                        color: opt.color || 'inherit'
                                    }}
                                    onClick={(e) => { e.stopPropagation(); toggleOption(opt.value); }}
                                >
                                    {opt.label}
                                    <X className="w-3 h-3 hover:text-red-500" />
                                </span>
                            ))}
                            {(selectedOptions.length > maxBadges || unknownCount > 0) && (
                                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", isLight ? "bg-zinc-100 text-zinc-600" : "bg-zinc-800 text-zinc-400")}>
                                    +{selectedOptions.length - (selectedOptions.length > maxBadges ? maxBadges : selectedOptions.length) + unknownCount}
                                </span>
                            )}
                        </>
                    )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-2 shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 bg-popover text-popover-foreground max-w-[300px]">
                    <div className={cn("max-h-60 overflow-y-auto p-1", isLight ? "bg-white" : "bg-[#18181b]")}>
                        <div className="p-1 mb-1 border-b border-white/5 flex justify-between items-center text-[10px] text-zinc-500">
                            <span>{values.length} seleccionados</span>
                            {values.length > 0 && (
                                <button type="button" onClick={() => onChange([])} className="hover:text-red-400">
                                    Limpiar
                                </button>
                            )}
                        </div>
                        {options.map(option => {
                            const isSelected = values.includes(option.value);
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleOption(option.value)}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between group transition-colors",
                                        isSelected
                                            ? (isLight ? "bg-indigo-50 text-indigo-900" : "bg-indigo-500/10 text-indigo-300")
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-3 h-3 rounded border flex items-center justify-center transition-colors",
                                            isSelected ? "bg-indigo-500 border-indigo-500" : "border-zinc-500"
                                        )}>
                                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <span
                                            className="px-2 py-0.5 rounded text-[10px] font-bold border"
                                            style={{
                                                backgroundColor: option.color ? `${option.color}20` : 'transparent',
                                                borderColor: option.color ? `${option.color}40` : 'transparent',
                                                color: option.color || 'inherit'
                                            }}
                                        >
                                            {option.label}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                        {options.length === 0 && (
                            <div className="px-2 py-4 text-center text-zinc-500 italic text-[10px]">
                                No hay opciones disponibles
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
