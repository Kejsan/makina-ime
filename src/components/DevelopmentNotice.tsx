import type React from 'react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, CheckCircle2, Mail, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppSurface, Panel } from './ui/design-system';

export const developmentNoticeText = 'Makina Ime is still under active development. Data protection, data retention, backups, security controls, and uninterrupted access are not guaranteed yet. Please do not store sensitive, urgent, or irreplaceable information here. The project is shared as a work-in-progress for early testing, and you use it at your own discretion.';

export const pricingNoticeText = 'At this stage, Makina Ime and all currently available features are free while the platform is being developed. Paid plans are expected later, after a more stable version is reached, with a target window in 2026. Timing, pricing, and included features may change before launch.';

const contactEmail = 'infomakinaime@gmail.com';

const hasDismissedWarning = (key: string) => {
    try {
        return typeof window !== 'undefined' && window.sessionStorage.getItem(key) === 'dismissed';
    } catch {
        return false;
    }
};

const rememberDismissedWarning = (key: string) => {
    try {
        window.sessionStorage.setItem(key, 'dismissed');
    } catch {
        // If storage is blocked, keep dismissal in component state for this render session.
    }
};

export const DevelopmentDisclaimer = ({ className, compact = false }: { className?: string; compact?: boolean }) => (
    <Panel className={`border-amber-500/30 bg-amber-500/10 ${compact ? 'p-4' : 'p-5'} ${className || ''}`}>
        <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-2">
                <p className="text-sm font-bold text-amber-200">Active development notice</p>
                <p className="text-sm leading-6 text-muted-foreground">{developmentNoticeText}</p>
                {!compact && <p className="text-sm leading-6 text-muted-foreground">{pricingNoticeText}</p>}
            </div>
        </div>
    </Panel>
);

export const PublicDevelopmentWarning = () => {
    const location = useLocation();
    const [dismissedKeys, setDismissedKeys] = useState<string[]>([]);
    const publicPaths = ['/', '/business-fleet', '/auth', '/privacy', '/terms', '/cookies'];

    const storageKey = useMemo(() => {
        const authWarning = location.pathname === '/auth';
        return `makina-ime-development-warning-v1:${authWarning ? 'auth' : 'public'}`;
    }, [location.pathname]);

    const isDismissed = dismissedKeys.includes(storageKey) || hasDismissedWarning(storageKey);
    const isOpen = publicPaths.includes(location.pathname) && !isDismissed;

    const dismiss = () => {
        rememberDismissedWarning(storageKey);
        setDismissedKeys((current) => current.includes(storageKey) ? current : [...current, storageKey]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/72 p-4 backdrop-blur-sm sm:items-center">
            <AppSurface className="w-full max-w-lg p-5 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                        <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="mi-label text-amber-300">Before you continue</p>
                            <h2 className="mt-1 text-xl font-bold tracking-tight">Makina Ime is a work-in-progress project</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Close warning"
                        title="Close warning"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                    <p>{developmentNoticeText}</p>
                    <p>{pricingNoticeText}</p>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <button
                        type="button"
                        onClick={dismiss}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
                    >
                        I understand
                    </button>
                    <Link
                        to="/terms"
                        onClick={dismiss}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-input px-5 text-sm font-bold hover:bg-accent"
                    >
                        Read terms
                    </Link>
                </div>
            </AppSurface>
        </div>
    );
};

export const PaidPlanInterestForm = ({ className = '', compact = false }: { className?: string; compact?: boolean }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState(user?.email || '');
    const [accountType, setAccountType] = useState('business');
    const [message, setMessage] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!accepted) return;

        const subject = 'Paid plan interest - Makina Ime';
        const body = [
            `Name: ${name || 'Not provided'}`,
            `Email: ${email}`,
            `Account type: ${accountType}`,
            '',
            'Interest: Paid plan with access to all features and analytics.',
            '',
            `Message: ${message || 'No additional message.'}`,
        ].join('\n');

        window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setSent(true);
    };

    return (
        <AppSurface className={`p-5 sm:p-6 ${className}`}>
            <div className={`grid gap-6 ${compact ? '' : 'lg:grid-cols-[0.9fr_1.1fr] lg:items-start'}`}>
                <div>
                    <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <p className="mi-label mb-2 text-primary">Paid plan interest</p>
                    <h2 className="text-2xl font-bold tracking-tight">Register interest in full feature and analytics access.</h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Use this form if you want to be contacted when paid plans are ready. The platform is free during active development, and paid plans are expected after the product reaches a more stable version.
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                        {['All available feature access', 'Fleet and usage analytics', 'Plan updates when pricing is ready'].map((item) => (
                            <div key={item} className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="mi-label" htmlFor="paid-interest-name">Name</label>
                            <input
                                id="paid-interest-name"
                                className="mi-field"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Your name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="mi-label" htmlFor="paid-interest-email">Email</label>
                            <input
                                id="paid-interest-email"
                                className="mi-field"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="mi-label" htmlFor="paid-interest-type">Account type</label>
                        <select id="paid-interest-type" className="mi-field" value={accountType} onChange={(event) => setAccountType(event.target.value)}>
                            <option value="business">Business fleet</option>
                            <option value="personal">Personal garage</option>
                            <option value="both">Personal and business</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="mi-label" htmlFor="paid-interest-message">What would you need from a paid plan?</label>
                        <textarea
                            id="paid-interest-message"
                            className="mi-field min-h-24 py-3"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="Analytics, team controls, reports, priority support..."
                        />
                    </div>

                    <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/45 p-3 text-xs leading-5 text-muted-foreground">
                        <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0 accent-primary"
                            checked={accepted}
                            onChange={(event) => setAccepted(event.target.checked)}
                            required
                        />
                        <span>This opens your email app with the details you entered. No interest request is saved unless you send that email.</span>
                    </label>

                    <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                    >
                        <Mail className="h-4 w-4" />
                        Register interest
                    </button>

                    {sent && (
                        <p className="text-xs leading-5 text-muted-foreground">
                            Your email app should now be ready with the request. Send it to complete the registration of interest.
                        </p>
                    )}
                </form>
            </div>
        </AppSurface>
    );
};
