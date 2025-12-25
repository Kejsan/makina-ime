import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// TODO: Move translations to separate JSON files later
const resources = {
    sq: {
        translation: {
            "Welcome": "Mirësevini",
            "Sign In": "Hyni",
            "Sign Up": "Regjistrohuni",
            "Dashboard": "Paneli",
            "Add Vehicle": "Shto Mjet",
            "My Vehicles": "Mjetet e Mia"
        }
    },
    en: {
        translation: {
            "Welcome": "Welcome",
            "Sign In": "Sign In",
            "Sign Up": "Sign Up",
            "Dashboard": "Dashboard",
            "Add Vehicle": "Add Vehicle",
            "My Vehicles": "My Vehicles"
        }
    },
    it: {
        translation: {
            "Welcome": "Benvenuto",
            "Sign In": "Accedi",
            "Sign Up": "Iscriviti",
            "Dashboard": "Cruscotto",
            "Add Vehicle": "Aggiungi Veicolo",
            "My Vehicles": "I Miei Veicoli"
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "sq", // Default language (Albanian)
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
