import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminApp } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');

    if (!uid && !email) {
        return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
    }

    const result: any = {
        query: { uid, email },
        envProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        serviceAccountProjectId: process.env.FIREBASE_PROJECT_ID, // Might be undefined
        adminAppProjectId: adminApp.options.projectId,
        authRecord: null,
        firestoreDoc: null,
        firestoreExists: false,
        timestamp: new Date().toISOString()
    };

    try {
        // 1. Check Auth
        try {
            if (uid) {
                const userRecord = await adminAuth.getUser(uid);
                result.authRecord = { uid: userRecord.uid, email: userRecord.email, disabled: userRecord.disabled };
            } else if (email) {
                const userRecord = await adminAuth.getUserByEmail(email);
                result.authRecord = { uid: userRecord.uid, email: userRecord.email, disabled: userRecord.disabled };
            }
        } catch (e: any) {
            result.authError = e.message;
        }

        // 2. Check Firestore
        // Use the UID found in Auth if available, otherwise use the provided UID
        const targetUid = result.authRecord?.uid || uid;

        if (targetUid) {
            const docRef = adminDb.collection('users').doc(targetUid);
            const snapshot = await docRef.get();
            result.firestoreExists = snapshot.exists;
            result.firestorePath = docRef.path;
            if (snapshot.exists) {
                const data = snapshot.data();
                result.firestoreDoc = {
                    tenantId: data?.tenantId,
                    role: data?.role,
                    email: data?.email,
                    uid: data?.uid
                };
            }
        } else {
            result.firestoreError = "Could not determine UID for Firestore lookup";
        }

        return NextResponse.json(result);

    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack,
            ...result
        }, { status: 500 });
    }
}
