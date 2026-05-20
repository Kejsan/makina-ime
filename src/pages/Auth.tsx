import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Car, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AppSurface, Panel, StatusPill, ThemeToggle } from '../components/ui/design-system';
import { PwaInstallButton } from '../components/PwaInstallButton';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/Makina Ime Logo.png';

export const Auth = () => {
    const { t } = useTranslation();
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
            navigate('/app');
        } catch (err: unknown) {
            console.error('Authentication failed');
            setError(err instanceof Error && err.message.includes('auth/')
                ? t('Sign-in failed. Check your email and password, then try again.')
                : t('Authentication failed. Please try again.'));
        } finally {
            setLoading(false);
        }
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

            <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[0.9fr_1fr] md:items-center md:py-14">
                <section className="space-y-6">
                    <StatusPill tone="amber">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t('Private garage workspace')}
                    </StatusPill>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                            {isLogin ? t('Welcome back') : t('Create your garage')}
                        </h1>
                        <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                            {t('Sign in to manage vehicle documents, costs, reminders, services, and private files with server-side ownership checks.')}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            { label: t('Private R2 files'), icon: Lock },
                            { label: t('Vehicle records'), icon: Car },
                            { label: t('Reminder alerts'), icon: ShieldCheck },
                        ].map(({ label, icon: Icon }) => (
                            <Panel key={label} className="p-4">
                                <Icon className="mb-3 h-5 w-5 text-primary" />
                                <p className="text-xs font-semibold">{label}</p>
                            </Panel>
                        ))}
                    </div>
                </section>

                <AppSurface className="p-6 sm:p-8">
                    <div className="mb-7">
                        <p className="mi-label text-primary">{isLogin ? t('Sign in') : t('Register')}</p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight">{isLogin ? t('Access your dashboard') : t('Start tracking safely')}</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="mi-label">{t('Email')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="mi-label">{t('Password')}</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder={t('Enter your password')}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="h-12 w-full font-bold" size="lg" isLoading={loading}>
                            {isLogin ? t('Sign In') : t('Create Account')}
                        </Button>
                    </form>

                    <div className="mt-6 border-t border-border/70 pt-5">
                        <Button variant="ghost" className="w-full" onClick={() => setIsLogin(!isLogin)}>
                            {isLogin ? t('Create an account') : t('Sign in to your account')}
                        </Button>
                    </div>

                    <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">
                        {t('By continuing, you agree to our')}{' '}
                        <Link to="/terms" className="font-semibold text-primary hover:underline">{t('Terms of Service')}</Link>
                        {' '}{t('and')}{' '}
                        <Link to="/privacy" className="font-semibold text-primary hover:underline">{t('Privacy Policy')}</Link>.
                    </p>
                </AppSurface>
            </main>
        </div>
    );
};
