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

    // --- RESET MODAL STATE ---
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetOptions, setResetOptions] = useState({
        tasks: true,
        journal: true,
        projects: false,
        tenants: false
    });
    const [confirmText, setConfirmText] = useState("");

    // Determine Environment Safety
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "";
    const isTestEnv = appVersion.includes("-test") || appVersion.includes("dev");

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const runDiagnostic = async () => {
        // ... (Existing runDiagnostic logic)
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
        // ... (Existing runServerDiagnostic logic)
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
        // ... (Existing handleToggleNetwork logic)
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
        // ... (Existing handleSelfRepair logic)
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

    // --- GRANULAR EXECUTION ---
    const executeReset = async () => {
        // Double check safety
        if ((resetOptions.projects || resetOptions.tenants) && !isTestEnv) {
            return alert("⛔ ACCIÓN BLOQUEADA: No puedes borrar Proyectos o Tenants en Producción.");
        }

        if (confirmText !== "BORRAR") {
            return alert("Escribe 'BORRAR' para confirmar.");
        }

        try {
            // Permission Check & Tenant Scoping
            const currentUser = auth.currentUser;
            if (!currentUser) return alert("No estás autenticado.");

            const tokenResult = await currentUser.getIdTokenResult();
            const role = typeof tokenResult.claims.role === 'number' ? tokenResult.claims.role : 0;
            const tenantId = typeof tokenResult.claims.tenantId === 'string' ? tokenResult.claims.tenantId : null;

            // IF Superadmin (role >= 50, e.g. 100), allow NULL filter (wipe all)
            // IF User/Admin (role < 50), FORCE filter by their tenantId
            const isSuper = role >= 50;

            // If they selected 'Tenants' but are not Superadmin, block it even if Test env (safety)
            if (resetOptions.tenants && !isSuper) {
                return alert("Solo un Superadmin puede borrar la colección de Tenants.");
            }

            const finalOptions = {
                ...resetOptions,
                tenantIdFilter: isSuper ? null : tenantId
            };

            await resetDatabase(finalOptions);
            alert("✅ Operación completada.");
            window.location.reload();
        } catch (e: any) {
            console.error(e); // Log full error
            alert("❌ Error: " + e.message);
        }
    };

    const handleMigrateUsers = async () => {
        // ... (Existing handleMigrateUsers logic)
        if (!confirm("Esto moverá usuarios de la colección 'user' a 'users'. ¿Continuar?")) return;
        try {
            const res = await migrateLegacyUsers();
            alert(res.message);
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleAuditFliping = async () => {
        // ... (Existing handleAuditFliping logic)
        setStatus('running');
        addLog("--- AUDITANDO PROYECTO 'FLIPING' ---");
        try {
            const q = query(collection(db, "projects"), where("name", "==", "Fliping"));
            const curSnapshot = await getDocs(q);
            if (curSnapshot.empty) {
                addLog("⚠️ No se encontró ningún proyecto llamado 'Fliping' en la colección global.");
            } else {
                curSnapshot.forEach(doc => {
                    const d = doc.data();
                    addLog(`✅ PROYECTO GLOBAL ENCONTRADO: ${doc.id} (Tenant: ${d.tenantId})`);
                });
            }
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

            {/* MAIN DIAGNOSTIC PANEL */}
            {status !== 'idle' && !showResetModal && (
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
                        {/* ... Existing utility buttons ... */}
                        <button onClick={handleClearCache} className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-500 px-2 py-1 rounded text-xs font-bold ring-1 ring-red-500/50">
                            <RefreshCw className="w-3 h-3" /> Limpiar Caché
                        </button>
                        <button onClick={() => handleToggleNetwork(true)} className="p-1.5 bg-green-500/20 text-green-500 rounded hover:bg-green-500/40" title="Conectar Red"><Wifi className="w-4 h-4" /></button>
                        <button onClick={() => handleToggleNetwork(false)} className="p-1.5 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/40" title="Desconectar Red"><WifiOff className="w-4 h-4" /></button>

                        <div className="w-full h-px bg-white/10 my-1"></div>

                        <button onClick={runServerDiagnostic} disabled={serverStatus === 'running'} className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-2 py-1 rounded text-xs font-bold ring-1 ring-blue-500/50 w-full justify-center">
                            {serverStatus === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
                            Probar Conexión Servidor
                        </button>

                        <div className="w-full h-px bg-white/10 my-1"></div>

                        <button onClick={handleSelfRepair} className="flex items-center gap-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 px-2 py-2 rounded text-xs font-bold ring-1 ring-yellow-500/50 w-full justify-center">
                            <ShieldAlert className="w-3 h-3" /> Reparar Permisos
                        </button>

                        <div className="w-full h-px bg-white/10 my-1"></div>

                        {/* REPLACED BUTTON: RESET DB -> OPEN MODAL */}
                        <button
                            onClick={() => setShowResetModal(true)}
                            className="flex items-center gap-1 bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-2 rounded text-xs font-bold ring-1 ring-red-500 w-full justify-center group"
                        >
                            <Trash2 className="w-3 h-3 group-hover:text-red-100" /> GESTIONAR DATOS (Reset)
                        </button>

                        <div className="w-full h-px bg-white/10 my-1"></div>
                        <button onClick={handleMigrateUsers} className="flex items-center gap-1 bg-purple-900/50 hover:bg-purple-800 text-purple-200 px-2 py-2 rounded text-xs font-bold ring-1 ring-purple-500 w-full justify-center"><Database className="w-3 h-3" /> Fix: Legacy Users</button>
                        <div className="w-full h-px bg-white/10 my-1"></div>
                        <button onClick={handleAuditFliping} className="flex items-center gap-1 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 px-2 py-2 rounded text-xs font-bold ring-1 ring-cyan-500 w-full justify-center"><Sparkles className="w-3 h-3" /> Audit: Fliping</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 text-xs font-mono text-zinc-400 mb-4 bg-black/50 p-2 rounded h-48">
                        {logs.map((l, i) => (<div key={i} className="border-b border-white/5 pb-1 last:border-0">{l}</div>))}
                    </div>

                    {errorDetails && (
                        <div className="bg-red-900/20 border border-red-500/30 p-2 rounded text-xs text-red-200 overflow-x-auto">
                            <pre>{JSON.stringify(errorDetails, null, 2)}</pre>
                        </div>
                    )}
                </div>
            )}

            {/* RESET MODAL */}
            {showResetModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-red-500/30 rounded-xl shadow-2xl p-6 w-96 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-red-500 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" /> Gestión de Datos
                            </h3>
                            <button onClick={() => setShowResetModal(false)}><XCircle className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
                        </div>

                        <div className="text-sm text-zinc-400">
                            Selecciona qué datos quieres eliminar permanentemente.
                            {!isTestEnv && <p className="mt-2 text-yellow-500 font-bold text-xs uppercase">⚠️ Modo Producción: Opciones destructivas bloqueadas.</p>}
                        </div>

                        <div className="space-y-3 bg-black/40 p-3 rounded-lg border border-white/5">
                            <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.tasks}
                                    onChange={e => setResetOptions({ ...resetOptions, tasks: e.target.checked })}
                                    className="w-4 h-4 accent-red-500"
                                />
                                <div>
                                    <p className="text-sm font-bold text-white">Tareas</p>
                                    <p className="text-xs text-zinc-500">Reinicia los IDs de tareas.</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={resetOptions.journal}
                                    onChange={e => setResetOptions({ ...resetOptions, journal: e.target.checked })}
                                    className="w-4 h-4 accent-red-500"
                                />
                                <div>
                                    <p className="text-sm font-bold text-white">Historial (Journal)</p>
                                    <p className="text-xs text-zinc-500">Entradas semanales y diarias.</p>
                                </div>
                            </label>

                            <div className="h-px bg-white/10 my-1"></div>

                            <label className={`flex items-center gap-3 p-2 rounded cursor-pointer ${!isTestEnv ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}`}>
                                <input
                                    type="checkbox"
                                    checked={resetOptions.projects}
                                    onChange={e => isTestEnv && setResetOptions({ ...resetOptions, projects: e.target.checked })}
                                    disabled={!isTestEnv}
                                    className="w-4 h-4 accent-red-500"
                                />
                                <div>
                                    <p className="text-sm font-bold text-red-400">Proyectos</p>
                                    <p className="text-xs text-zinc-500">Elimina TODOS los proyectos.</p>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-2 rounded cursor-pointer ${!isTestEnv ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}`}>
                                <input
                                    type="checkbox"
                                    checked={resetOptions.tenants}
                                    onChange={e => isTestEnv && setResetOptions({ ...resetOptions, tenants: e.target.checked })}
                                    disabled={!isTestEnv}
                                    className="w-4 h-4 accent-red-500"
                                />
                                <div>
                                    <p className="text-sm font-bold text-red-500 uppercase">Tenants (Nuclear)</p>
                                    <p className="text-xs text-zinc-500">Elimina clientes/entornos (menos ID 1).</p>
                                </div>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold text-zinc-400">Confirmación de Seguridad:</p>
                            <input
                                type="text"
                                placeholder="Escribe 'BORRAR'"
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-center font-bold tracking-widest text-red-500 focus:outline-none focus:border-red-500 transition-colors"
                            />
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="flex-1 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeReset}
                                disabled={confirmText !== "BORRAR"}
                                className="flex-1 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm"
                            >
                                EJECUTAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
