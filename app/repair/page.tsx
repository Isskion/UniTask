'use client';
import { useState } from 'react';

export default function RepairPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [logs, setLogs] = useState<string[]>([]);

    const handleRepair = async () => {
        if (!email) return alert("Ingresa tu email");

        setStatus('loading');
        setLogs(["Iniciando reparación para: " + email + "..."]);

        try {
            const res = await fetch('/api/admin/fix-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            const data = await res.json();

            if (data.log) {
                setLogs(prev => [...prev, ...data.log]);
            }

            if (res.ok && data.success) {
                setStatus('success');
            } else {
                setStatus('error');
                setLogs(prev => [...prev, "❌ ERROR: " + (data.error || "Desconocido")]);
            }

        } catch (e: any) {
            setStatus('error');
            setLogs(prev => [...prev, "💥 EXCEPCIÓN: " + e.message]);
        }
    };

    const handleLocalRepair = async () => {
        if (!confirm("Esto cerrará tu sesión y borrará datos temporales del navegador. ¿Seguro?")) return;

        setLogs(prev => [...prev, "🧹 Iniciando limpieza local..."]);
        try {
            // 1. Clear Storage
            localStorage.clear();
            sessionStorage.clear();
            setLogs(prev => [...prev, "✅ LocalStorage y SessionStorage limpios."]);

            // 2. Clear IndexedDB (Firebase Auth)
            if (window.indexedDB && window.indexedDB.databases) {
                const dbs = await window.indexedDB.databases();
                for (const db of dbs) {
                    if (db.name?.includes('firebase')) {
                        window.indexedDB.deleteDatabase(db.name);
                        setLogs(prev => [...prev, `✅ Base de datos borrada: ${db.name}`]);
                    }
                }
            } else {
                setLogs(prev => [...prev, "⚠️ Tu navegador no soporta limpieza avanzada de IndexedDB. Intenta borrar caché manualmente."]);
            }

            // 3. Force Reload
            setLogs(prev => [...prev, "🔄 Recargando la página..."]);
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (e: any) {
            setLogs(prev => [...prev, "❌ Error limpieza local: " + e.message]);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <h1>🛠️ Reparación de Cuenta (Zombie Session)</h1>
            <p>Utiliza esta herramienta si tienes problemas para iniciar sesión o ves errores de "Perfil no encontrado".</p>

            <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '4px', marginBottom: '2rem', border: '1px solid #ffeeba' }}>
                <h3>Opción A: Limpieza Local (Intenta esto primero)</h3>
                <p>Borra tu sesión "zombie" del navegador y te obliga a entrar de nuevo.</p>
                <button
                    onClick={handleLocalRepair}
                    style={{ padding: '0.5rem 1rem', background: '#ffc107', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    🧹 Limpiar Sesión y Recargar
                </button>
            </div>

            <div style={{ margin: '2rem 0', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                <h3>Opción B: Reparación en Servidor (Avanzado)</h3>
                <p>Usa esto si la Opción A no funciona y Vercel tiene permisos configurados.</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="email"
                        placeholder="Tu email corporativo"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ padding: '0.5rem', flex: 1, border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <button
                        onClick={handleRepair}
                        disabled={status === 'loading'}
                        style={{
                            padding: '0.5rem 1rem',
                            background: status === 'loading' ? '#ccc' : '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: status === 'loading' ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {status === 'loading' ? 'Reparando...' : 'Reparar en Servidor'}
                    </button>
                </div>
            </div>

            {logs.length > 0 && (
                <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', border: '1px solid #ddd', marginTop: '2rem' }}>
                    <h3>Log de Operaciones:</h3>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#333' }}>
                        {logs.join('\n')}
                    </pre>
                </div>
            )}

            {status === 'success' && (
                <div style={{ marginTop: '2rem', padding: '1rem', background: '#d4edda', color: '#155724', borderRadius: '4px' }}>
                    <h2>✅ Reparación Exitosa</h2>
                    <p>Tu cuenta ha sido sincronizada. Por favor sigue estos pasos:</p>
                    <ol>
                        <li>Cierra esta pestaña.</li>
                        <li><strong>Borra el caché de tu navegador</strong> (Opcional pero recomendado).</li>
                        <li>Vuelve a la página de inicio.</li>
                        <li>Inicia sesión con tu email y contraseña.</li>
                    </ol>
                    <br />
                    <a href="/" style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Ir al Inicio</a>
                </div>
            )}
        </div>
    );
}
