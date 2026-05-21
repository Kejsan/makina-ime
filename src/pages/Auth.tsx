import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Car, Eye, EyeOff, Lock, Mail, ShieldCheck, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { AppSurface, Panel, StatusPill, ThemeToggle } from '../components/ui/design-system';
import { PwaInstallButton } from '../components/PwaInstallButton';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/Makina Ime Logo.png';

export const Auth = () => {
    const { t } = useTranslation();
    const { signIn, signUp, resetPassword } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialType = searchParams.get('type') === 'business' ? 'business' : 'personal';
    const initialMode = searchParams.get('mode') === 'signup' ? false : true;
    const [accountType, setAccountType] = useState<'personal' | 'business'>(initialType);
    const [isLogin, setIsLogin] = useState(initialMode);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();
            if (isLogin) {
                await signIn(normalizedEmail, password);
            } else {
                await signUp(normalizedEmail, password);
            }
            navigate(accountType === 'business' ? '/business' : '/app');
        } catch (err: unknown) {
            console.error('Authentication failed');
            setError(err instanceof Error && err.message.includes('auth/')
                ? t('Sign-in failed. Check your email and password, then try again.')
                : t('Authentication failed. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await resetPassword(email.trim().toLowerCase());
            setMessage(t('Password reset email sent. Check your inbox and spam folder.'));
            setIsResetMode(false);
        } catch (err: unknown) {
            console.error('Password reset failed');
            setError(err instanceof Error && err.message.includes('auth/')
                ? t('Could not send a reset email. Check the email address and try again.')
                : t('Password reset failed. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const setFlow = (nextType: 'personal' | 'business') => {
        setAccountType(nextType);
        setSearchParams({ type: nextType, mode: isLogin ? 'signin' : 'signup' });
    };

    const toggleMode = () => {
        const nextIsLogin = !isLogin;
        setIsLogin(nextIsLogin);
        setIsResetMode(false);
        setError('');
        setMessage('');
        setSearchParams({ type: accountType, mode: nextIsLogin ? 'signin' : 'signup' });
    };

    const flowCopy = accountType === 'business'
        ? {
            eyebrow: t('Business fleet workspace'),
            title: isLogin ? t('Access your fleet') : t('Create your business login'),
            body: t('Use this path for company cars, taxi fleets, rental fleets, service vehicles, and car sellers. After registration, create or join an organization workspace.'),
            formTitle: isLogin ? t('Sign in to business') : t('Start business setup'),
            cta: isLogin ? t('Sign In') : t('Create Business Account'),
            panels: [
                { label: t('Organization roles'), icon: Users },
                { label: t('Fleet records'), icon: Building2 },
                { label: t('Inspections and reports'), icon: ShieldCheck },
            ],
        }
        : {
            eyebrow: t('Private garage workspace'),
            title: isLogin ? t('Welcome back') : t('Create your personal garage'),
            body: t('Use this path for your own vehicles. Store documents, track services and costs, and get reminders for renewals and maintenance.'),
            formTitle: isLogin ? t('Access your dashboard') : t('Start tracking your vehicles'),
            cta: isLogin ? t('Sign In') : t('Create Personal Account'),
            panels: [
                { label: t('Vehicle records'), icon: Car },
                { label: t('Private documents'), icon: Lock },
                { label: t('Reminder alerts'), icon: ShieldCheck },
            ],
        };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                <Link to="/" className="flex items-center gap-3">
                    <img src={logo} alt="Makina Ime" className="h-10 w-auto" />
                </Link>
                <div className="flex items-center gap-2">
                    <PwaInstallButton compact />
                    <ThemeToggle />
                </div>
            </header>

            <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[0.85fr_1fr] lg:items-center lg:py-14">
                <section className="space-y-6">
                    <StatusPill tone="amber">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {flowCopy.eyebrow}
                    </StatusPill>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                            {flowCopy.title}
                        </h1>
                        <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                            {flowCopy.body}
                        </p>
                    </div>
                    <div className="grid gap-2 rounded-2xl border border-border bg-card/60 p-1 sm:grid-cols-2">
                        {(['personal', 'business'] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFlow(type)}
                                className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                                    accountType === type
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                            >
                                {type === 'personal' ? t('Personal') : t('Business')}
                            </button>
                        ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {flowCopy.panels.map(({ label, icon: Icon }) => (
                            <Panel key={label} className="p-4">
                                <Icon className="mb-3 h-5 w-5 text-primary" />
                                <p className="text-xs font-semibold">{label}</p>
                            </Panel>
                        ))}
                    </div>
                </section>

                <AppSurface className="p-5 sm:p-8">
                    <div className="mb-7">
                        <p className="mi-label text-primary">{isResetMode ? t('Password reset') : isLogin ? t('Sign in') : t('Register')}</p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight">{isResetMode ? t('Reset your password') : flowCopy.formTitle}</h2>
                        {isResetMode ? (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {t('Enter your account email and we will send a secure password reset link.')}
                            </p>
                        ) : !isLogin && accountType === 'business' && (
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {t('Next step after signup: create your organization, add vehicles, invite team members, and start fleet tracking.')}
                            </p>
                        )}
                    </div>

                    <form onSubmit={isResetMode ? handlePasswordReset : handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="mi-label">{t('Email')}</label>
                                <div className="mi-field flex items-center gap-3 px-4">
                                    <Mail className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                        required
                                    />
                                </div>
                            </div>
                            {!isResetMode && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="mi-label">{t('Password')}</label>
                                        {isLogin && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsResetMode(true);
                                                    setError('');
                                                    setMessage('');
                                                }}
                                                className="text-xs font-semibold text-primary hover:underline"
                                            >
                                                {t('Forgot password?')}
                                            </button>
                                        )}
                                    </div>
                                    <div className="mi-field flex items-center gap-3 px-4">
                                        <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder={t('Enter your password')}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((current) => !current)}
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                                            aria-label={showPassword ? t('Hide password') : t('Show password')}
                                            title={showPassword ? t('Hide password') : t('Show password')}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                                {error}
                            </div>
                        )}
                        {message && (
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                                {message}
                            </div>
                        )}

                        <Button type="submit" className="h-12 w-full font-bold" size="lg" isLoading={loading}>
                            {isResetMode ? t('Send reset link') : flowCopy.cta}
                        </Button>
                    </form>

                    <div className="mt-6 grid gap-2 border-t border-border/70 pt-5">
                        {isResetMode ? (
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={() => {
                                    setIsResetMode(false);
                                    setError('');
                                }}
                            >
                                {t('Back to sign in')}
                            </Button>
                        ) : (
                            <Button variant="ghost" className="w-full" onClick={toggleMode}>
                                {isLogin ? t('Create an account') : t('Sign in to your account')}
                            </Button>
                        )}
                    </div>

                    <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">
                        {t('By continuing, you agree to our')}{' '}
                        <Link to="/terms" className="font-semibold text-primary hover:underline">{t('Terms of Service')}</Link>
                        {' '}{t('and')}{' '}
                        <Link to="/privacy" className="font-semibold text-primary hover:underline">{t('Privacy Policy')}</Link>
                        . {t('See also our')}{' '}
                        <Link to="/cookies" className="font-semibold text-primary hover:underline">{t('Cookie Policy')}</Link>.
                    </p>
                </AppSurface>
            </main>
        </div>
    );
};
