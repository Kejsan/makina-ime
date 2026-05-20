import { useEffect, useMemo, useState } from 'react';
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

export const PwaInstallButton = ({ compact = false }: { compact?: boolean }) => {
    const { t } = useTranslation();
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);
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

    if (installed) return null;

    const startInstall = async () => {
        if (installPrompt) {
            await installPrompt.prompt();
            await installPrompt.userChoice;
            setInstallPrompt(null);
            return;
        }

        setShowInstructions(true);
    };

    return (
        <>
            <Button type="button" variant="outline" size={compact ? 'icon' : 'sm'} onClick={startInstall} title={t('Install App')} aria-label={t('Install App')}>
                <Download className={compact ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
                {!compact && t('Install App')}
            </Button>

            {showInstructions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <AppSurface className="w-full max-w-sm p-5 shadow-2xl">
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
};
