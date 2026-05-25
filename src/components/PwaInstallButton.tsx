import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { AppSurface } from './ui/design-system';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isRunningStandalone = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
};

const isMobileBrowser = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches || /android|iphone|ipad|ipod/i.test(window.navigator.userAgent);
};

const installOfferStorageKey = 'makina-ime-install-offer-dismissed';

export const PwaInstallButton = ({ compact = false, autoOffer = false }: { compact?: boolean; autoOffer?: boolean }) => {
    const { t } = useTranslation();
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showOffer, setShowOffer] = useState(false);
    const [installed, setInstalled] = useState(isRunningStandalone);

    const isIos = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    }, []);

    useEffect(() => {
        if (installed) return;

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };
        const handleInstalled = () => setInstalled(true);

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, [installed]);

    useEffect(() => {
        if (!autoOffer || installed || !isMobileBrowser()) return;
        if (window.localStorage.getItem(installOfferStorageKey) === 'true') return;

        const timeout = window.setTimeout(() => setShowOffer(true), 1200);
        return () => window.clearTimeout(timeout);
    }, [autoOffer, installed]);

    if (installed) return null;

    const startInstall = async () => {
        setShowOffer(false);

        if (installPrompt) {
            await installPrompt.prompt();
            await installPrompt.userChoice;
            setInstallPrompt(null);
            return;
        }

        setShowInstructions(true);
    };

    const dismissOffer = () => {
        window.localStorage.setItem(installOfferStorageKey, 'true');
        setShowOffer(false);
    };

    const overlays = (
        <>
            {showOffer && (
                <div className="install-offer-panel fixed inset-x-3 z-50 max-w-[calc(100vw-1.5rem)] overflow-hidden md:hidden">
                    <AppSurface className="border-primary/30 p-4 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Download className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm font-bold">{t('Install Makina Ime')}</h2>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {t('Install this app on your phone for faster access and PWA reminders.')}
                                </p>
                                <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                                    <Button type="button" size="sm" className="h-9 flex-1" onClick={startInstall}>
                                        {t('Install App')}
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" className="h-9" onClick={dismissOffer}>
                                        {t('Not now')}
                                    </Button>
                                </div>
                            </div>
                            <button type="button" className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={dismissOffer} aria-label={t('Close')} title={t('Close')}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </AppSurface>
                </div>
            )}

            {showInstructions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <AppSurface className="app-dialog-panel w-full max-w-sm p-5 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold">{t('Install Makina Ime')}</h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {isIos
                                        ? t('Use your browser menu and choose Add to Home Screen.')
                                        : t('Install this app on your phone for faster access and PWA reminders.')}
                                </p>
                            </div>
                            <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => setShowInstructions(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <Button className="w-full" onClick={() => setShowInstructions(false)}>{t('Close')}</Button>
                    </AppSurface>
                </div>
            )}
        </>
    );

    return (
        <>
            <Button type="button" variant="outline" size={compact ? 'icon' : 'sm'} onClick={startInstall} title={t('Install App')} aria-label={t('Install App')}>
                <Download className={compact ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
                {!compact && t('Install App')}
            </Button>
            {typeof document === 'undefined' ? overlays : createPortal(overlays, document.body)}
        </>
    );
};
