import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPwaInstallState, requestPwaInstall, subscribePwaInstall } from '../lib/pwaInstall';
import { Button } from './ui/Button';
import { AppSurface } from './ui/design-system';
import { Modal } from './ui/Modal';

const offerStorageKey = 'makina-ime-install-offer-v2';
const offerSessionKey = 'makina-ime-install-offer-shown';
const offerCooldownMs = 30 * 24 * 60 * 60 * 1000;

const isMobileBrowser = () => window.matchMedia('(max-width: 767px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
const isIosBrowser = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const recentlyDismissed = () => {
    try {
        const stored = JSON.parse(window.localStorage.getItem(offerStorageKey) || '{}') as { dismissedAt?: number };
        return typeof stored.dismissedAt === 'number' && Date.now() - stored.dismissedAt < offerCooldownMs;
    } catch {
        return false;
    }
};

export const PwaInstallButton = ({ compact = false, autoOffer = false }: { compact?: boolean; autoOffer?: boolean }) => {
    const { t } = useTranslation();
    const installState = useSyncExternalStore(subscribePwaInstall, getPwaInstallState, getPwaInstallState);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showOffer, setShowOffer] = useState(false);
    const isIos = isIosBrowser();

    useEffect(() => {
        if (!autoOffer || installState.installed || !isMobileBrowser()) return;
        if (window.sessionStorage.getItem(offerSessionKey) === 'true' || recentlyDismissed()) return;
        if (!isIos && !installState.canPrompt) return;

        const timeout = window.setTimeout(() => {
            window.sessionStorage.setItem(offerSessionKey, 'true');
            setShowOffer(true);
        }, 1400);
        return () => window.clearTimeout(timeout);
    }, [autoOffer, installState.canPrompt, installState.installed, isIos]);

    if (installState.installed) return null;

    const startInstall = async () => {
        setShowOffer(false);
        if (installState.canPrompt) {
            const outcome = await requestPwaInstall();
            if (outcome === 'dismissed') {
                window.localStorage.setItem(offerStorageKey, JSON.stringify({ dismissedAt: Date.now() }));
            }
            return;
        }
        if (isIos) setShowInstructions(true);
    };

    const dismissOffer = () => {
        window.localStorage.setItem(offerStorageKey, JSON.stringify({ dismissedAt: Date.now() }));
        setShowOffer(false);
    };

    if (!isIos && !installState.canPrompt) return null;

    const overlays = (
        <>
            {showOffer && (
                <div className="install-offer-panel fixed inset-x-3 z-50 max-w-[calc(100dvw-1.5rem)] overflow-x-hidden overflow-y-auto md:hidden" role="region" aria-label={t('Install Makina Ime')}>
                    <AppSurface className="border-primary/30 p-4 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Download className="h-5 w-5" /></div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm font-bold">{t('Install Makina Ime')}</h2>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('Install this app on your phone for faster access and PWA reminders.')}</p>
                                <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                                    <Button type="button" size="sm" className="h-9" onClick={() => void startInstall()}>{t('Install App')}</Button>
                                    <Button type="button" size="sm" variant="outline" className="h-9" onClick={dismissOffer}>{t('Not now')}</Button>
                                </div>
                            </div>
                            <button type="button" className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={dismissOffer} aria-label={t('Close')}><X className="h-4 w-4" /></button>
                        </div>
                    </AppSurface>
                </div>
            )}

            {showInstructions && (
                <Modal onClose={() => setShowInstructions(false)} titleId="install-instructions-title" className="max-w-sm p-5">
                    <div className="mb-5 flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Share className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                            <h2 id="install-instructions-title" className="text-lg font-bold">{t('Install Makina Ime')}</h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('Tap Share, then Add to Home Screen, then Add.')}</p>
                        </div>
                        <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => setShowInstructions(false)} aria-label={t('Close')}><X className="h-5 w-5" /></button>
                    </div>
                    <Button className="w-full" onClick={() => setShowInstructions(false)}>{t('Got it')}</Button>
                </Modal>
            )}
        </>
    );

    return (
        <>
            <Button type="button" variant="outline" size={compact ? 'icon' : 'sm'} onClick={() => void startInstall()} title={t('Install App')} aria-label={t('Install App')}>
                <Download className={compact ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
                {!compact && t('Install App')}
            </Button>
            {typeof document === 'undefined' ? overlays : createPortal(overlays, document.body)}
        </>
    );
};
