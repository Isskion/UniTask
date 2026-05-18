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
            icon: 'ðŸ“‚',
            title: 'Primeros Pasos',
            description: 'Aprende a cargar archivos Excel y el formato bÃ¡sico requerido.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Para comenzar, arrastra un archivo Excel (.xlsx) al panel central o usa el botÃ³n <b>ðŸ“‚ Cargar Excel</b> en la cabecera.</p>
                    <ul className="list-disc ml-5 text-sm text-slate-600 space-y-2">
                        <li>AsegÃºrate de que la primera fila contenga las <b>cabeceras</b>.</li>
                        <li>No importa el orden de las columnas, las mapearemos despuÃ©s.</li>
                        <li>El sistema limpia automÃ¡ticamente espacios en blanco y caracteres extraÃ±os.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'mapping',
            icon: 'ðŸ—ºï¸',
            title: 'Configurar Mapeo',
            description: 'Enlaza tus columnas de Excel con los campos obligatorios de UNIGIS.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">El panel inferior <b>ðŸ—ºï¸ Mapeo</b> es el corazÃ³n de la app. Arrastra una cabecera de Excel hacia un campo de UNIGIS para conectarlos.</p>
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-xs">
                        ðŸ’¡ <b>Tip:</b> Si usas siempre el mismo formato, la app recordarÃ¡ tus mapeos automÃ¡ticamente para la prÃ³xima vez.
                    </div>
                </div>
            )
        },
        {
            id: 'validation',
            icon: 'ðŸš¥',
            title: 'SemÃ¡foro y Alertas',
            description: 'QuÃ© hacer cuando aparecen iconos rojos o amarillos en la tabla.',
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
                            <span className="text-xs font-semibold text-red-800">Rojo: Error crÃ­tico (ej: falta direcciÃ³n).</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'cloud',
            icon: 'â˜ï¸',
            title: 'Plantillas en la Nube',
            description: 'Sincroniza tus configuraciones entre dispositivos y compaÃ±eros.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Ahora puedes guardar tus mapeos de forma segura en la nube (Firestore).</p>
                    <ul className="list-disc ml-5 text-sm text-slate-600 space-y-2">
                        <li><b>Aisalmiento por Tenant:</b> Tus plantillas solo son visibles para tu organizaciÃ³n.</li>
                        <li><b>Comparador Inteligente:</b> Al ver la lista, verÃ¡s cuÃ¡ntas columnas coinciden con el Excel actual.</li>
                        <li><b>Guardado RÃ¡pido:</b> Usa el botÃ³n ðŸ’¾ en la cabecera para guardar el mapeo actual en un clic.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'interactive',
            icon: 'ðŸ”—',
            title: 'Cabeceras Interactivas',
            description: 'NavegaciÃ³n rÃ¡pida y estado visual de las columnas mapeadas.',
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Las tablas ahora son interactivas:</p>
                    <ul className="list-disc ml-5 text-sm text-slate-600 space-y-2">
                        <li><b>Color Azul:</b> Indica que la columna de Excel estÃ¡ mapeada a un campo de UNIGIS.</li>
                        <li><b>Salto RÃ¡pido:</b> Haz clic en una cabecera azul para ir directamente al campo en el panel de mapeo.</li>
                        <li><b>EdiciÃ³n en Fila:</b> Haz doble clic en cualquier celda para corregir datos rÃ¡pidamente sin salir de la tabla.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'shortcuts',
            icon: 'âŒ¨ï¸',
            title: 'Atajos Pro',
            description: 'Domina la aplicaciÃ³n usando solo tu teclado para mÃ¡xima velocidad.',
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
                        <p className="text-sm text-slate-500 font-medium">Todo lo que necesitas para dominar uniclientcreator</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:rotate-90 transition-all duration-300"
                    >
                        âœ•
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
                                <span className="group-hover:-translate-x-1 transition-transform">â†</span> Volver al inicio
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
                    UniTask Platinum Documentation â€¢ v2.1.0
                </div>
            </div>
        </div>
    );
}

