import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Bell,
    Car,
    CalendarDays,
    LayoutDashboard,
    LogOut,
    Plus,
    User,
} from 'lucide-react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { NotificationCenter } from '../NotificationCenter';
import { PwaInstallButton } from '../PwaInstallButton';
import { ThemeToggle } from './design-system';
import logo from '../../assets/Makina Ime Logo.png';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    isActive?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, isActive }: SidebarItemProps) => (
    <Link
        to={href}
        className={cn(
            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all',
            isActive
                ? 'border border-primary/20 bg-primary/10 font-bold text-primary shadow-sm'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        )}
    >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
    </Link>
);

const MobileNavItem = ({ icon: Icon, label, href, isActive }: SidebarItemProps) => (
    <Link
        to={href}
        className={cn(
            'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
    >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
    </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);

    useEffect(() => {
        if (!user) return;
        return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
            setBrowserNotificationsEnabled(snapshot.data()?.browserNotificationsEnabled === true);
        });
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' && browserNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
                    const data = change.doc.data();
                    new Notification(data.title, {
                        body: data.body,
                        icon: '/pwa-192x192.png',
                    });
                }
            });
        });

        return unsubscribe;
    }, [user, browserNotificationsEnabled]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const navItems = [
        { icon: LayoutDashboard, label: t('Dashboard'), href: '/app' },
        { icon: CalendarDays, label: t('Calendar'), href: '/calendar' },
        { icon: User, label: t('Profile'), href: '/profile' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex min-h-screen pb-20 md:pb-0">
                <aside className="hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-border/80 bg-card/70 p-5 backdrop-blur-xl md:sticky md:top-0 md:flex">
                    <div>
                        <Link to="/app" className="mb-8 flex items-center gap-3">
                            <img src={logo} alt="Makina Ime" className="h-10 w-auto object-contain" />
                            <div>
                                <p className="text-sm font-extrabold tracking-tight">Makina Ime</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pro Dashboard</p>
                            </div>
                        </Link>

                        <nav className="space-y-2">
                            {navItems.map((item) => (
                                <SidebarItem
                                    key={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    href={item.href}
                                    isActive={location.pathname === item.href}
                                />
                            ))}
                        </nav>
                    </div>

                    <div className="space-y-4 border-t border-border/70 pt-5">
                        <div className="rounded-2xl border border-border/70 bg-background/45 p-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-sm font-bold text-white">
                                    {(user?.email?.[0] || 'U').toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold">{user?.email}</p>
                                    <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-primary">
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                        Secure account
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <PwaInstallButton compact />
                            <ThemeToggle />
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-400 transition-colors hover:bg-rose-500/10"
                            >
                                <LogOut className="h-4 w-4" />
                                {t('Sign Out')}
                            </button>
                        </div>

                        <div className="flex justify-center gap-4 text-[11px] text-muted-foreground">
                            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
                            <Link to="/terms" className="hover:text-foreground">Terms</Link>
                        </div>
                    </div>
                </aside>

                <main className="min-w-0 flex-1">
                    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl md:hidden">
                        <Link to="/app" className="flex items-center gap-2.5">
                            <img src={logo} alt="Makina Ime" className="h-8 w-auto object-contain" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <PwaInstallButton compact />
                            <ThemeToggle className="h-9 w-9" />
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-accent/60 text-muted-foreground"
                                >
                                    <Bell className="h-4 w-4" />
                                    {unreadCount > 0 && (
                                        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
                                    )}
                                </button>
                                {isNotifOpen && <NotificationCenter onClose={() => setIsNotifOpen(false)} />}
                            </div>
                        </div>
                    </header>

                    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-8 lg:px-10">
                        {children}
                    </div>
                </main>
            </div>

            <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around border-t border-border/80 bg-card/95 px-2 py-2 pb-safe backdrop-blur-xl md:hidden">
                <MobileNavItem icon={LayoutDashboard} label="Paneli" href="/app" isActive={location.pathname === '/app'} />
                <MobileNavItem icon={Car} label="Garazhi" href="/app" isActive={location.pathname.startsWith('/vehicle')} />
                <Link
                    to="/app"
                    className="relative -top-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    aria-label="Add record"
                >
                    <Plus className="h-6 w-6 stroke-[3]" />
                </Link>
                <MobileNavItem icon={CalendarDays} label="Kalendari" href="/calendar" isActive={location.pathname === '/calendar'} />
                <MobileNavItem icon={User} label="Profili" href="/profile" isActive={location.pathname === '/profile'} />
            </nav>
        </div>
    );
};
