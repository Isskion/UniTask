"use client";

import { Project, UniLeakFolder, UniLeakNote } from "@/types";
import { Check, ChevronDown, Download, FileText, Image as ImageIcon, Loader2, Lock, Menu, Printer, Search, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import UniLeaksSearch from "./UniLeaksSearch";

interface UniLeaksTopBarProps {
    project?: Project;
    folder?: UniLeakFolder;
    note?: UniLeakNote;
    notes?: UniLeakNote[];
    onNoteSelect?: (note: UniLeakNote) => void;
    autoSaveStatus: 'idle' | 'saving' | 'saved' | 'dirty' | 'error';
    isPublic: boolean;
    isInternal: boolean;
    onSetVisibility: (isPublic: boolean, isInternal: boolean) => void;
    onNewMinuta: () => void;
    onPrintNote: () => void;
    onExportPDF: () => void;
    onExportImage: () => void;
    onDeleteNote: () => void;
    toolsDropdownOpen: boolean;
    setToolsDropdownOpen: (open: boolean) => void;
}

export default function UniLeaksTopBar({
    project,
    folder,
    note,
    notes = [],
    onNoteSelect,
    autoSaveStatus,
    isPublic,
    isInternal,
    onSetVisibility,
    onNewMinuta,
    onPrintNote,
    onExportPDF,
    onExportImage,
    onDeleteNote,
    toolsDropdownOpen,
    setToolsDropdownOpen
}: UniLeaksTopBarProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setToolsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setToolsDropdownOpen]);

    return (
        <div className="flex items-center justify-between h-[44px] px-4 w-full bg-white border-b shrink-0 relative z-50" style={{ borderBottom: '1px solid var(--color-border)' }}>
            
            {/* IZQUIERDA: Logo */}
            <div className="flex items-center">
                <div className="flex items-center justify-center w-[26px] h-[26px] rounded-[5px]" style={{ background: 'var(--color-brand-red)' }}>
                    <span className="text-white font-bold text-[14px] leading-none">U</span>
                </div>
            </div>

            {/* CENTRO: Breadcrumb + Estado */}
            <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
                <div className="flex items-center" style={{ fontSize: '12.5px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{project?.name || "Sin proyecto"}</span>
                    <span className="mx-2" style={{ color: 'var(--color-separator)' }}>/</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{folder?.name || "Raíz"}</span>
                    <span className="mx-2" style={{ color: 'var(--color-separator)' }}>/</span>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{note?.title || "Nueva Nota"}</span>
                </div>
                
                {autoSaveStatus === 'saved' && (
                    <div className="flex items-center gap-1 ml-2" style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 500 }}>
                        <Check className="w-3.5 h-3.5" />
                        Guardado
                    </div>
                )}
                {autoSaveStatus === 'saving' && (
                    <div className="flex items-center gap-1 ml-2 text-amber-500" style={{ fontSize: '11px', fontWeight: 500 }}>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Guardando
                    </div>
                )}
                {autoSaveStatus === 'error' && (
                    <div className="flex items-center gap-1 ml-2 text-red-500" style={{ fontSize: '11px', fontWeight: 500 }}>
                        Error al guardar
                    </div>
                )}
            </div>

            {/* DERECHA: Controles */}
            <div className="flex items-center gap-4">
                
                {/* Segmented Control Visibilidad */}
                <div className="flex items-center p-[2px] rounded-[5px]" style={{ background: '#F2F0EC' }}>
                    <button
                        onClick={() => onSetVisibility(false, false)}
                        className={cn("px-3 py-1 rounded-[3px] text-[10.5px] transition-colors", !isPublic && !isInternal ? "text-white font-semibold shadow-sm" : "text-[var(--color-text-muted)]")}
                        style={{ background: !isPublic && !isInternal ? 'var(--color-text-primary)' : 'transparent' }}
                    >
                        Priv
                    </button>
                    <button
                        onClick={() => onSetVisibility(false, true)}
                        className={cn("px-3 py-1 rounded-[3px] text-[10.5px] transition-colors", !isPublic && isInternal ? "text-white font-semibold shadow-sm" : "text-[var(--color-text-muted)]")}
                        style={{ background: !isPublic && isInternal ? 'var(--color-brand-orange)' : 'transparent' }}
                    >
                        Equipo
                    </button>
                    <button
                        onClick={() => onSetVisibility(true, false)}
                        className={cn("px-3 py-1 rounded-[3px] text-[10.5px] transition-colors", isPublic ? "text-white font-semibold shadow-sm" : "text-[var(--color-text-muted)]")}
                        style={{ background: isPublic ? 'var(--color-success)' : 'transparent' }}
                    >
                        Pub
                    </button>
                </div>

                <div className="w-px h-[18px]" style={{ background: 'var(--color-border)' }} />

                {/* Búsqueda */}
                <div className="flex items-center h-full">
                    <div className="w-[28px] h-[28px] flex items-center justify-center">
                        <UniLeaksSearch scope="global" contextId={note?.id || null} notesToSearch={notes} onResultClick={onNoteSelect} />
                    </div>
                </div>

                {/* Botón + Minuta */}
                <button
                    onClick={onNewMinuta}
                    className="flex items-center h-[28px] px-[11px] rounded-[4px] text-white text-[11.5px] font-semibold transition-colors hover:opacity-90"
                    style={{ background: 'var(--color-brand-red)' }}
                >
                    + Minuta
                </button>

                <div className="w-px h-[18px]" style={{ background: 'var(--color-border)' }} />

                {/* Dropdown Herramientas */}
                <div className="relative">
                    <button
                        ref={buttonRef}
                        onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                        className="flex items-center h-[28px] px-[10px] rounded-[4px] text-[11.5px] font-medium transition-colors"
                        style={{ 
                            background: toolsDropdownOpen ? 'var(--color-border)' : '#F5F4F2', 
                            border: toolsDropdownOpen ? '1px solid #C8C5BE' : '1px solid #DDD9D3',
                            color: 'var(--color-text-primary)'
                        }}
                    >
                        <Menu className="w-3.5 h-3.5 mr-1.5" />
                        Herramientas
                        <ChevronDown className={cn("w-3 h-3 ml-1.5 transition-transform duration-200", toolsDropdownOpen && "rotate-180")} />
                    </button>

                    {/* Dropdown Panel */}
                    {toolsDropdownOpen && (
                        <div 
                            ref={dropdownRef}
                            className="absolute right-0 top-[36px] w-[240px] bg-white rounded-[8px] overflow-hidden shadow-2xl z-[9999]"
                            style={{ 
                                border: '1px solid var(--color-border)',
                                boxShadow: '0 8px 32px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.06)' 
                            }}
                        >
                            {/* Header */}
                            <div className="px-[14px] pt-[10px] pb-[8px]" style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>
                                    Herramientas del documento
                                </span>
                            </div>

                            {/* Grupo 1 */}
                            <div className="py-1">
                                <button onClick={() => { setToolsDropdownOpen(false); onNewMinuta(); }} className="w-[calc(100%-8px)] mx-[4px] px-[12px] py-[7px] flex items-center justify-between rounded-[4px] hover:bg-[#F5F4F2] transition-colors group">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center bg-[#FFF3E0]">
                                            <FileText className="w-4 h-4 text-[#E49230]" />
                                        </div>
                                        <span className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>Crear minuta</span>
                                    </div>
                                    <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-faint)' }}>⌘M</span>
                                </button>
                            </div>

                            <div className="h-px mx-[12px]" style={{ background: '#F0EDE8' }} />

                            {/* Grupo 2 */}
                            <div className="py-1">
                                <div className="px-[12px] pt-[6px] pb-[3px]">
                                    <span className="text-[9.5px] font-bold uppercase tracking-[0.09em]" style={{ color: 'var(--color-text-faint)' }}>
                                        Exportar
                                    </span>
                                </div>
                                <button onClick={() => { setToolsDropdownOpen(false); onPrintNote(); }} className="w-[calc(100%-8px)] mx-[4px] px-[12px] py-[7px] flex items-center justify-between rounded-[4px] hover:bg-[#F5F4F2] transition-colors group">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center bg-[#EEF6EE]">
                                            <Printer className="w-4 h-4 text-[#3D9A5C]" />
                                        </div>
                                        <span className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>Imprimir nota</span>
                                    </div>
                                    <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-faint)' }}>⌘P</span>
                                </button>
                                <button onClick={() => { setToolsDropdownOpen(false); onExportPDF(); }} className="w-[calc(100%-8px)] mx-[4px] px-[12px] py-[7px] flex items-center gap-[10px] rounded-[4px] hover:bg-[#F5F4F2] transition-colors group">
                                    <div className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center bg-[#EEF2FF]">
                                        <Download className="w-4 h-4 text-[#4A7FE0]" />
                                    </div>
                                    <span className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>Descargar PDF</span>
                                </button>
                                <button onClick={() => { setToolsDropdownOpen(false); onExportImage(); }} className="w-[calc(100%-8px)] mx-[4px] px-[12px] py-[7px] flex items-center gap-[10px] rounded-[4px] hover:bg-[#F5F4F2] transition-colors group">
                                    <div className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center bg-[#F5F0FF]">
                                        <ImageIcon className="w-4 h-4 text-[#8B5CF6]" />
                                    </div>
                                    <span className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>Exportar imagen</span>
                                </button>
                            </div>

                            <div className="h-px mx-[12px]" style={{ background: '#F0EDE8' }} />

                            {/* Grupo 3 */}
                            <div className="py-1 pb-2">
                                <button onClick={() => { setToolsDropdownOpen(false); onDeleteNote(); }} className="w-[calc(100%-8px)] mx-[4px] px-[12px] py-[7px] flex items-center gap-[10px] rounded-[4px] hover:bg-[#FFF0EF] transition-colors group">
                                    <div className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center bg-[#FFF0EF]">
                                        <Trash2 className="w-4 h-4 text-[#C83028]" />
                                    </div>
                                    <span className="text-[13px] text-[#C83028]">Eliminar nota</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
