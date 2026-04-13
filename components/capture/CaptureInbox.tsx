import React, { useState, useEffect } from 'react';
import { 
    Mail, 
    Trash2, 
    CheckCircle2, 
    FileText, 
    Forward, 
    Clock, 
    User, 
    Search,
    ChevronRight,
    Sparkles,
    Check
} from 'lucide-react';
import { db } from '../../firebase';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc,
    addDoc,
    serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface CapturedEmail {
    id: string;
    subject: string;
    body: string;
    sender: string;
    status: 'pending' | 'processed' | 'discarded';
    createdAt: any;
    tenantId: string;
}

const CaptureInbox: React.FC = () => {
    const { tenantId, user } = useAuth();
    const { t } = useLanguage();
    const [emails, setEmails] = useState<CapturedEmail[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmail, setSelectedEmail] = useState<CapturedEmail | null>(null);

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, "incoming_emails"),
            where("tenantId", "in", [tenantId, "shared"]),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as CapturedEmail));
            setEmails(items);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    const handleDiscard = async (id: string) => {
        try {
            await updateDoc(doc(db, "incoming_emails", id), {
                status: 'discarded'
            });
            if (selectedEmail?.id === id) setSelectedEmail(null);
        } catch (error) {
            console.error("Error discarding:", error);
        }
    };

    const handleConvertToTask = async (email: CapturedEmail) => {
        try {
            // Logic to create a real task based on current project structure
            // [Prototype] Just mark as processed for now
            await addDoc(collection(db, "tasks"), {
                title: email.subject,
                description: email.body,
                status: 'todo',
                createdAt: serverTimestamp(),
                createdBy: user?.uid,
                tenantId: tenantId,
                source: "outlook_capture"
            });

            await updateDoc(doc(db, "incoming_emails", email.id), {
                status: 'processed'
            });
            
            setSelectedEmail(null);
        } catch (error) {
            console.error("Error converting to task:", error);
        }
    };

    const filteredEmails = emails.filter(e => 
        e.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.sender.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-full bg-zinc-950/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
            {/* List Sidebar */}
            <div className="w-1/3 border-r border-white/5 flex flex-col">
                <div className="p-4 border-b border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Mail className="w-5 h-5 text-rose-500" />
                            {t('inbox.title') || "Buzón de Capturas"}
                        </h2>
                        <span className="bg-rose-500/20 text-rose-400 text-xs px-2 py-0.5 rounded-full font-bold">
                            {emails.length}
                        </span>
                    </div>
                    
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 transition-colors group-focus-within:text-rose-500" />
                        <input 
                            type="text"
                            placeholder={t('common.search') || "Buscar..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {loading ? (
                        <div className="flex items-center justify-center h-32 text-zinc-500 text-sm italic">
                            {t('common.loading') || "Cargando..."}
                        </div>
                    ) : filteredEmails.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-zinc-500 px-8 text-center space-y-3">
                            <div className="p-4 bg-zinc-900/50 rounded-full">
                                <Mail className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-xs uppercase tracking-widest font-black opacity-40">
                                {t('inbox.empty') || "Buzón vacío"}
                            </p>
                        </div>
                    ) : (
                        filteredEmails.map(email => (
                            <button
                                key={email.id}
                                onClick={() => setSelectedEmail(email)}
                                className={`w-full text-left p-4 rounded-xl transition-all border group ${
                                    selectedEmail?.id === email.id 
                                    ? 'bg-rose-500/10 border-rose-500/30' 
                                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-400 truncate max-w-[120px]">
                                        {email.sender}
                                    </span>
                                    <span className="text-[10px] text-zinc-600">
                                        {email.createdAt?.toDate().toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className={`text-sm font-semibold truncate ${selectedEmail?.id === email.id ? 'text-rose-400' : 'text-zinc-200'}`}>
                                    {email.subject}
                                </h4>
                                <p className="text-xs text-zinc-500 line-clamp-1 mt-1 font-medium italic opacity-70">
                                    {email.body.substring(0, 100)}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Email Detail View */}
            <div className="flex-1 flex flex-col bg-zinc-900/20">
                {selectedEmail ? (
                    <>
                        <div className="p-8 border-b border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-black text-rose-500 uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        <span>Capturado el {selectedEmail.createdAt?.toDate().toLocaleString()}</span>
                                    </div>
                                    <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                                        {selectedEmail.subject}
                                    </h1>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleDiscard(selectedEmail.id)}
                                        className="p-3 bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/5 rounded-xl transition-all"
                                        title="Descartar"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 font-black">
                                    {selectedEmail.sender[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-0.5">Remitente</p>
                                    <p className="text-sm font-bold text-zinc-200">{selectedEmail.sender}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="prose prose-invert max-w-none">
                                <p className="text-zinc-300 leading-relaxed font-medium text-lg whitespace-pre-wrap">
                                    {selectedEmail.body}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 flex items-center justify-between bg-zinc-900/40">
                             <div className="flex items-center gap-2 text-xs text-zinc-500 font-bold">
                                <Sparkles className="w-3 h-3 text-rose-500" />
                                <span>IA puede pre-completar la tarea por ti</span>
                             </div>
                             <div className="flex gap-3">
                                <button className="px-6 py-2.5 bg-zinc-900 text-zinc-400 font-bold text-sm rounded-xl border border-white/5 hover:bg-zinc-800 transition-all flex items-center gap-2">
                                    <Forward className="w-4 h-4" />
                                    Mover a Proyecto
                                </button>
                                <button 
                                    onClick={() => handleConvertToTask(selectedEmail)}
                                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-rose-500/20"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Finalizar y Crear Tarea
                                </button>
                             </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4 opacity-30">
                        <div className="w-20 h-20 rounded-3xl border-2 border-dashed border-zinc-700 flex items-center justify-center">
                            <Mail className="w-10 h-10" />
                        </div>
                        <p className="font-black text-sm uppercase tracking-[0.3em]">Selecciona un correo</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CaptureInbox;
