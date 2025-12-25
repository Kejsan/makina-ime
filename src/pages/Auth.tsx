import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
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
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center border border-border shadow-2xl shadow-primary/20">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-text to-muted bg-clip-text text-transparent">
                        {isLogin ? 'Mirësevini në AutoAdmin' : 'Krijoni Llogarinë Tuaj'}
                    </h2>
                    <p className="text-muted">
                        {isLogin
                            ? 'Access your fleet dashboard'
                            : 'Mirëmbajtja e mjetit tuaj, e thjeshtuar me elegancë.'}
                    </p>
                </div>

                <Card className="backdrop-blur-xl bg-surface/80">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            type="email"
                            label="Adresa Email"
                            placeholder="name@luxury.al"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input
                            type="password"
                            label="Fjalëkalimi"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" isLoading={loading}>
                            {isLogin ? 'HYR' : 'VAZHDO'}
                        </Button>
                    </form>

                    <div className="mt-6 flex items-center justify-between">
                        <div className="h-px bg-border flex-1" />
                        <span className="px-4 text-xs text-muted uppercase">
                            {isLogin ? 'OR' : 'Keni një llogari?'}
                        </span>
                        <div className="h-px bg-border flex-1" />
                    </div>

                    <Button
                        variant="ghost"
                        className="w-full mt-4"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? 'Regjistrohu' : 'Hyr Tani'}
                    </Button>
                </Card>
            </div>
        </div>
    );
};
