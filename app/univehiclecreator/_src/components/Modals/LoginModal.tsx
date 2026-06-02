import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { t, i18n } = useTranslation();
    const setToken = useAppStore((s) => s.setToken);
    const setServiceUrl = useAppStore((s) => s.setServiceUrl);
    const setRole = useAppStore((s) => s.setRole);
    const setCurrentUser = useAppStore((s) => s.setCurrentUser);

    const [url, setUrl] = useState(() =>
        typeof window !== 'undefined' ? (localStorage.getItem('unigis_url') || 'https://') : 'https://'
    );
    const [user, setUser] = useState(() =>
        typeof window !== 'undefined' ? (localStorage.getItem('unigis_user') || '') : ''
    );
    const [pass, setPass] = useState(() =>
        typeof window !== 'undefined' ? (localStorage.getItem('unigis_pass') || '') : ''
    );
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const handleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const baseUrl = url.replace(/\/+$/, '');

            // Build auth URL
            let authServiceUrl = baseUrl;
            if (!authServiceUrl.toLowerCase().includes('service.asmx')) {
                authServiceUrl = `${baseUrl}/Mapi/Soap/Auth/service.asmx`;
            }

            // SOAP 1.2 envelope with unisolutions namespace
            const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:unis="http://unisolutions.com.ar/">
  <soap:Header/>
  <soap:Body>
    <unis:Login>
      <unis:user>${user}</unis:user>
      <unis:password>${pass}</unis:password>
      <unis:system>Mapi</unis:system>
    </unis:Login>
  </soap:Body>
</soap:Envelope>`;

            // Use same CORS SOAP proxy
            const apiRes = await fetch('https://europe-west1-minuta-f75a4.cloudfunctions.net/unigisSoapProxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: authServiceUrl,
                    action: 'http://unisolutions.com.ar/Login',
                    version: '1.2',
                    body: body,
                }),
            });
            const res = await apiRes.json();

            if (!res.ok) {
                setError(`Error de conexión: ${res.statusText}`);
                setLoading(false);
                return;
            }

            // Parse token
            const parser = new DOMParser();
            const doc = parser.parseFromString(res.text, 'text/xml');
            let token = doc.getElementsByTagName('MapiToken')[0]?.textContent || '';
            if (!token) {
                token = doc.getElementsByTagName('LoginResult')[0]?.textContent || '';
            }

            if (!token || token.length <= 5) {
                const faultString = doc.getElementsByTagName('faultstring')[0]?.textContent;
                setError(faultString || 'Credenciales inválidas o error de login');
                setLoading(false);
                return;
            }

            // Save credentials
            if (remember) {
                localStorage.setItem('unigis_url', url);
                localStorage.setItem('unigis_user', user);
                localStorage.setItem('unigis_pass', pass);
            }

            setToken(token);
            // Replace Auth with Logistic for vehicle uploads
            const logisticUrl = authServiceUrl.replace(/\/Auth\//i, '/Logistic/');
            setServiceUrl(logisticUrl);
            setRole('admin');
            setCurrentUser(user);
            onClose();
        } catch (err) {
            setError(`Error de conexión: ${err instanceof Error ? err.message : 'Failed to fetch'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('unigis-language', lang);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-200">
                {/* Logo Header */}
                <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 text-center border-b border-slate-800">
                    <img src="/LogoApp.jpg" alt="UNIGIS" className="h-10 mx-auto mb-3 rounded-lg ring-1 ring-white/10 shadow-lg object-contain" />
                    <h2 className="text-lg font-bold text-white">🔗 Conectarse a UNIGIS</h2>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Vehicle Creator</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Language */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('login.language')}</label>
                        <select
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            value={i18n.language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                        >
                            <option value="es">🇪🇸 Español</option>
                            <option value="en">🇬🇧 English</option>
                            <option value="ca">🇪🇸 Català</option>
                        </select>
                    </div>

                    {/* URL */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL del Servidor</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://tu-ambiente.unigis.com"
                        />
                    </div>

                    {/* User */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuario MAPI</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            placeholder="Usuario"
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-3 py-2 pr-10 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                placeholder="Contraseña"
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁‍🗨' : '👁'}
                            </button>
                        </div>
                    </div>

                    {/* Remember */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-650 focus:ring-0 cursor-pointer accent-indigo-500"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                        />
                        <span className="text-xs text-slate-400 font-medium">Recordar credenciales</span>
                    </label>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-xl text-xs text-red-300 font-semibold leading-relaxed">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 flex gap-3">
                    <button
                        className="flex-1 px-4 py-2 text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-755 transition-all cursor-pointer"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                    <button
                        className="flex-1 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-650/20 hover:shadow-indigo-650/40 transition-all disabled:opacity-50 cursor-pointer"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? '⏳ Conectando...' : 'Conectar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
