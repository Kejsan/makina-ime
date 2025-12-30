import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Mail, Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export const Auth = () => {
    useTranslation();
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
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-black flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-4">
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <img src="/logo.png" alt="Makina Ime" className="h-20 w-auto object-contain animate-float" />
                        <div className="text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-foreground">
                                {isLogin ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {isLogin ? 'Manage your premium fleet with ease' : 'Join the elite vehicle management platform'}
                            </p>
                        </div>
                    </div>
                </div>

                <Card className="p-8 backdrop-blur-xl bg-card/40 border-primary/10 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 bg-background/50 border-input/50 focus:border-primary/50 transition-all hover:bg-background/80"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 bg-background/50 border-input/50 focus:border-primary/50 transition-all hover:bg-background/80"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center animate-in fade-in slide-in-from-top-2">
                                <Shield className="w-4 h-4 mr-2" />
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full text-lg h-12 shadow-primary/25 shadow-lg hover:shadow-primary/40 transition-all" size="lg" isLoading={loading}>
                            {isLogin ? 'Sign In' : 'Create Account'}
                        </Button>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background/0 px-2 text-muted-foreground bg-[#0b1221]">
                                    {isLogin ? 'New to Makina Ime?' : 'Already have an account?'}
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full mt-4 hover:bg-primary/5 hover:text-primary"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Create an account' : 'Sign in to your account'}
                        </Button>
                    </div>
                </Card>
                
                <p className="text-center text-sm text-muted-foreground">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
};

