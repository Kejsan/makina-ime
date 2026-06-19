import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Car, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { Button } from '../components/ui/Button';
import { AppSurface, Panel, ThemeToggle } from '../components/ui/design-system';
import { PwaInstallButton } from '../components/PwaInstallButton';
import { DevelopmentDisclaimer, PaidPlanInterestForm } from '../components/DevelopmentNotice';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { Seo } from '../lib/seo';
import logo from '../assets/Makina Ime Logo.webp';

type AccountType = 'personal' | 'business';

export const Auth = () => {
    const { t } = useTranslation();
    const { signIn, signUp, resetPassword } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialType: AccountType = searchParams.get('type') === 'business' ? 'business' : 'personal';
    const [accountType, setAccountType] = useState<AccountType>(initialType);
    const [typeExplicit, setTypeExplicit] = useState(searchParams.has('type'));
    const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
    const [isResetMode, setIsResetMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const updateUrl = (type: AccountType, login = isLogin) => setSearchParams({ type, mode: login ? 'signin' : 'signup' });

    const selectType = (type: AccountType) => {
        setAccountType(type);
        setTypeExplicit(true);
        updateUrl(type);
    };

    const toggleMode = () => {
        const next = !isLogin;
        setIsLogin(next);
        setIsResetMode(false);
        setError('');
        setMessage('');
        updateUrl(accountType, next);
    };

    const destinationFor = async (authenticatedUser: User) => {
        if (typeExplicit || !isLogin) return accountType === 'business' ? '/business' : '/personal';
        const profile = await getDoc(doc(db, 'users', authenticatedUser.uid));
        const lastType = profile.data()?.lastWorkspaceType;
        const lastOrganizationId = profile.data()?.lastOrganizationId;
        if (lastType === 'business' && typeof lastOrganizationId === 'string') {
            const membership = await getDoc(doc(db, 'organizationMembers', `${lastOrganizationId}_${authenticatedUser.uid}`));
            if (membership.exists() && membership.data().status === 'active') return `/business/${lastOrganizationId}`;
        }
        return '/personal';
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const authenticatedUser = isLogin
                ? await signIn(normalizedEmail, password)
                : await signUp(normalizedEmail, password);
            navigate(await destinationFor(authenticatedUser), { replace: true });
        } catch {
            setError(t('Authentication failed. Check your details and try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            await resetPassword(email.trim().toLowerCase());
            setMessage(t('Password reset email sent. Check your inbox and spam folder.'));
            setIsResetMode(false);
        } catch {
            setError(t('Could not send a reset email. Check the email address and try again.'));
        } finally {
            setLoading(false);
        }
    };

    const business = accountType === 'business';
    const benefits = business
        ? ['Shared organization fleet', 'Roles and team access', 'Inspections and work orders']
        : ['Private vehicle records', 'Documents and renewal dates', 'Services, reminders, and costs'];

    return (
        <div className={`min-h-screen text-foreground ${business ? 'bg-indigo-950/10' : 'bg-emerald-950/10'}`}>
            <Seo title="Sign in or create an account | Makina Ime" description="Access your Makina Ime personal garage or business fleet workspace." path="/auth" robots="noindex,follow" />
            <header className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16">
                <Link to={business ? '/business-fleet' : '/'} className="flex items-center gap-2">
                    <img src={logo} alt="Makina Ime" width="658" height="658" className="h-9 w-auto" />
                    <span className="hidden text-sm font-extrabold sm:inline">Makina Ime</span>
                </Link>
                <div className="flex items-center gap-2"><PwaInstallButton compact /><ThemeToggle /></div>
            </header>

            <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:py-10">
                <AppSurface className={`order-1 p-4 sm:p-6 lg:col-start-2 ${business ? 'border-indigo-500/30' : 'border-emerald-500/30'}`}>
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background/60 p-1" aria-label="Workspace type">
                        {(['personal', 'business'] as const).map((type) => (
                            <button key={type} type="button" onClick={() => selectType(type)} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold ${accountType === type ? type === 'business' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white' : 'text-muted-foreground hover:bg-accent'}`}>
                                {type === 'personal' ? <Car className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                                {t(type === 'personal' ? 'Personal' : 'Business')}
                            </button>
                        ))}
                    </div>

                    {!isResetMode && (
                        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-accent/50 p-1">
                            <button type="button" onClick={() => isLogin || toggleMode()} className={`min-h-10 rounded-lg text-sm font-semibold ${isLogin ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>{t('Sign in')}</button>
                            <button type="button" onClick={() => !isLogin || toggleMode()} className={`min-h-10 rounded-lg text-sm font-semibold ${!isLogin ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>{t('Register')}</button>
                        </div>
                    )}

                    <div className="mb-4 mt-4">
                        <p className={`text-xs font-bold uppercase tracking-wide ${business ? 'text-indigo-400' : 'text-emerald-400'}`}>{business ? t('Business fleet workspace') : t('Personal garage')}</p>
                        <h1 className="mt-1 text-xl font-bold sm:text-2xl">{isResetMode ? t('Reset your password') : isLogin ? t('Welcome back') : business ? t('Create your business login') : t('Create your personal garage')}</h1>
                    </div>

                    <form onSubmit={isResetMode ? handleReset : handleSubmit} className="space-y-3">
                        <label className="block space-y-1.5">
                            <span className="mi-label">{t('Email')}</span>
                            <span className="mi-field flex items-center gap-3"><Mail className="h-4 w-4 shrink-0 text-muted-foreground" /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" placeholder="name@example.com" required /></span>
                        </label>
                        {!isResetMode && (
                            <label className="block space-y-1.5">
                                <span className="flex items-center justify-between"><span className="mi-label">{t('Password')}</span>{isLogin && <button type="button" onClick={() => setIsResetMode(true)} className="text-xs font-semibold text-primary">{t('Forgot password?')}</button>}</span>
                                <span className="mi-field flex items-center gap-3"><Lock className="h-4 w-4 shrink-0 text-muted-foreground" /><input type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" required minLength={6} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg" aria-label={showPassword ? t('Hide password') : t('Show password')}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span>
                            </label>
                        )}
                        {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
                        {message && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
                        <Button type="submit" isLoading={loading} className="h-11 w-full">{isResetMode ? t('Send reset link') : isLogin ? t('Sign In') : business ? t('Create Business Account') : t('Create Personal Account')}</Button>
                        {isResetMode && <Button type="button" variant="ghost" className="h-10 w-full" onClick={() => setIsResetMode(false)}>{t('Back to sign in')}</Button>}
                    </form>
                </AppSurface>

                <section className="order-2 space-y-5 lg:col-start-1 lg:row-start-1">
                    <div>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${business ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}><ShieldCheck className="h-4 w-4" />{business ? t('Business Fleet') : t('Personal Garage')}</div>
                        <h2 className="mt-4 text-3xl font-extrabold tracking-tight">{business ? t('Run shared vehicles with clear responsibility.') : t('Keep your own vehicles organized.')}</h2>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{business ? t('Use a team workspace for vehicles, compliance, maintenance, costs, assignments, and work orders.') : t('Keep vehicle details, documents, services, reminders, and expenses together without mixing them with business records.')}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">{benefits.map((benefit) => <Panel key={benefit} className="p-3 text-sm font-semibold">{t(benefit)}</Panel>)}</div>
                    <DevelopmentDisclaimer compact />
                    <p className="text-xs leading-6 text-muted-foreground">{t('By continuing, you agree to our')} <Link to="/terms" className="font-semibold text-primary">{t('Terms of Service')}</Link> {t('and')} <Link to="/privacy" className="font-semibold text-primary">{t('Privacy Policy')}</Link>.</p>
                </section>
            </main>
            <section className="mx-auto max-w-6xl px-4 pb-12"><PaidPlanInterestForm /></section>
        </div>
    );
};
