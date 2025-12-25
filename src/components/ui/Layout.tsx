import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Menu, X, Globe } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../../context/AuthContext.tsx';
import { Link, useNavigate } from 'react-router-dom';

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const { t, i18n } = useTranslation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const toggleLanguage = () => {
        const langs = ['sq', 'en', 'it'];
        const current = langs.indexOf(i18n.language);
        const next = langs[(current + 1) % langs.length];
        i18n.changeLanguage(next);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    return (
        <div className="min-h-screen bg-background text-text flex flex-col">
            <nav className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-2">
                        <Shield className="w-8 h-8 text-primary" />
                        <span className="text-xl font-bold tracking-tight">MAKINA IME</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-6">
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center space-x-1 text-muted hover:text-primary transition-colors uppercase font-medium text-sm"
                        >
                            <Globe className="w-4 h-4" />
                            <span>{i18n.language}</span>
                        </button>

                        {user ? (
                            <>
                                <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
                                    {t('Dashboard')}
                                </Link>
                                <div className="h-4 w-px bg-border" />
                                <span className="text-sm text-muted">{user.email}</span>
                                <Button variant="ghost" className="text-sm" onClick={handleSignOut}>
                                    Sign Out
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" className="text-sm" onClick={() => navigate('/auth')}>
                                {t('Sign In')}
                            </Button>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden text-text"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-border bg-surface p-4 space-y-4">
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center space-x-2 text-muted hover:text-primary w-full"
                        >
                            <Globe className="w-4 h-4" />
                            <span className="uppercase">{i18n.language}</span>
                        </button>

                        {user ? (
                            <>
                                <div className="text-sm text-muted px-2">{user.email}</div>
                                <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                                    Sign Out
                                </Button>
                            </>
                        ) : (
                            <Button variant="primary" className="w-full" onClick={() => navigate('/auth')}>
                                {t('Sign In')}
                            </Button>
                        )}
                    </div>
                )}
            </nav>

            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>

            <footer className="border-t border-border py-8 bg-surface/30">
                <div className="container mx-auto px-4 text-center text-muted text-sm">
                    <p>© 2024 Makina Ime. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};
