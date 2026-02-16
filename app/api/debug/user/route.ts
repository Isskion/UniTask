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
        // @ts-ignore - databaseId might be internal or part of options
        databaseId: (adminDb as any).databaseId || adminApp.options.databaseURL,
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
            result.authError = `${e.code || 'unknown'}: ${e.message}`; // Capture code and message
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
                // Flatten data for easier reading in alerts
                result.firestoreDoc = {
                    SHARD: 'Direct Read',
                    EXISTS: true,
                    uid_field: data?.uid,
                    tenantId: data?.tenantId,
                    role: data?.role,
                    roleLevel: data?.roleLevel,
                    email: data?.email,
                    _fullData: JSON.stringify(data).substring(0, 200) + '...' // Truncate to avoid massive payloads
                };
            } else {
                result.firestoreDoc = { EXISTS: false, reason: "Snapshot.exists is false" };
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
