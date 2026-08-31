import { useState } from 'react';

interface HelpCardProps {
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
}

function HelpCard({ icon, title, description, onClick }: HelpCardProps) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-start p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left group"
        >
            <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-xl mb-4 group-hover:bg-indigo-50 text-2xl transition-colors">
                {icon}
            </div>
            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </button>
    );
}

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

    if (!isOpen) return null;

    const topics = [
        {
            id: 'start',
            icon: '📂',
            title: 'Primeros Pasos',
            description: 'Aprende a cargar archivos Excel y el formato básico requerido.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Para comenzar, arrastra un archivo Excel (.xlsx) al panel central o usa el botón <b>📂 Cargar Excel</b> en la cabecera.</p>
                    <ul className="list-disc ml-5 text-sm text-slate-600 space-y-2">
                        <li>Asegúrate de que la primera fila contenga las <b>cabeceras</b>.</li>
                        <li>No importa el orden de las columnas, las mapearemos después.</li>
                        <li>El sistema limpia automáticamente espacios en blanco y caracteres extraños.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'mapping',
            icon: '🗺️',
            title: 'Configurar Mapeo',
            description: 'Enlaza tus columnas de Excel con los campos de Cliente Dador en UNIGIS.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">El panel inferior <b>🗺️ Mapeo</b> permite conectar las columnas de tu Excel con el esquema de UNIGIS.</p>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-xs">
                        💡 <b>Tip:</b> Si usas siempre el mismo formato, la app recordará tus mapeos automáticamente para la próxima vez.
                    </div>
                </div>
            )
        },
        {
            id: 'validation',
            icon: '🚦',
            title: 'Semáforo y Alertas',
            description: 'Qué hacer cuando aparecen iconos rojos o amarillos en la tabla.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Cada fila tiene un indicador visual:</p>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex gap-3 items-center p-2 bg-emerald-50 rounded border border-emerald-100">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-xs font-semibold text-emerald-800">Verde: Fila lista para enviar.</span>
                        </div>
                        <div className="flex gap-3 items-center p-2 bg-amber-50 rounded border border-amber-100">
                            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
                            <span className="text-xs font-semibold text-amber-800">Amarillo: Advertencia (ej: ref duplicada).</span>
                        </div>
                        <div className="flex gap-3 items-center p-2 bg-red-50 rounded border border-red-100">
                            <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                            <span className="text-xs font-semibold text-red-800">Rojo: Error crítico (ej: falta razón social).</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'cloud',
            icon: '☁️',
            title: 'Plantillas en la Nube',
            description: 'Sincroniza tus configuraciones entre dispositivos y compañeros.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Ahora puedes guardar tus mapeos de forma segura en la nube (Firestore).</p>
                    <ul className="list-disc ml-5 text-sm text-slate-600 space-y-2">
                        <li><b>Aislamiento por Tenant:</b> Tus plantillas solo son visibles para tu organización.</li>
                        <li><b>Comparador Inteligente:</b> Al ver la lista, verás cuántas columnas coinciden con el Excel actual.</li>
                        <li><b>Guardado Rápido:</b> Usa el botón 💾 en la cabecera para guardar el mapeo actual en un clic.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'interactive',
            icon: '🔗',
            title: 'Cabeceras Interactivas',
            description: 'Navegación rápida y estado visual de las columnas mapeadas.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Las tablas son interactivas:</p>
                    <ul className="list-disc ml-5 text-sm text-slate-600 space-y-2">
                        <li><b>Color Azul:</b> Indica que la columna de Excel está mapeada a un campo de UNIGIS.</li>
                        <li><b>Salto Rápido:</b> Haz clic en una cabecera azul para ir directamente al campo en el panel de mapeo.</li>
                        <li><b>Edición en Fila:</b> Haz doble clic en cualquier celda para corregir datos rápidamente sin salir de la tabla.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'shortcuts',
            icon: '⌨️',
            title: 'Atajos Pro',
            description: 'Domina la aplicación usando solo tu teclado para máxima velocidad.',
            content: (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                            <code className="text-[10px] font-bold bg-white px-1.5 py-0.5 border rounded shadow-sm">Ctrl + O</code>
                            <span className="text-[11px] text-slate-600">Abrir Excel</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                            <code className="text-[10px] font-bold bg-white px-1.5 py-0.5 border rounded shadow-sm">Ctrl + Enter</code>
                            <span className="text-[11px] text-slate-600">Enviar Todo</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                            <code className="text-[10px] font-bold bg-white px-1.5 py-0.5 border rounded shadow-sm">Ctrl+Shift+V</code>
                            <span className="text-[11px] text-slate-600">Validar</span>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const currentTopicData = topics.find(t => t.id === selectedTopic);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl font-bold">
                            💡
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800">Centro de Ayuda y Documentación</h2>
                            <p className="text-xs text-slate-400">Guías interactivas para UniClienteDadorCreator</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-8">
                    {!selectedTopic ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {topics.map(t => (
                                <HelpCard
                                    key={t.id}
                                    icon={t.icon}
                                    title={t.title}
                                    description={t.description}
                                    onClick={() => setSelectedTopic(t.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <button
                                onClick={() => setSelectedTopic(null)}
                                className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                ← Volver a todos los temas
                            </button>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-2xl text-2xl">
                                    {currentTopicData?.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">{currentTopicData?.title}</h3>
                                    <p className="text-xs text-slate-400">{currentTopicData?.description}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                {currentTopicData?.content}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-8 py-4 bg-slate-50 border-t border-slate-100">
                    <span className="text-xs text-slate-400">¿Necesitas soporte técnico? Contacta con el equipo de integración.</span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors shadow-lg shadow-slate-900/10"
                    >
                        Entendido
                    </button>
                </div>

            </div>
        </div>
    );
}
