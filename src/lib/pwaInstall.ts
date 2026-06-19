export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaInstallState {
    canPrompt: boolean;
    installed: boolean;
}

const isStandalone = () => {
    if (typeof window === 'undefined') return false;
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let state: PwaInstallState = { canPrompt: false, installed: isStandalone() };
const listeners = new Set<() => void>();

const publish = (next: PwaInstallState) => {
    if (next.canPrompt === state.canPrompt && next.installed === state.installed) return;
    state = next;
    listeners.forEach((listener) => listener());
};

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event as BeforeInstallPromptEvent;
        publish({ canPrompt: true, installed: false });
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        publish({ canPrompt: false, installed: true });
    });

    window.matchMedia('(display-mode: standalone)').addEventListener('change', () => {
        const installed = isStandalone();
        publish({ canPrompt: installed ? false : Boolean(deferredPrompt), installed });
    });
}

export const subscribePwaInstall = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const getPwaInstallState = () => state;

export const requestPwaInstall = async (): Promise<'accepted' | 'dismissed' | 'installed' | 'unavailable'> => {
    if (state.installed) return 'installed';
    const prompt = deferredPrompt;
    if (!prompt) return 'unavailable';

    deferredPrompt = null;
    publish({ canPrompt: false, installed: false });
    try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        return choice.outcome;
    } catch {
        return 'unavailable';
    }
};

