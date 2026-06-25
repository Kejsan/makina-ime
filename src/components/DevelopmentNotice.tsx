import type React from 'react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, CheckCircle2, Loader2, Send, ShieldAlert, X } from 'lucide-react';
import { AppSurface, Panel } from './ui/design-system';
import { Modal } from './ui/Modal';

export const developmentNoticeText = 'Makina Ime is still under active development. Data protection, data retention, backups, security controls, and uninterrupted access are not guaranteed yet. Please do not store sensitive, urgent, or irreplaceable information here. The project is shared as a work-in-progress for early testing, and you use it at your own discretion.';

export const pricingNoticeText = 'At this stage, Makina Ime and all currently available features are free while the platform is being developed. Paid plans are expected later, after a more stable version is reached, with a target window in 2026. Timing, pricing, and included features may change before launch.';

const warningStorageKey = 'makina-ime-development-warning-v2';
const warningReminderIntervalMs = 7 * 24 * 60 * 60 * 1000;
const warningMaxConfirmations = 2;
const publicWarningPaths = ['/', '/business-fleet', '/auth', '/privacy', '/terms', '/cookies'];

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
    const isOpen = useMemo(() => (
        publicWarningPaths.includes(location.pathname)
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

type InterestFormErrors = Partial<Record<'name' | 'email' | 'accountType' | 'message' | 'accepted' | 'form', string>>;
type InterestSubmitState = 'idle' | 'submitting' | 'success' | 'error';

const validateInterestForm = ({
    name,
    email,
    accountType,
    message,
    accepted,
}: {
    name: string;
    email: string;
    accountType: string;
    message: string;
    accepted: boolean;
}) => {
    const errors: InterestFormErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (trimmedName.length > 0 && trimmedName.length < 2) errors.name = 'Enter at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) errors.email = 'Enter a valid email address.';
    if (!['business', 'personal', 'both'].includes(accountType)) errors.accountType = 'Choose a valid account type.';
    if (trimmedMessage.length > 1000) errors.message = 'Keep this under 1000 characters.';
    if (!accepted) errors.accepted = 'Confirm that Makina Ime can save this request and contact you.';
    return errors;
};

const getInterestMetadata = () => {
    const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
    const installedPwa = window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true;
    return {
        referrer: document.referrer || '',
        language: navigator.language || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        displayMode: installedPwa ? 'standalone' : 'browser',
        installedPwa,
    };
};

export const PaidPlanInterestForm = ({ className = '', compact = false }: { className?: string; compact?: boolean }) => {
    const location = useLocation();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [accountType, setAccountType] = useState('business');
    const [message, setMessage] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [companyWebsite, setCompanyWebsite] = useState('');
    const [submitState, setSubmitState] = useState<InterestSubmitState>('idle');
    const [errors, setErrors] = useState<InterestFormErrors>({});
    const [savedRequestId, setSavedRequestId] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    const closeForm = () => {
        if (submitState === 'submitting') return;
        setIsFormOpen(false);
        setSubmitState('idle');
        setErrors({});
        setSavedRequestId('');
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextErrors = validateInterestForm({ name, email, accountType, message, accepted });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setSubmitState('submitting');
        setSavedRequestId('');

        try {
            const response = await fetch('/.netlify/functions/paid-plan-interest', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    accountType,
                    message: message.trim(),
                    accepted,
                    companyWebsite,
                    sourcePath: `${location.pathname}${location.search}${location.hash}`,
                    metadata: getInterestMetadata(),
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                setErrors(data.errors || { form: 'We could not save this request. Check the details and try again.' });
                setSubmitState('error');
                return;
            }
            setSavedRequestId(typeof data.requestId === 'string' ? data.requestId : '');
            setSubmitState('success');
        } catch {
            setErrors({ form: 'We could not save this request. Check your connection and try again.' });
            setSubmitState('error');
        }
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
                <Modal onClose={closeForm} titleId="paid-interest-title" className="max-w-2xl" shouldConfirmClose={() => submitState === 'submitting'}>
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

                    {submitState === 'success' ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                                <div>
                                    <p className="font-bold text-foreground">Interest request saved.</p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        Makina Ime now has your paid-plan interest request and contact details. You do not need to send an email manually.
                                    </p>
                                    {savedRequestId && (
                                        <p className="mt-3 text-xs text-muted-foreground">Reference: {savedRequestId}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeForm}
                                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        {errors.form && (
                            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                                {errors.form}
                            </p>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="mi-label" htmlFor="paid-interest-name">Name</label>
                                <input
                                    id="paid-interest-name"
                                    className="mi-field"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Your name"
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={errors.name ? 'paid-interest-name-error' : undefined}
                                />
                                {errors.name && <p id="paid-interest-name-error" className="text-xs text-rose-400">{errors.name}</p>}
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
                                    aria-invalid={Boolean(errors.email)}
                                    aria-describedby={errors.email ? 'paid-interest-email-error' : undefined}
                                />
                                {errors.email && <p id="paid-interest-email-error" className="text-xs text-rose-400">{errors.email}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="mi-label" htmlFor="paid-interest-type">Account type</label>
                            <select
                                id="paid-interest-type"
                                className="mi-field"
                                value={accountType}
                                onChange={(event) => setAccountType(event.target.value)}
                                aria-invalid={Boolean(errors.accountType)}
                                aria-describedby={errors.accountType ? 'paid-interest-type-error' : undefined}
                            >
                                <option value="business">Business fleet</option>
                                <option value="personal">Personal garage</option>
                                <option value="both">Personal and business</option>
                            </select>
                            {errors.accountType && <p id="paid-interest-type-error" className="text-xs text-rose-400">{errors.accountType}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="mi-label" htmlFor="paid-interest-message">What would you need from a paid plan?</label>
                            <textarea
                                id="paid-interest-message"
                                className="mi-field min-h-24 py-3"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                                placeholder="Analytics, team controls, reports, priority support..."
                                maxLength={1000}
                                aria-invalid={Boolean(errors.message)}
                                aria-describedby={errors.message ? 'paid-interest-message-error' : undefined}
                            />
                            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                {errors.message ? <p id="paid-interest-message-error" className="text-rose-400">{errors.message}</p> : <span />}
                                <span>{message.trim().length}/1000</span>
                            </div>
                        </div>

                        <div className="hidden" aria-hidden="true">
                            <label htmlFor="paid-interest-website">Website</label>
                            <input
                                id="paid-interest-website"
                                tabIndex={-1}
                                autoComplete="off"
                                value={companyWebsite}
                                onChange={(event) => setCompanyWebsite(event.target.value)}
                            />
                        </div>

                        <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/45 p-3 text-xs leading-5 text-muted-foreground">
                            <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 shrink-0 accent-primary"
                                checked={accepted}
                                onChange={(event) => setAccepted(event.target.checked)}
                                required
                                aria-invalid={Boolean(errors.accepted)}
                            />
                            <span>Makina Ime can save this interest request and use these details to contact me about future paid plans.</span>
                        </label>
                        {errors.accepted && <p className="-mt-2 text-xs text-rose-400">{errors.accepted}</p>}

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="submit"
                                disabled={submitState === 'submitting'}
                                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {submitState === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {submitState === 'submitting' ? 'Saving...' : 'Save interest request'}
                            </button>
                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={submitState === 'submitting'}
                                className="inline-flex h-11 items-center justify-center rounded-xl border border-input px-5 text-sm font-bold hover:bg-accent"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                    )}
                </Modal>
            )}
        </>
    );
};
