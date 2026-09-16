import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { postSoapProxy } from '@/lib/soapProxy';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const { t, i18n } = useTranslation();
    const setToken = useAppStore((s) => s.setToken);
    const setOrderUrl = useAppStore((s) => s.setOrderUrl);
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

            // Build auth URL — same path as original app.js login()
            let serviceUrl = baseUrl;
            if (!serviceUrl.toLowerCase().includes('service.asmx')) {
                serviceUrl = `${baseUrl}/Mapi/Soap/Auth/service.asmx`;
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

            // Use resilient SOAP proxy with dual-route fallback
            const apiRes = await postSoapProxy({
                url: serviceUrl,
                action: 'http://unisolutions.com.ar/Login',
                version: '1.2',
                body: body,
            });
            const res = await apiRes.json();

            if (!res.ok) {
                setError(`Error de conexión: ${res.statusText}`);
                setLoading(false);
                return;
            }

            // Parse token — check MapiToken first, then LoginResult
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
            setOrderUrl(serviceUrl.replace(/\/Auth\//i, '/Logistic/'));
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
        useAppStore.getState().setCurrentLanguage(lang);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-900/30 overflow-hidden border border-slate-100">
                {/* Logo Header */}
                <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.15),transparent_70%)]" />
                    <img src="/Logo_Login.jpg" alt="UNIGIS" className="relative h-14 mx-auto mb-3 rounded-xl ring-2 ring-white/20 shadow-lg" />
                    <h2 className="relative text-xl font-bold text-white">🔗 {t('login.title')}</h2>
                    <p className="relative text-xs text-slate-400 mt-1">UniTask Platinum · Order Creator</p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Language */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('login.language')}</label>
                        <select
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all"
                            value={i18n.language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                        >
                            <option value="es">🇪🇸 Español</option>
                            <option value="en">🇬🇧 English</option>
                            <option value="fr">🇫🇷 Français</option>
                            <option value="de">🇩🇪 Deutsch</option>
                            <option value="it">🇮🇹 Italiano</option>
                            <option value="ca">🇪🇸 Català</option>
                        </select>
                    </div>

                    {/* URL */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('login.url')}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://tu-ambiente.unigis.com"
                        />
                    </div>

                    {/* User */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('login.username')}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            placeholder="Usuario MAPI"
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('login.password')}</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all"
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                placeholder="Contraseña"
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/50 accent-indigo-600"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                        />
                        <span className="text-sm text-slate-600">Recordar credenciales</span>
                    </label>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button
                        className="flex-1 px-4 py-2.5 text-sm font-semibold bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all"
                        onClick={onClose}
                    >
                        {t('buttons.close')}
                    </button>
                    <button
                        className="flex-1 px-4 py-2.5 text-sm font-bold bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 transition-all disabled:opacity-50 disabled:hover:shadow-lg"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? '⏳ Conectando...' : t('login.loginButton')}
                    </button>
                </div>
            </div>
        </div>
    );
}
