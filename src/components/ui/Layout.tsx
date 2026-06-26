import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Bell,
    Building2,
    Car,
    CalendarDays,
    AlertTriangle,
    LayoutDashboard,
    LogOut,
    Plus,
    User,
    Wrench,
} from 'lucide-react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { NotificationCenter } from '../NotificationCenter';
import { QuickAddSheet } from '../QuickAddSheet';
import { PwaInstallButton } from '../PwaInstallButton';
import { DevelopmentDisclaimer, PaidPlanInterestForm } from '../DevelopmentNotice';
import { ThemeToggle } from './design-system';
import logo from '../../assets/Makina Ime Logo.webp';
import { useWorkspace } from '../../context/WorkspaceContext';
import { registerPushDevice, subscribeForegroundPushMessages } from '../../lib/notifications';
import type { Reminder } from '../../lib/types';

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
            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors',
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
            'flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
    >
        <Icon className="h-5 w-5" />
        <span className="max-w-full truncate">{label}</span>
    </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { workspaceType, organizationId, switchWorkspace } = useWorkspace();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [overdueCount, setOverdueCount] = useState(0);
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
        });

        return unsubscribe;
    }, [user]);

    useEffect(() => {
        if (!user || !browserNotificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
        void registerPushDevice(user.uid).catch(() => null);

        let unsubscribe: (() => void) | undefined;
        void subscribeForegroundPushMessages(({ title, body, tag }) => {
            new Notification(title, {
                body,
                icon: '/pwa-192x192.png',
                tag,
            });
        }).then((nextUnsubscribe) => {
            unsubscribe = nextUnsubscribe;
        });

        return () => {
            unsubscribe?.();
        };
    }, [browserNotificationsEnabled, user]);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'reminders'),
            where('userId', '==', user.uid),
            where('completed', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const overdue = snapshot.docs
                .map((item) => item.data() as Reminder)
                .filter((reminder) => {
                    const dueDate = reminder.dueDate?.toDate?.();
                    if (!dueDate) return false;
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate < today;
                });
            setOverdueCount(overdue.length);
        }, () => setOverdueCount(0));

        return unsubscribe;
    }, [user]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const handleQuickAdd = () => {
        const params = new URLSearchParams(location.search);
        params.set('add', 'choose');
        navigate(`${location.pathname}?${params.toString()}`);
    };

    const workspaceHome = workspaceType === 'business' ? (organizationId ? `/business/${organizationId}` : '/business') : '/personal';
    const navItems = workspaceType === 'business'
        ? [
            { icon: LayoutDashboard, label: 'Overview', href: workspaceHome },
            { icon: Car, label: 'Fleet', href: `${workspaceHome}#fleet-register` },
            { icon: Wrench, label: 'Work', href: `${workspaceHome}?view=work` },
            { icon: CalendarDays, label: 'Calendar', href: organizationId ? `/business/${organizationId}/calendar` : '/business' },
            { icon: User, label: t('Account'), href: `/account?workspace=business${organizationId ? `&org=${organizationId}` : ''}` },
        ]
        : [
            { icon: LayoutDashboard, label: t('Dashboard'), href: '/personal' },
            { icon: Car, label: t('Garage'), href: '/personal#garage-section' },
            { icon: CalendarDays, label: t('Calendar'), href: '/personal/calendar' },
            { icon: User, label: t('Account'), href: '/account?workspace=personal' },
        ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
                <aside className="hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-border/80 bg-card p-5 md:sticky md:top-0 md:flex">
                    <div>
                        <Link to={workspaceHome} className="mb-5 flex items-center gap-3">
                            <img src={logo} alt="Makina Ime" width="658" height="658" className="h-10 w-auto object-contain" />
                            <div>
                                <p className="text-sm font-extrabold tracking-tight">Makina Ime</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{workspaceType === 'business' ? 'Business Fleet' : 'Personal Garage'}</p>
                            </div>
                        </Link>

                        <button
                            type="button"
                            onClick={() => void switchWorkspace(workspaceType === 'business' ? 'personal' : 'business')}
                            className="mb-6 flex w-full items-center justify-between rounded-xl border border-border bg-background/50 px-3 py-2 text-left"
                        >
                            <span>
                                <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Workspace</span>
                                <span className="text-sm font-semibold">{workspaceType === 'business' ? 'Business' : 'Personal'}</span>
                            </span>
                            {workspaceType === 'business' ? <Building2 className="h-4 w-4 text-indigo-400" /> : <Car className="h-4 w-4 text-emerald-400" />}
                        </button>

                        <nav className="space-y-2">
                            {navItems.map((item) => (
                                <SidebarItem
                                    key={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    href={item.href}
                                    isActive={location.pathname === item.href.split(/[?#]/)[0] || (item.label === 'Fleet' && location.pathname.includes('/vehicles/'))}
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
                                        Signed in
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
                    <header className="sticky top-0 z-30 flex min-h-16 min-w-0 items-center justify-between gap-2 border-b border-border/80 bg-background px-4 pt-safe md:hidden">
                        <Link to={workspaceHome} className="flex min-w-0 items-center gap-2.5">
                            <img src={logo} alt="Makina Ime" width="658" height="658" className="h-8 w-auto object-contain" />
                            <span className={`hidden rounded-lg px-2 py-1 text-[10px] font-bold uppercase min-[350px]:inline ${workspaceType === 'business' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {workspaceType === 'business' ? 'Business' : 'Personal'}
                            </span>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void switchWorkspace(workspaceType === 'business' ? 'personal' : 'business')}
                                aria-label="Switch workspace"
                                title="Switch workspace"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-accent/60 text-muted-foreground hover:text-foreground"
                            >
                                {workspaceType === 'business' ? <Car className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            </button>
                            <PwaInstallButton compact autoOffer />
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

                    <div className="mx-auto min-w-0 max-w-7xl px-4 py-5 pb-28 sm:px-6 md:py-8 md:pb-8 lg:px-10">
                        {overdueCount > 0 && (
                            <Link
                                to={workspaceType === 'business' && organizationId ? `/business/${organizationId}/calendar` : '/personal/calendar'}
                                className="mb-5 flex items-start gap-3 rounded-xl border border-border border-l-4 border-l-amber-500 bg-card p-4 text-sm text-foreground shadow-sm transition-colors hover:bg-accent/50"
                            >
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>
                                    <span className="block font-bold">{overdueCount} {t(overdueCount === 1 ? 'overdue reminder' : 'overdue reminders')}</span>
                                    <span className="mt-1 block text-xs text-muted-foreground">{t('Open the calendar to review missed vehicle deadlines and maintenance tasks.')}</span>
                                </span>
                            </Link>
                        )}
                        {children}
                        <div className="mt-8 grid gap-5">
                            <DevelopmentDisclaimer />
                            <PaidPlanInterestForm compact />
                        </div>
                    </div>
                </main>
            </div>

            <nav className="px-safe fixed bottom-0 left-0 right-0 z-40 grid min-w-0 grid-cols-5 items-end border-t border-border/80 bg-card py-2 pb-safe md:hidden">
                <MobileNavItem icon={LayoutDashboard} label={workspaceType === 'business' ? 'Overview' : t('Paneli')} href={workspaceHome} isActive={location.pathname === workspaceHome && !location.hash} />
                <MobileNavItem icon={Car} label={workspaceType === 'business' ? 'Fleet' : t('Garazhi')} href={`${workspaceHome}${workspaceType === 'business' ? '#fleet-register' : '#garage-section'}`} isActive={location.hash === '#fleet-register' || location.hash === '#garage-section' || location.pathname.includes('/vehicles/')} />
                <button
                    type="button"
                    onClick={handleQuickAdd}
                    className="relative -top-5 mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    aria-label={t('Add record')}
                    title={t('Add record')}
                >
                    <Plus className="h-6 w-6 stroke-[3]" />
                </button>
                <MobileNavItem icon={workspaceType === 'business' ? Wrench : CalendarDays} label={workspaceType === 'business' ? 'Work' : t('Kalendari')} href={workspaceType === 'business' ? `${workspaceHome}?view=work` : '/personal/calendar'} isActive={workspaceType === 'business' ? location.search.includes('view=work') : location.pathname === '/personal/calendar'} />
                <MobileNavItem icon={User} label={t('Account')} href={workspaceType === 'business' ? `/account?workspace=business${organizationId ? `&org=${organizationId}` : ''}` : '/account?workspace=personal'} isActive={location.pathname === '/account'} />
            </nav>
            <QuickAddSheet />
        </div>
    );
};
