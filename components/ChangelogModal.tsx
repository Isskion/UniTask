"use client";

import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { X, BookOpen, ExternalLink, CalendarDays } from "lucide-react";
import { CHANGELOG, APP_VERSION, DOCUMENTATION_LINKS } from "@/lib/version";
import ReactMarkdown from 'react-markdown';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
    // Basic Theme Hook Fallback since hooks might differ in versions
    // Assuming useTheme exists based on imports, if not we default roughly
    const theme = 'dark';
    const isLight = theme === 'light';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-3xl max-h-[85vh] rounded-xl flex flex-col overflow-hidden shadow-2xl transition-colors border",
                isLight
                    ? "bg-white border-zinc-200"
                    : "bg-[#09090b] border-white/10"
            )}>
                {/* Header */}
                <div className={cn("p-6 flex items-center justify-between border-b shrink-0",
                    isLight ? "bg-zinc-50/80 border-zinc-200" : "bg-white/5 border-white/10"
                )}>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className={cn("text-2xl font-bold", isLight ? "text-zinc-900" : "text-white")}>
                                Novedades de UniTask
                            </h2>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold ring-1 ring-inset",
                                isLight ? "bg-indigo-50 text-indigo-700 ring-indigo-700/10" : "bg-indigo-400/10 text-indigo-400 ring-indigo-400/30"
                            )}>
                                v{APP_VERSION}
                            </span>
                        </div>
                        <p className={cn("text-sm mt-1", isLight ? "text-zinc-500" : "text-zinc-400")}>
                            Historial de cambios, mejoras y correcciones.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={cn("p-2 rounded-lg transition-colors",
                            isLight ? "hover:bg-zinc-200 text-zinc-500" : "hover:bg-white/10 text-zinc-400 hover:text-white"
                        )}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Main Content: Changelog */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {CHANGELOG.map((log, index) => (
                            <div key={log.version} className={cn("relative pl-6 border-l-2",
                                index === 0 ? "border-indigo-500" : (isLight ? "border-zinc-200" : "border-white/10")
                            )}>
                                <div className={cn("absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2",
                                    index === 0
                                        ? (isLight ? "bg-white border-indigo-500" : "bg-black border-indigo-500")
                                        : (isLight ? "bg-zinc-100 border-zinc-300" : "bg-zinc-900 border-zinc-700")
                                )} />

                                <div className="mb-2">
                                    <h3 className={cn("text-lg font-bold flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                                        {log.title}
                                        {index === 0 && (
                                            <span className="text-[10px] uppercase tracking-wider font-bold bg-green-500/20 text-green-500 px-2 py-0.5 rounded">Nuevo</span>
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs font-mono mt-1 opacity-60">
                                        <span className={cn("font-bold", isLight ? "text-zinc-700" : "text-zinc-300")}>v{log.version}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <CalendarDays className="w-3 h-3" />
                                            {log.date}
                                        </span>
                                    </div>
                                </div>

                                <div className={cn("prose prose-sm max-w-none space-y-2",
                                    isLight ? "text-zinc-600 prose-strong:text-zinc-900" : "text-zinc-400 prose-strong:text-zinc-200"
                                )}>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {log.features.map((feature, i) => (
                                            <li key={i}>
                                                <ReactMarkdown components={{
                                                    strong: ({ node, ...props }) => <span className={cn("font-bold", isLight ? "text-indigo-700" : "text-indigo-400")} {...props} />
                                                }}>
                                                    {feature}
                                                </ReactMarkdown>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sidebar: Documentation */}
                    <div className={cn("w-full md:w-64 border-l p-6 flex flex-col gap-4 shrink-0",
                        isLight ? "bg-zinc-50 border-zinc-200" : "bg-black/20 border-white/5"
                    )}>
                        <div>
                            <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2",
                                isLight ? "text-zinc-500" : "text-zinc-400"
                            )}>
                                <BookOpen className="w-4 h-4" />
                                Documentación
                            </h4>
                            <div className="space-y-2">
                                {DOCUMENTATION_LINKS.map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn("block p-3 rounded-lg border transition-all group",
                                            isLight
                                                ? "bg-white border-zinc-200 hover:border-indigo-300 hover:shadow-sm"
                                                : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                                        )}
                                    >
                                        <div className={cn("font-medium text-sm flex items-center gap-2",
                                            isLight ? "text-zinc-900 group-hover:text-indigo-700" : "text-zinc-200 group-hover:text-indigo-400"
                                        )}>
                                            {link.label}
                                            <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-dashed border-white/10">
                            <div className={cn("text-xs text-center", isLight ? "text-zinc-400" : "text-white/30")}>
                                Unitask Controller<br />
                                Build {APP_VERSION}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
