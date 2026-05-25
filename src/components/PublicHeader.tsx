import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe2, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PwaInstallButton } from './PwaInstallButton';
import { ThemeToggle } from './ui/design-system';
import logo from '../assets/Makina Ime Logo.png';

type PublicNavItem = {
    label: string;
    href?: string;
    to?: string;
};

type PublicHeaderProps = {
    tagline: string;
    navItems: PublicNavItem[];
    primaryCta: {
        label: string;
        to: string;
    };
    alternateCta?: {
        label: string;
        to: string;
    };
};

const languages = [
    { code: 'sq', label: 'SQ' },
    { code: 'en', label: 'EN' },
    { code: 'it', label: 'IT' },
    { code: 'de', label: 'DE' },
    { code: 'es', label: 'ES' },
];

const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const currentLanguage = i18n.language?.slice(0, 2) || 'sq';

    const changeLanguage = async (language: string) => {
        window.localStorage.setItem('makina-ime-language', language);
        await i18n.changeLanguage(language);
    };

    return (
        <label className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-accent/60 px-2 text-muted-foreground">
            <Globe2 className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Language</span>
            <select
                value={currentLanguage}
                onChange={(event) => void changeLanguage(event.target.value)}
                className="h-8 w-8 appearance-none bg-transparent text-xs font-bold text-foreground outline-none sm:w-10"
                aria-label="Language"
            >
                {languages.map((language) => (
                    <option key={language.code} value={language.code}>
                        {language.label}
                    </option>
                ))}
            </select>
        </label>
    );
};

export const PublicHeader = ({
    tagline,
    navItems,
    primaryCta,
    alternateCta,
}: PublicHeaderProps) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const closeMenu = () => setMenuOpen(false);

    return (
        <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
            <div className="mx-auto box-border flex w-full max-w-none items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
                <Link to="/" className="flex min-w-0 items-center gap-3" onClick={closeMenu}>
                    <img src={logo} alt="Makina Ime" className="h-10 w-auto shrink-0" />
                    <div className="hidden min-w-0 sm:block">
                        <p className="text-sm font-extrabold">Makina Ime</p>
                        <p className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{tagline}</p>
                    </div>
                </Link>

                <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
                    {navItems.map((item) =>
                        item.to ? (
                            <Link key={item.label} to={item.to} className="hover:text-foreground">
                                {item.label}
                            </Link>
                        ) : (
                            <a key={item.label} href={item.href} className="hover:text-foreground">
                                {item.label}
                            </a>
                        )
                    )}
                </nav>

                <div className="flex shrink-0 items-center gap-2">
                    <div className="hidden sm:block">
                        <PwaInstallButton compact />
                    </div>
                    <ThemeToggle className="hidden sm:inline-flex" />
                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-accent/60 text-muted-foreground hover:text-foreground lg:hidden"
                        aria-label="Menu"
                        aria-expanded={menuOpen}
                    >
                        {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                    <div className="hidden sm:block">
                        <LanguageSelector />
                    </div>
                    <Link to="/auth" className="hidden h-10 items-center justify-center rounded-xl border border-input bg-background/70 px-4 text-sm font-semibold hover:bg-accent md:inline-flex">
                        Sign in
                    </Link>
                    <Link to={primaryCta.to} className="hidden h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 sm:inline-flex">
                        {primaryCta.label}
                    </Link>
                </div>
            </div>

            {menuOpen && (
                <div className="mx-auto box-border w-full max-w-none px-4 pb-4 sm:px-6 lg:hidden lg:px-10">
                    <div className="mi-surface grid gap-2 p-3">
                        <div className="grid gap-1">
                            {navItems.map((item) =>
                                item.to ? (
                                    <Link key={item.label} to={item.to} onClick={closeMenu} className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
                                        {item.label}
                                    </Link>
                                ) : (
                                    <a key={item.label} href={item.href} onClick={closeMenu} className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground">
                                        {item.label}
                                    </a>
                                )
                            )}
                        </div>
                        <div className="grid gap-2 border-t border-border/80 pt-3 sm:grid-cols-3">
                            <div className="flex flex-wrap gap-2 sm:hidden">
                                <LanguageSelector />
                                <PwaInstallButton compact />
                                <ThemeToggle />
                            </div>
                            <Link to="/auth" onClick={closeMenu} className="inline-flex h-11 items-center justify-center rounded-xl border border-input bg-background/70 px-4 text-sm font-semibold hover:bg-accent">
                                Sign in
                            </Link>
                            {alternateCta && (
                                <Link to={alternateCta.to} onClick={closeMenu} className="inline-flex h-11 items-center justify-center rounded-xl border border-input bg-background/70 px-4 text-sm font-bold hover:bg-accent">
                                    {alternateCta.label}
                                </Link>
                            )}
                            <Link to={primaryCta.to} onClick={closeMenu} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90">
                                {primaryCta.label}
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};
