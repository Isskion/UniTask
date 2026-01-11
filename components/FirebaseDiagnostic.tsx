"use client";

import { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, clearIndexedDbPersistence, terminate, disableNetwork, enableNetwork, collection, query, where, getDocs } from "firebase/firestore";
import { Activity, AlertTriangle, CheckCircle2, Loader2, XCircle, RefreshCw, Wifi, WifiOff, Server, ShieldAlert, Trash2, Database, Sparkles } from "lucide-react";
import { testServerConnection } from "@/app/diagnostic-actions";
import { resetDatabase, migrateLegacyUsers } from "@/lib/maintenance";

export default function FirebaseDiagnostic() {
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [serverStatus, setServerStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);
    const [errorDetails, setErrorDetails] = useState<any>(null);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const runDiagnostic = async () => {
        setStatus('running');
        setLogs([]);
        setErrorDetails(null);
        addLog("Iniciando diagnóstico CLIENTE...");

        try {
            // 0. Network Check
            addLog(`Estado de Red (Navigator): ${navigator.onLine ? 'Online' : 'Offline'}`);

            // 1. Check Config & Auth
            const config = db.app.options;
            addLog(`Project ID: ${config.projectId}`);
            // @ts-ignore
            addLog(`Database ID: ${db._databaseId?.database || '(default)'}`);

            const user = auth.currentUser;
            addLog(`Auth Status: ${user ? 'Logged In (' + user.email + ')' : 'Not Logged In'}`);

            if (!user) {
                const errMsg = "Debes iniciar sesión para probar la escritura.";
                addLog(`⚠️ ${errMsg}`);
            }

            // 2. Test Write
            if (user) {
                addLog("Intentando ESCRIBIR en colección '_diagnostic'...");
                const testRef = doc(db, "_diagnostic", "test_connectivity");
                await setDoc(testRef, {
                    lastCheck: serverTimestamp(),
                    user: user.email,
                    agent: navigator.userAgent
                });
                addLog("✅ Escritura EXITOSA.");

                // 3. Test Read
                addLog("Intentando LEER de colección '_diagnostic'...");
                const snap = await getDoc(testRef);
                if (snap.exists()) {
                    addLog("✅ Lectura EXITOSA. Datos recibidos.");
                } else {
                    addLog("⚠️ Lectura completada pero el documento no existe (¿Latencia?).");
                }
            } else {
                addLog("⏭️ Saltando prueba de escritura (No Auth).");
            }

            setStatus('success');
            addLog("🎉 DIAGNÓSTICO CLIENTE FINALIZADO.");

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            addLog(`❌ ERROR: ${err.message}`);
            setErrorDetails({
                code: err.code,
                name: err.name,
                message: err.message,
                stack: err.stack
            });
        }
    };

    const runServerDiagnostic = async () => {
        setServerStatus('running');
        addLog("--- Iniciando diagnóstico SERVIDOR ---");
        try {
            const result = await testServerConnection();
            if (result.logs) {
                result.logs.forEach((l: string) => addLog(l));
            }

            if (result.success) {
                setServerStatus('success');
                addLog("🎉 SERVIDOR CONECTADO.");
            } else {
                setServerStatus('error');
                addLog("❌ FALLO EN SERVIDOR.");
                if (result.error) {
                    addLog(`Error Server: ${result.error.message}`);
                }
            }
        } catch (e: any) {
            setServerStatus('error');
            addLog(`❌ Error invocando Server Action: ${e.message}`);
        }
    };

    const handleClearCache = async () => {
        if (!confirm("Esto reiniciará la conexión a la base de datos y recargará la página. ¿Continuar?")) return;
        try {
            addLog("Terminando conexión...");
            await terminate(db);
            addLog("Limpiando persistencia...");
            await clearIndexedDbPersistence(db);
            alert("Caché limpiada. Recargando página...");
            window.location.reload();
        } catch (err: any) {
            alert("Error al limpiar caché: " + err.message);
        }
    };

    const handleToggleNetwork = async (online: boolean) => {
        try {
            if (online) {
                await enableNetwork(db);
                addLog("Red Firebase Habilitada.");
            } else {
                await disableNetwork(db);
                addLog("Red Firebase Deshabilitada.");
            }
        } catch (err: any) {
            addLog(`Error al cambiar red: ${err.message}`);
        }
    }

    const handleSelfRepair = async () => {
        if (!auth.currentUser) return alert("Debes iniciar sesión primero.");
        if (!confirm("⚠️ MODO DESARROLLO\n\n¿Asignarte rol de 'app_admin' y activar tu cuenta?\n\nEsto solo funcionará si las reglas de seguridad están abiertas.")) return;

        try {
            await setDoc(doc(db, "users", auth.currentUser.uid), {
                email: auth.currentUser.email,
                role: 'app_admin',
                isActive: true,
                updatedAt: serverTimestamp()
            }, { merge: true });

            alert("✅ ¡Éxito! Refresca la página para ver los cambios.");
            window.location.reload();
        } catch (e: any) {
            alert("❌ Error: " + e.message);
        }
    };

    const handleResetDB = async () => {
        if (!confirm("⚠️ ATENCIÓN: INICIALIZAR BASE DE DATOS\n\n- Se borrarán TODAS las tareas.\n- Se borrará todo el historial de proyectos y entradas semanales.\n- Se mantendrán los usuarios y tu cuenta.\n\n¿Estás seguro de que quieres reiniciar la aplicación?")) return;
        try {
            await resetDatabase();
            alert("✅ Base de datos inicializada. Recargando...");
            window.location.reload();
        } catch (e: any) {
            alert("❌ Error: " + e.message);
        }
    };

    const handleMigrateUsers = async () => {
        if (!confirm("Esto moverá usuarios de la colección 'user' a 'users'. ¿Continuar?")) return;
        try {
            const res = await migrateLegacyUsers();
            alert(res.message);
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleAuditFliping = async () => {
        setStatus('running');
        addLog("--- AUDITANDO PROYECTO 'FLIPING' ---");
        try {
            // 1. Search Global Projects
            addLog("1. Buscando en colección 'projects'...");
            const q = query(collection(db, "projects"), where("name", "==", "Fliping"));
            const curSnapshot = await getDocs(q);
            if (curSnapshot.empty) {
                addLog("⚠️ No se encontró ningún proyecto llamado 'Fliping' en la colección global.");
            } else {
                curSnapshot.forEach(doc => {
                    const d = doc.data();
                    addLog(`✅ PROYECTO GLOBAL ENCONTRADO:`);
                    addLog(`   ID: ${doc.id}`);
                    addLog(`   TenantID: ${d.tenantId}`);
                    addLog(`   Status: ${d.status}`);
                });
            }

            // 2. Check Daily Entries across Tenants
            addLog("2. Buscando en entradas diarias recientes (Tenant 1-5)...");
            const tenants = ["1", "3", "4", "5", "6"]; // Tenant 2 usually not used? Just checking common ones.
            const dateId = new Date().toISOString().split('T')[0]; // Today

            for (const tid of tenants) {
                addLog(`Checking Tenant ${tid}...`);
                // Check recent 5 days
                const recentRef = collection(db, "tenants", tid, "daily_journal");
                const qJournal = query(recentRef, where("date", "<=", dateId));
                // Just get last few
                try {
                    // We can't sort easily without index, so let's just fetch specific ID if known or iterate all?
                    // Let's try fetching TODAY specifically first
                    const docRef = doc(db, "tenants", tid, "daily_journal", dateId);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        const hasFliping = data.projects?.some((p: any) => p.name === "Fliping");
                        addLog(`   [${dateId}] Exists: ${snap.exists()}, Has Fliping: ${hasFliping}`);
                        if (hasFliping) {
                            const pData = data.projects.find((p: any) => p.name === "Fliping");
                            addLog(`   -> Status in Entry: ${pData.status}`);
                        }
                    } else {
                        addLog(`   [${dateId}] No entry for today.`);
                    }
                } catch (e: any) {
                    addLog(`   Error checking tenant ${tid}: ${e.message}`);
                }
            }

            addLog("--- AUDITORÍA FINALIZADA ---");
            setStatus('success');

        } catch (e: any) {
            console.error(e);
            setStatus('error');
            addLog(`❌ ERROR CRÍTICO: ${e.message}`);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end">
            {status === 'idle' && (
                <button
                    onClick={runDiagnostic}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold transition-transform hover:scale-105"
                >
                    <Activity className="w-4 h-4" /> Diagnosticar Conexión
                </button>
            )}

            {status !== 'idle' && (
                <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-4 w-96 max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            {status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                            {status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                            Diagnóstico Firebase
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setStatus('idle')} className="text-zinc-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4 justify-center border-b border-white/10 pb-4 flex-wrap">
                        <button onClick={handleClearCache} className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-500 px-2 py-1 rounded text-xs font-bold ring-1 ring-red-500/50">
                            <RefreshCw className="w-3 h-3" /> Limpiar Caché
                        </button>
                        <button onClick={() => handleToggleNetwork(true)} className="p-1.5 bg-green-500/20 text-green-500 rounded hover:bg-green-500/40" title="Conectar Red">
                            <Wifi className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleNetwork(false)} className="p-1.5 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/40" title="Desconectar Red">
                            <WifiOff className="w-4 h-4" />
                        </button>

                        <div className="w-full h-px bg-white/10 my-1"></div>

                        <button
                            onClick={runServerDiagnostic}
                            disabled={serverStatus === 'running'}
                            className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-2 py-1 rounded text-xs font-bold ring-1 ring-blue-500/50 w-full justify-center"
                        >
                            {serverStatus === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
                            Probar Conexión Servidor
                        </button>

                        <div className="w-full h-px bg-white/10 my-1"></div>

                        <button
                            onClick={handleSelfRepair}
                            className="flex items-center gap-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 px-2 py-2 rounded text-xs font-bold ring-1 ring-yellow-500/50 w-full justify-center"
                        >
                            <ShieldAlert className="w-3 h-3" /> Reparar Permisos (Hacerme Admin)
                        </button>


                        <div className="w-full h-px bg-white/10 my-1"></div>

                        <button
                            onClick={handleResetDB}
                            className="flex items-center gap-1 bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-2 rounded text-xs font-bold ring-1 ring-red-500 w-full justify-center"
                        >
                            <Database className="w-3 h-3" /> INICIALIZAR BD (Reset)
                        </button>

                        <div className="w-full h-px bg-white/10 my-1"></div>

                        <button
                            onClick={handleMigrateUsers}
                            className="flex items-center gap-1 bg-purple-900/50 hover:bg-purple-800 text-purple-200 px-2 py-2 rounded text-xs font-bold ring-1 ring-purple-500 w-full justify-center"
                        >
                            <Database className="w-3 h-3" /> Fix: Migrar 'user' a 'users'
                        </button>

                        <div className="w-full h-px bg-white/10 my-1"></div>

                        <button
                            onClick={handleAuditFliping}
                            className="flex items-center gap-1 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 px-2 py-2 rounded text-xs font-bold ring-1 ring-cyan-500 w-full justify-center"
                        >
                            <Sparkles className="w-3 h-3" /> Audit: Fliping
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 text-xs font-mono text-zinc-400 mb-4 bg-black/50 p-2 rounded h-48">
                        {logs.map((l, i) => (
                            <div key={i} className="border-b border-white/5 pb-1 last:border-0">{l}</div>
                        ))}
                    </div>

                    {errorDetails && (
                        <div className="bg-red-900/20 border border-red-500/30 p-2 rounded text-xs text-red-200 overflow-x-auto">
                            <p className="font-bold mb-1">Detalles del Error:</p>
                            <pre>{JSON.stringify(errorDetails, null, 2)}</pre>

                            {errorDetails.code === 'permission-denied' && (
                                <div className="mt-2 bg-red-500 text-white p-1 rounded font-bold text-center">
                                    🚨BLOQUEADO POR REGLAS DE SEGURIDAD
                                </div>
                            )}
                            {errorDetails.code === 'unavailable' && (
                                <div className="mt-2 bg-orange-500 text-white p-1 rounded font-bold text-center">
                                    🚨 OFFLINE / BLOQUEO DE RED
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
