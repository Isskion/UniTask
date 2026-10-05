"use client";

import { X, Upload, FileSpreadsheet, Info, Link2 } from "lucide-react";

interface Props {
    onContinue: () => void;
    /** Solo se pasa si el navegador soporta File System Access API (Chrome/Edge escritorio). */
    onLinkSynced?: () => void;
    onClose: () => void;
    maxSizeMB: number;
}

export function AgendaImportInfoModal({ onContinue, onLinkSynced, onClose, maxSizeMB }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        </div>
                        <h2 className="text-sm font-semibold text-foreground">Importar agenda desde Excel</h2>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm text-foreground">

                    <div className="flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <p>Revisa estas condiciones antes de subir el archivo para evitar que se importen 0 entradas.</p>
                    </div>

                    {onLinkSynced && (
                        <div className="space-y-1.5 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                            <h3 className="font-semibold text-xs uppercase tracking-wide text-emerald-500 flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5" /> Sin descargar: Excel de SharePoint sincronizado
                            </h3>
                            <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                                <li>En SharePoint, en la carpeta del Excel, pulsa <span className="text-foreground font-medium">Sincronizar</span> (o <span className="text-foreground font-medium">Agregar acceso directo a Mis archivos</span>).</li>
                                <li>Recomendado: clic derecho en esa carpeta en el Explorador → <span className="text-foreground font-medium">Mantener siempre en este dispositivo</span>.</li>
                                <li>Pulsa <span className="text-foreground font-medium">Vincular Excel sincronizado</span> y elige el archivo dentro de la carpeta de OneDrive.</li>
                                <li>A partir de ahí, el botón <span className="text-foreground font-medium">Recargar Excel</span> de la agenda lo relee con un clic, siempre con la última versión.</li>
                            </ol>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Archivo</h3>
                        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                            <li>Formatos aceptados: <span className="text-foreground font-medium">.xlsx</span>, <span className="text-foreground font-medium">.xls</span> o <span className="text-foreground font-medium">.xlsb</span> (libro binario)</li>
                            <li>Tamaño máximo: <span className="text-foreground font-medium">{maxSizeMB} MB</span></li>
                            <li>Si tu Excel tiene una hoja por semana, podrás elegir cuál analizar desde el selector de hoja del preview.</li>
                        </ul>
                    </div>

                    <div className="space-y-1.5">
                        <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Estructura esperada</h3>
                        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                            <li>Fila 1, columna C: etiqueta de la semana (ej. &quot;Semana 3&quot;)</li>
                            <li>Fila 3: cabeceras por día — <span className="font-mono text-foreground">Fecha_T | Actividad | Comentario | Horario | Resultado</span>, repetidas 7 veces (lunes a domingo)</li>
                            <li>Desde la fila 4: una fila por consultor, con su nombre en la columna B</li>
                            <li>Cada celda <span className="font-mono text-foreground">Fecha_T</span> debe contener una fecha válida <span className="font-mono text-foreground">DD/MM/AA</span> (no una fórmula rota tipo <span className="font-mono text-foreground">#REF!</span>) — si falta, esa entrada se descarta sin aviso</li>
                        </ul>
                    </div>

                    <div className="space-y-1.5">
                        <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Para que una entrada se importe</h3>
                        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                            <li>Debe tener <span className="text-foreground font-medium">Actividad</span> y <span className="text-foreground font-medium">Horario</span> rellenos, además de la fecha</li>
                            <li><span className="text-foreground font-medium">Actividad</span> debe ser uno de: Reunión Cliente, Reunión UNIGIS, Reunión Presencial, Reunión Interna, Comercial, Tareas a Realizar, Vacaciones, Viaje, Especial</li>
                            <li><span className="text-foreground font-medium">Horario</span> en formato <span className="font-mono text-foreground">HH:MM A HH:MM</span></li>
                            <li><span className="text-foreground font-medium">Comentario</span> en formato <span className="font-mono text-foreground">CLIENTE / DESCRIPCION</span></li>
                            <li>El nombre del consultor (columna B) debe coincidir, sin distinguir mayúsculas, con un consultor registrado en &quot;Gestionar consultores&quot; — si no, sus filas se omiten</li>
                            <li>Las entradas ya existentes para esa semana (mismo consultor + fecha + actividad + horario) se omiten como duplicados</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-all"
                    >
                        Cancelar
                    </button>
                    {onLinkSynced && (
                        <button
                            onClick={onLinkSynced}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-600/50 text-emerald-500 hover:bg-emerald-500/10 transition-all"
                        >
                            <Link2 className="w-3.5 h-3.5" />
                            Vincular Excel sincronizado
                        </button>
                    )}
                    <button
                        onClick={onContinue}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        Entendido, elegir archivo
                    </button>
                </div>
            </div>
        </div>
    );
}
