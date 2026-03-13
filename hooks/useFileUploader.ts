
import { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';

interface UploadResult {
    url: string;
    path: string;
    name: string;
    size: number;
    type: string;
}

interface UseFileUploaderReturn {
    uploadFile: (file: File, path: string) => Promise<UploadResult | null>;
    uploading: boolean;
    progress: number;
    error: string | null;
}

export function useFileUploader(): UseFileUploaderReturn {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const { tenantId } = useAuth(); // Ensure tenant context if needed, though path usually dictates location

    const compressImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }

                // Max dimensions — higher cap for screenshots with dense text
                const MAX_WIDTH = 4096;
                const MAX_HEIGHT = 4096;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // PNG for screenshots/text (lossless) — JPEG destroys text readability
                const isPng = file.type === 'image/png' || file.type === '';
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Compression failed'));
                        }
                    },
                    isPng ? 'image/png' : 'image/jpeg',
                    isPng ? undefined : 0.9
                );
            };
            img.onerror = (err) => reject(err);
        });
    };

    const uploadFile = async (originalFile: File, path: string): Promise<UploadResult | null> => {
        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            // 1. Compress if image
            console.log("Starting upload process for:", originalFile.name);
            let fileToUpload: Blob = originalFile;
            if (originalFile.type.startsWith('image/')) {
                try {
                    console.log("Attempting compression...");
                    fileToUpload = await compressImage(originalFile);
                    console.log("Compression success. New size:", fileToUpload.size);
                } catch (compressionErr) {
                    console.warn('Image compression failed, uploading original.', compressionErr);
                }
            } else {
                console.log("Not an image, skipping compression.");
            }

            // 2. Prepare Storage Ref
            const storage = getStorage();
            // Ensure unique filename to prevent overwrites if not handled by caller
            const timestamp = Date.now();
            const originalName = originalFile.name || "pasted-image.jpg"; // Fallback for pasted blobs
            const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fullPath = `${path}/${timestamp}_${safeName}`;
            const storageRef = ref(storage, fullPath);

            // 3. Upload
            const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Upload Progress: ${p.toFixed(2)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes})`);
                        setProgress(p);
                    },
                    (err) => {
                        console.error('Upload Error:', err);
                        setError(err.message);
                        setUploading(false);
                        resolve(null);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        setUploading(false);
                        resolve({
                            url: downloadURL,
                            path: fullPath,
                            name: safeName,
                            size: fileToUpload.size,
                            type: originalFile.type
                        });
                    }
                );
            });

        } catch (err: any) {
            console.error('Upload Process Error:', err);
            setError(err.message || 'Unknown error');
            setUploading(false);
            return null;
        }
    };

    return { uploadFile, uploading, progress, error };
}
