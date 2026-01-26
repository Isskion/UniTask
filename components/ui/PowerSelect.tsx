import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface Option {
    value: string;
    label: string;
    color?: string;
}

interface PowerSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
}

export function PowerSelect({ value, onChange, options, placeholder = "Seleccionar...", className }: PowerSelectProps) {
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

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none flex items-center justify-between transition-all",
                    isLight
                        ? "bg-white border-zinc-300 text-zinc-900 hover:bg-zinc-50"
                        : "bg-black/20 border-white/10 text-white hover:bg-white/5",
                    isOpen && "ring-2 ring-indigo-500/20 border-indigo-500"
                )}
            >
                {selectedOption ? (
                    <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                            backgroundColor: selectedOption.color ? `${selectedOption.color}20` : 'transparent',
                            borderColor: selectedOption.color ? `${selectedOption.color}40` : 'transparent',
                            color: selectedOption.color || 'inherit'
                        }}
                    >
                        {selectedOption.label}
                    </span>
                ) : (
                    <span className={isLight ? "text-zinc-500" : "text-zinc-400"}>{placeholder}</span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>

            {isOpen && (
                <div className={cn("absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100",
                    isLight ? "bg-white border-zinc-200" : "bg-card border-white/10"
                )}>
                    <div className="max-h-60 overflow-y-auto p-1">
                        {options.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between group transition-colors",
                                    "hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <span
                                    className="px-2 py-0.5 rounded text-[10px] font-bold border w-full text-center sm:text-left sm:w-auto"
                                    style={{
                                        backgroundColor: option.color ? `${option.color}20` : 'transparent',
                                        borderColor: option.color ? `${option.color}40` : 'inherit',
                                        color: option.color || 'inherit'
                                    }}
                                >
                                    {option.label}
                                </span>
                                {value === option.value && <Check className="w-3 h-3 opacity-70 ml-2" />}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <div className="px-2 py-4 text-center text-zinc-500 italic text-[10px]">
                                No hay opciones
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
