"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage';
import { db } from '@/lib/firebase';
import { useFileUploader } from '@/hooks/useFileUploader';
import { TenantLogo } from '@/types';
import { Upload, Trash2, Loader2, Image as ImageIcon, Plus } from 'lucide-react';

function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

export default function TenantLogoManager() {
    const { tenantId } = useAuth();
    const { showToast } = useToast();
    const { uploadFile, uploading, progress } = useFileUploader();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [logos, setLogos] = useState<TenantLogo[]>([]);
    const [loading, setLoading] = useState(true);
    const [newLabel, setNewLabel] = useState('Logo Principal');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (tenantId) loadLogos();
    }, [tenantId]);

    const loadLogos = async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
            if (tenantDoc.exists()) {
                const data = tenantDoc.data();
                setLogos(data.logos || []);
            }
        } catch (err) {
            console.error('Error loading tenant logos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenantId) return;

        if (!file.type.startsWith('image/')) {
            showToast('Error', 'Solo se permiten archivos de imagen.', 'error');
            return;
        }

        const result = await uploadFile(file, `tenants/${tenantId}/logos`);
        if (!result) {
            showToast('Error', 'No se pudo subir el logo.', 'error');
            return;
        }

        const newLogo: TenantLogo = {
            id: generateId(),
            label: newLabel.trim() || 'Logo',
            url: result.url,
            storagePath: result.path,
            uploadedAt: new Date().toISOString(),
        };

        const updatedLogos = [...logos, newLogo];

        try {
            await updateDoc(doc(db, 'tenants', tenantId), {
                logos: updatedLogos,
                // Also set the first logo as the legacy logoUrl for backward compat
                logoUrl: updatedLogos[0]?.url || null,
                updatedAt: serverTimestamp(),
            });
            setLogos(updatedLogos);
            setNewLabel('Logo Principal');
            showToast('Logo subido', `${newLogo.label} guardado correctamente.`, 'success');
        } catch (err) {
            console.error('Error saving logo:', err);
            showToast('Error', 'No se pudo guardar el logo.', 'error');
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDelete = async (logo: TenantLogo) => {
        if (!tenantId || !confirm(`¿Eliminar "${logo.label}"?`)) return;

        setDeletingId(logo.id);
        try {
            // Delete from Storage
            try {
                const storage = getStorage();
                const fileRef = storageRef(storage, logo.storagePath);
                await deleteObject(fileRef);
            } catch (storageErr) {
                console.warn('Could not delete file from storage (may already be gone):', storageErr);
            }

            // Update Firestore
            const updatedLogos = logos.filter(l => l.id !== logo.id);
            await updateDoc(doc(db, 'tenants', tenantId), {
                logos: updatedLogos,
                logoUrl: updatedLogos[0]?.url || null,
                updatedAt: serverTimestamp(),
            });
            setLogos(updatedLogos);
            showToast('Eliminado', `${logo.label} eliminado.`, 'success');
        } catch (err) {
            console.error('Error deleting logo:', err);
            showToast('Error', 'No se pudo eliminar el logo.', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Logos de Empresa</h3>
                <p className="text-sm text-muted-foreground">
                    Sube los logos de tu empresa para usarlos en las plantillas UniDocs. Puedes tener varios (principal, secundario, certificaciones...).
                </p>
            </div>

            {/* Existing logos */}
            {loading ? (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Cargando logos...</span>
                </div>
            ) : logos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {logos.map(logo => (
                        <div key={logo.id} className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-3 group hover:border-primary/40 transition-colors">
                            <div className="w-full h-24 bg-white rounded-lg flex items-center justify-center p-2 border border-border">
                                <img
                                    src={logo.url}
                                    alt={logo.label}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                                />
                            </div>
                            <div className="text-center w-full">
                                <p className="text-sm font-bold text-foreground truncate">{logo.label}</p>
                            </div>
                            <button
                                onClick={() => handleDelete(logo)}
                                disabled={deletingId === logo.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                            >
                                {deletingId === logo.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                                Eliminar
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-secondary/20 border border-dashed border-border rounded-xl p-8 text-center">
                    <ImageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">No hay logos configurados todavía</p>
                </div>
            )}

            {/* Upload new logo */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Añadir Logo
                </h4>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-muted-foreground block mb-1">Etiqueta</label>
                        <input
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                            placeholder="Ej: Logo Principal, ISO 9001..."
                        />
                    </div>
                    <div className="flex items-end">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {Math.round(progress)}%
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Subir Imagen
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
