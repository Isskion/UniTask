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
            description: 'Enlaza tus columnas de Excel con los campos obligatorios de UNIGIS.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">El panel inferior <b>🗺️ Mapeo</b> es el corazón de la app. Arrastra una cabecera de Excel hacia un campo de UNIGIS para conectarlos.</p>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-xs">
                        💡 <b>Tip:</b> Si usas siempre el mismo formato, la app recordará tus mapeos automáticamente para la próxima vez.
                    </div>
                </div>
            )
        },
        {
            id: 'validation',
            icon: '🚥',
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
                            <span className="text-xs font-semibold text-red-800">Rojo: Error crítico (ej: falta dirección).</span>
                        </div>
                    </div>
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
                            <code className="text-[10px] font-bold bg-white px-1.5 py-0.5 border rounded shadow-sm">Ctrl + G</code>
                            <span className="text-[11px] text-slate-600">Agrupar Items</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                            <code className="text-[10px] font-bold bg-white px-1.5 py-0.5 border rounded shadow-sm">Ctrl + Enter</code>
                            <span className="text-[11px] text-slate-600">Enviar Todo</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                            <code className="text-[10px] font-bold bg-white px-1.5 py-0.5 border rounded shadow-sm">Ctrl+Shift+V</code>
                            <span className="text-[11px] text-slate-600">Validar</span>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const currentTopic = topics.find(t => t.id === selectedTopic);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-slate-50 rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
                
                {/* Header Modal */}
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Ayuda</h2>
                        <p className="text-sm text-slate-500 font-medium">Todo lo que necesitas para dominar UniOrderCreator</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:rotate-90 transition-all duration-300"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-8 pt-4">
                    {!selectedTopic ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                            {topics.map((topic) => (
                                <HelpCard 
                                    key={topic.id}
                                    icon={topic.icon}
                                    title={topic.title}
                                    description={topic.description}
                                    onClick={() => setSelectedTopic(topic.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm scale-in-center">
                            <button 
                                onClick={() => setSelectedTopic(null)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mb-6 group"
                            >
                                <span className="group-hover:-translate-x-1 transition-transform">←</span> Volver al inicio
                            </button>
                            
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 flex items-center justify-center bg-indigo-50 rounded-[20px] text-4xl shadow-inner">
                                    {currentTopic?.icon}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">{currentTopic?.title}</h3>
                            </div>

                            <div className="prose prose-slate max-w-none">
                                {currentTopic?.content}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer simple */}
                <div className="p-6 text-center border-t border-slate-200/60 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    UniTask Platinum Documentation • v2.1.0
                </div>
            </div>
        </div>
    );
}
