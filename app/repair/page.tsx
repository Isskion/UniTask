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

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <h1>🛠️ Reparación de Cuenta (Zombie Session)</h1>
            <p>Utiliza esta herramienta si tienes problemas para iniciar sesión o ves errores de "Perfil no encontrado".</p>

            <div style={{ margin: '2rem 0', display: 'flex', gap: '1rem' }}>
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
                    {status === 'loading' ? 'Reparando...' : 'Reparar Ahora'}
                </button>
            </div>

            {logs.length > 0 && (
                <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', border: '1px solid #ddd' }}>
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
