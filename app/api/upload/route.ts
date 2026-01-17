import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const tenantId = formData.get("tenantId") as string;
        const taskId = formData.get("taskId") as string;

        if (!file || !tenantId) {
            return NextResponse.json({ error: "Missing file or tenantId" }, { status: 400 });
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json({ error: "Only PDFs are allowed" }, { status: 400 });
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Path: tenants/{tenantId}/tasks/{taskId}/attachments/{filename}
        // Ensure taskId is safe (if "new" or undefined, use "temp")
        const safeTaskId = taskId || "temp_uploads";
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
        const filePath = `tenants/${tenantId}/tasks/${safeTaskId}/attachments/${fileName}`;

        const bucket = adminStorage.bucket();
        // Note: bucket() uses default bucket if not specified in config. 
        // We added storageBucket to config in previous step.

        const fileRef = bucket.file(filePath);

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // Make public or get signed URL?
        // Making public requires making the object public (ACL). 
        // Signed URL is safer but expires. Long expiration is practical for this use case.
        // OR getDownloadURL() if we use the client SDK logic server-side... but Admin SDK uses Signed URLs.
        // Let's use a signed URL valid for 100 years (effectively permanent for this app scope) or make it public.
        // To make it truly public (accessible by client SDK getDownloadURL format), we need to add a specific token metadata.
        // EASIER: Just return a Signed URL for Read.

        const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-09-2491', // Max date
        });

        // For CLIENT SDK compatibility (if we want to list files using client SDK later), 
        // we might prefer standard Firebase tokens.
        // But since we store the URL in the Task document, the Signed URL is fine.

        return NextResponse.json({
            success: true,
            name: file.name,
            url: url,
            type: file.type,
            size: file.size
        });

    } catch (error: any) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
    }
}
