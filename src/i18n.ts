import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

const supportedLanguages = ['sq', 'en', 'it', 'de', 'es'];

const detectBrowserLanguage = () => {
    if (typeof window === 'undefined') return 'sq';

    const saved = window.localStorage.getItem('makina-ime-language');
    if (saved && supportedLanguages.includes(saved)) return saved;

    const browserLanguage = window.navigator.language?.slice(0, 2).toLowerCase();
    if (browserLanguage && supportedLanguages.includes(browserLanguage)) return browserLanguage;

    return 'sq';
};

i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        lng: detectBrowserLanguage(),
        fallbackLng: "en",
        supportedLngs: supportedLanguages,
        interpolation: {
            escapeValue: false
        },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        }
    });


export default i18n;
