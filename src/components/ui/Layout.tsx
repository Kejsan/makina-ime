import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    LogOut, 
    Menu, 
    X, 
    Shield,
    User,
    Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { NotificationCenter } from '../NotificationCenter';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    isActive?: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, href, isActive, onClick }: SidebarItemProps) => (
    <Link
        to={href}
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
            isActive 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
    >
        <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
        <span>{label}</span>
    </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Notification Logic
    useEffect(() => {
        if (!user) return;

        // Request Browser Notification Permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
            
            // Show browser notification for newest one if it's new
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && Notification.permission === "granted") {
                    const data = change.doc.data();
                    new Notification(data.title, {
                        body: data.body,
                        icon: '/pwa-192x192.png'
                    });
                }
            });
        });

        return unsubscribe;
    }, [user]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const navItems = [
        { icon: LayoutDashboard, label: t('Dashboard'), href: '/' },
        // { icon: Car, label: t('My Vehicles'), href: '/vehicles' }, // Future
        // { icon: Settings, label: t('Settings'), href: '/settings' }, // Future
    ];

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-xl h-screen sticky top-0">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Makina Ime" className="h-10 w-auto object-contain" />
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className="p-2 hover:bg-accent rounded-full relative transition-colors group"
                        >
                            <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                            )}
                        </button>
                        {isNotifOpen && <NotificationCenter onClose={() => setIsNotifOpen(false)} />}
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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

                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/50 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                            <p className="text-xs text-muted-foreground">Pro Member</p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleSignOut}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t('Sign Out')}
                    </Button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-200 md:hidden flex flex-col",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                 <div className="p-6 border-b border-border flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        <span className="font-bold text-lg">AUTOADMIN</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)}>
                        <X className="w-6 h-6 text-muted-foreground" />
                    </button>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.href}
                            icon={item.icon}
                            label={item.label}
                            href={item.href}
                            isActive={location.pathname === item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    ))}
                </nav>
                <div className="p-4 border-t border-border">
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start text-destructive"
                        onClick={handleSignOut}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t('Sign Out')}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="md:hidden h-16 border-b border-border flex items-center justify-between px-4 bg-background/50 backdrop-blur-md sticky top-0 z-40">
                    <div className="flex items-center">
                        <button onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu className="w-6 h-6 text-foreground" />
                        </button>
                        <span className="ml-4 font-semibold">Makina Ime</span>
                    </div>
                    
                    <div className="relative">
                        <button 
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className="p-2 hover:bg-accent rounded-full relative transition-colors"
                        >
                            <Bell className="w-6 h-6 text-muted-foreground" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center animate-pulse">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        {isNotifOpen && <NotificationCenter onClose={() => setIsNotifOpen(false)} />}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

