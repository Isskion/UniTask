
import { useState } from 'react';
import { useFileUploader } from '@/hooks/useFileUploader';
import { Loader2, Paperclip, X, Image as ImageIcon, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentManagerProps {
    attachments?: string[];
    onAttachmentsChange: (urls: string[]) => void;
    storagePath: string;
    readOnly?: boolean;
    className?: string;
}

export function AttachmentManager({
    attachments = [],
    onAttachmentsChange,
    storagePath,
    readOnly = false,
    className
}: AttachmentManagerProps) {
    const { uploadFile, uploading, progress } = useFileUploader();
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (file: File) => {
        if (readOnly) return;

        const result = await uploadFile(file, storagePath);
        if (result) {
            onAttachmentsChange([...attachments, result.url]);
        }
    };

    const handleRemove = (urlToRemove: string) => {
        if (readOnly) return;
        onAttachmentsChange(attachments.filter(url => url !== urlToRemove));
        // Note: Actual file deletion from storage is not implemented here to avoid
        // deleting files that might be referenced elsewhere or needed for audit.
        // This accepts "orphaned files" as per the feasibility plan.
    };

    // Simplified Dropzone
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (readOnly) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                await handleUpload(file);
            }
        }
    };

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Paperclip className="w-3 h-3" />
                    Attachments ({attachments.length})
                </label>
            </div>

            {/* Gallery Grid */}
            {attachments.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {attachments.map((url, idx) => (
                        <div key={idx} className="group relative aspect-video bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                            <img
                                src={url}
                                alt={`Attachment ${idx + 1}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                // Efficiently prevent huge layout shifts, though lazy loading happens naturally in modern browsers
                                loading="lazy"
                            />

                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-zinc-800 text-zinc-300 rounded hover:text-white"
                                    title="Open full size"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                {!readOnly && (
                                    <button
                                        onClick={() => handleRemove(url)}
                                        className="p-1.5 bg-red-900/80 text-red-200 rounded hover:bg-red-900"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Area */}
            {!readOnly && (
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={cn(
                        "relative border md:border-dashed border-zinc-800 rounded-xl p-4 transition-all text-center",
                        isDragging ? "border-primary bg-primary/5" : "bg-[#0a0a0a] hover:bg-zinc-900/50",
                        uploading ? "opacity-50 pointer-events-none" : ""
                    )}
                >
                    <input
                        type="file"
                        id={`file-upload-${storagePath}`} // Unique ID
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploading}
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center justify-center py-2 space-y-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs text-zinc-500">Compressing & Uploading {Math.round(progress)}%...</span>
                        </div>
                    ) : (
                        <label
                            htmlFor={`file-upload-${storagePath}`}
                            className="cursor-pointer flex flex-col items-center justify-center py-2 space-y-1"
                        >
                            <div className="p-2 bg-zinc-900 rounded-full text-zinc-500 mb-1">
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <span className="text-sm text-zinc-400 font-medium">
                                drop image or <span className="text-primary hover:underline">browse</span>
                            </span>
                            <span className="text-[10px] text-zinc-600">
                                Max 10MB • Auto-compressed
                            </span>
                        </label>
                    )}
                </div>
            )}
        </div>
    );
}
