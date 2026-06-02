import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import locale files statically
import es from './locales/es.json';
import en from './locales/en.json';

const resources = {
    es: { translation: es },
    en: { translation: en },
};

// Detect saved language
const savedLang = (typeof window !== 'undefined' && localStorage.getItem('unigis-language')) || 'es';

i18n.use(initReactI18next).init({
    resources,
    lng: savedLang,
    fallbackLng: 'es',
    interpolation: {
        escapeValue: false, // React handles XSS
    },
});

export default i18n;
