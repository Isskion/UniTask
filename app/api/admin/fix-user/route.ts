import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const { email, problemUid } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const log: string[] = [];
        const logFn = (msg: string) => log.push(msg);

        logFn(`🔧 INICIANDO AUTO-REPARACIÓN para: ${email}`);
        logFn(`🔍 UID Problemático reportado: ${problemUid || 'No especificado'}`);

        // 1. Obtener usuario actual por email
        let currentUser;
        try {
            currentUser = await adminAuth.getUserByEmail(email);
            logFn(`✅ Usuario actual encontrado en Auth: ${currentUser.uid}`);
        } catch (e: any) {
            logFn(`❌ Error buscando usuario por email: ${e.message}`);
            return NextResponse.json({ success: false, log, error: 'User not found' }, { status: 404 });
        }

        // 2. Verificar discrepancia de UIDs (si se proporcionó problemUid)
        if (problemUid && currentUser.uid !== problemUid) {
            logFn(`⚠️  UIDs diferentes detectados: Reportado[${problemUid}] vs Real[${currentUser.uid}]`);

            // 3. Verificar si hay datos en UID antiguo
            const oldDocRef = adminDb.collection('users').doc(problemUid);
            const oldDoc = await oldDocRef.get();

            if (oldDoc.exists) {
                logFn('📦 Datos encontrados en UID antiguo. Migrando...');

                const oldData = oldDoc.data();
                const newDocRef = adminDb.collection('users').doc(currentUser.uid);

                // Migrar datos
                await newDocRef.set({
                    ...oldData,
                    uid: currentUser.uid,
                    email: currentUser.email,
                    _migratedFrom: problemUid,
                    _migratedAt: FieldValue.serverTimestamp()
                });
                logFn(`✅ Datos copiados al nuevo UID: ${currentUser.uid}`);

                // Marcar antiguo como migrado
                await oldDocRef.update({
                    _migrated: true,
                    _migratedTo: currentUser.uid,
                    _migratedAt: FieldValue.serverTimestamp()
                });
                logFn('✅ Documento antiguo marcado como migrado.');
            } else {
                logFn('⚠️  No hay datos en UID antiguo para migrar.');
            }
        }

        // 4. Verificar si el UID ACTUAL tiene documento
        const currentDocRef = adminDb.collection('users').doc(currentUser.uid);
        const currentDoc = await currentDocRef.get();
        let userData = currentDoc.exists ? currentDoc.data() : null;

        if (!currentDoc.exists) {
            logFn('❌ Nuevo UID no tiene documento en Firestore. Creando perfil básico...');

            userData = {
                uid: currentUser.uid,
                email: currentUser.email,
                createdAt: FieldValue.serverTimestamp(),
                tenantId: '1', // Default to Tenant 1 if unknown, or safe fallback
                role: 'usuario_externo', // Safe default
                accessScopes: {
                    regionIds: [], // Empty for safety
                    divisionIds: []
                },
                photoURL: currentUser.photoURL || "",
                displayName: currentUser.displayName || email.split('@')[0]
            };

            await currentDocRef.set(userData);
            logFn('✅ Documento creado para nuevo UID.');
        } else {
            logFn('✅ El UID actual ya tiene documento.');
        }

        // 5. Restaurar Custom Claims
        if (userData && userData.tenantId) {
            const claims = {
                tId: userData.tenantId,
                role: userData.role || 'usuario_externo',
                roleLevel: userData.roleLevel || 10,
                // Simple logic for Global check, ideally check wildcard in scopes
                isGlobal: false
            };
            // Check for explicit global scope if logic exists, for now basic claims

            await adminAuth.setCustomUserClaims(currentUser.uid, claims);
            logFn(`✅ Custom Claims restaurados: ${JSON.stringify(claims)}`);
        }

        // 6. Revocar Tokens (Hard Logout)
        if (problemUid && problemUid !== currentUser.uid) {
            try {
                await adminAuth.revokeRefreshTokens(problemUid);
                logFn('✅ Tokens del UID antiguo revocados.');
            } catch (e) {
                logFn('⚠️  No se pudieron revocar tokens antiguos (tal vez el usuario Auth no existe).');
            }
        }

        await adminAuth.revokeRefreshTokens(currentUser.uid);
        logFn('✅ Tokens del UID actual revocados. Se requerirá login de nuevo.');

        return NextResponse.json({
            success: true,
            migrated: problemUid && currentUser.uid !== problemUid,
            currentUid: currentUser.uid,
            log
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
