export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaInstallState {
    canPrompt: boolean;
    installed: boolean;
}

interface PwaInstallBridge {
    deferredPrompt: BeforeInstallPromptEvent | null;
    installed: boolean;
    subscribe: (listener: () => void) => () => void;
}

declare global {
    interface Window {
        __makinaPwaInstallBridge?: PwaInstallBridge;
    }
}

const isStandalone = () => {
    if (typeof window === 'undefined') return false;
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
};

const bridge = typeof window === 'undefined' ? undefined : window.__makinaPwaInstallBridge;
let deferredPrompt: BeforeInstallPromptEvent | null = bridge?.deferredPrompt || null;
let state: PwaInstallState = { canPrompt: Boolean(deferredPrompt), installed: isStandalone() || bridge?.installed === true };
const listeners = new Set<() => void>();

const publish = (next: PwaInstallState) => {
    if (next.canPrompt === state.canPrompt && next.installed === state.installed) return;
    state = next;
    listeners.forEach((listener) => listener());
};

if (typeof window !== 'undefined') {
    if (bridge) {
        bridge.subscribe(() => {
            deferredPrompt = bridge.deferredPrompt;
            publish({ canPrompt: Boolean(deferredPrompt), installed: isStandalone() || bridge.installed });
        });
    } else {
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredPrompt = event as BeforeInstallPromptEvent;
            publish({ canPrompt: true, installed: false });
        });

        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            publish({ canPrompt: false, installed: true });
        });
    }

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
    if (bridge) bridge.deferredPrompt = null;
    publish({ canPrompt: false, installed: false });
    try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        return choice.outcome;
    } catch {
        return 'unavailable';
    }
};
