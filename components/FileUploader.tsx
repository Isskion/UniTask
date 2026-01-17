"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Loader2, CheckCircle } from "lucide-react";
// import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// import { storage } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface FileUploaderProps {
    tenantId: string;
    taskId?: string; // Optional: If new task, we might upload to a temp folder or just use "new" and move later? Better: require ID or use a temp ID.
    onUploadComplete: (file: { name: string; url: string; type: string; size: number }) => void;
    className?: string;
}

export function FileUploader({ tenantId, taskId, onUploadComplete, className }: FileUploaderProps) {
    const { user } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file) return;
        if (file.type !== "application/pdf") {
            alert("Solo se permiten archivos PDF por ahora.");
            return;
        }

        if (!user) return;

        setUploading(true);
        setProgress(10);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("tenantId", tenantId);
            formData.append("taskId", taskId || "temp");

            // Mock progress since fetch doesn't support it natively easily
            const timer = setInterval(() => {
                setProgress((prev) => (prev < 90 ? prev + 10 : prev));
            }, 300);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            clearInterval(timer);

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Upload failed");
            }

            const data = await res.json();
            setProgress(100);

            onUploadComplete({
                name: data.name,
                url: data.url,
                type: data.type,
                size: data.size
            });

            setUploading(false);
            setProgress(0);

        } catch (e) {
            console.error("Error initiating upload:", e);
            alert("Error al subir el archivo (Proxy Mode).");
            setUploading(false);
            setProgress(0);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className={cn("w-full", className)}>
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all",
                    isDragging
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-zinc-700 hover:border-zinc-500 hover:bg-white/5",
                    uploading && "pointer-events-none opacity-50"
                )}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/pdf"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />

                {uploading ? (
                    <div className="flex flex-col items-center w-full">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden max-w-[200px]">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-zinc-400 mt-2">Subiendo... {Math.round(progress)}%</p>
                    </div>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                            <Upload className="w-5 h-5 text-zinc-400" />
                        </div>
                        <p className="text-sm font-medium text-zinc-300">
                            Haz clic o arrastra un PDF aquí
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                            Máximo 10MB
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
