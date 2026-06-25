import type React from 'react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, CheckCircle2, Mail, ShieldAlert, X } from 'lucide-react';
import { AppSurface, Panel } from './ui/design-system';
import { Modal } from './ui/Modal';

export const developmentNoticeText = 'Makina Ime is still under active development. Data protection, data retention, backups, security controls, and uninterrupted access are not guaranteed yet. Please do not store sensitive, urgent, or irreplaceable information here. The project is shared as a work-in-progress for early testing, and you use it at your own discretion.';

export const pricingNoticeText = 'At this stage, Makina Ime and all currently available features are free while the platform is being developed. Paid plans are expected later, after a more stable version is reached, with a target window in 2026. Timing, pricing, and included features may change before launch.';

const contactEmail = 'infomakinaime@gmail.com';
const warningStorageKey = 'makina-ime-development-warning-v2';
const warningReminderIntervalMs = 7 * 24 * 60 * 60 * 1000;
const warningMaxConfirmations = 2;

type WarningAcknowledgement = {
    count: number;
    lastConfirmedAt: number;
};

const readWarningAcknowledgement = (): WarningAcknowledgement | null => {
    try {
        if (typeof window === 'undefined') return null;
        const rawValue = window.localStorage.getItem(warningStorageKey);
        if (!rawValue) return null;
        const parsed = JSON.parse(rawValue) as Partial<WarningAcknowledgement>;
        if (typeof parsed.count !== 'number' || typeof parsed.lastConfirmedAt !== 'number') return null;
        return {
            count: parsed.count,
            lastConfirmedAt: parsed.lastConfirmedAt,
        };
    } catch {
        return null;
    }
};

const shouldShowWarning = () => {
    const acknowledgement = readWarningAcknowledgement();
    if (!acknowledgement) return true;
    if (acknowledgement.count >= warningMaxConfirmations) return false;
    return Date.now() - acknowledgement.lastConfirmedAt >= warningReminderIntervalMs;
};

const rememberWarningAcknowledgement = () => {
    try {
        const current = readWarningAcknowledgement();
        const next: WarningAcknowledgement = {
            count: Math.min((current?.count || 0) + 1, warningMaxConfirmations),
            lastConfirmedAt: Date.now(),
        };
        window.localStorage.setItem(warningStorageKey, JSON.stringify(next));
    } catch {
        // If storage is blocked, keep dismissal in component state for this render session only.
    }
};

export const DevelopmentDisclaimer = ({ className, compact = false }: { className?: string; compact?: boolean }) => (
    <Panel className={`border-border border-l-4 border-l-amber-500 bg-card ${compact ? 'p-4' : 'p-5'} ${className || ''}`}>
        <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">Active development notice</p>
                <p className="text-sm leading-6 text-muted-foreground">{developmentNoticeText}</p>
                {!compact && <p className="text-sm leading-6 text-muted-foreground">{pricingNoticeText}</p>}
            </div>
        </div>
    </Panel>
);

export const PublicDevelopmentWarning = () => {
    const location = useLocation();
    const [dismissedThisSession, setDismissedThisSession] = useState(false);
    const publicPaths = ['/', '/business-fleet', '/auth', '/privacy', '/terms', '/cookies'];
    const isOpen = useMemo(() => (
        publicPaths.includes(location.pathname)
        && !dismissedThisSession
        && shouldShowWarning()
    ), [dismissedThisSession, location.pathname]);

    const dismiss = () => {
        rememberWarningAcknowledgement();
        setDismissedThisSession(true);
    };

    if (!isOpen) return null;

    return (
        <Modal onClose={dismiss} titleId="development-warning-title" className="max-w-lg p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                        <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
                            <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="mi-label text-amber-600 dark:text-amber-400">Before you continue</p>
                            <h2 id="development-warning-title" className="mt-1 text-xl font-bold tracking-tight">Makina Ime is a work-in-progress project</h2>
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
        </Modal>
    );
};

export const PaidPlanInterestForm = ({ className = '', compact = false }: { className?: string; compact?: boolean }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [accountType, setAccountType] = useState('business');
    const [message, setMessage] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [sent, setSent] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const closeForm = () => {
        setIsFormOpen(false);
        setSent(false);
    };

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
        <>
            <AppSurface className={`p-5 sm:p-6 ${className}`}>
                <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                        <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <p className="mi-label mb-2 text-primary">Paid plan interest</p>
                        <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold tracking-tight`}>Register interest in full feature and analytics access.</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                            Use this form if you want to be contacted when paid plans are ready.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsFormOpen(true)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                    >
                        <BarChart3 className="h-5 w-5" />
                        Register interest
                    </button>
                </div>
            </AppSurface>

            {isFormOpen && (
                <Modal onClose={closeForm} titleId="paid-interest-title" className="max-w-2xl">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <p className="mi-label mb-2 text-primary">Paid plan interest</p>
                            <h2 id="paid-interest-title" className="text-2xl font-bold tracking-tight">Register interest in full feature and analytics access.</h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                The platform is free during active development, and paid plans are expected after the product reaches a more stable version.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={closeForm}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                            aria-label="Close paid plan interest form"
                            title="Close paid plan interest form"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mb-5 grid gap-2 text-sm text-muted-foreground">
                        {['All available feature access', 'Fleet and usage analytics', 'Plan updates when pricing is ready'].map((item) => (
                            <div key={item} className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                <span>{item}</span>
                            </div>
                        ))}
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

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="submit"
                                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                            >
                                <Mail className="h-4 w-4" />
                                Register interest
                            </button>
                            <button
                                type="button"
                                onClick={closeForm}
                                className="inline-flex h-11 items-center justify-center rounded-xl border border-input px-5 text-sm font-bold hover:bg-accent"
                            >
                                Cancel
                            </button>
                        </div>

                        {sent && (
                            <p className="text-xs leading-5 text-muted-foreground">
                                Your email app should now be ready with the request. Send it to complete the registration of interest.
                            </p>
                        )}
                    </form>
                </Modal>
            )}
        </>
    );
};
