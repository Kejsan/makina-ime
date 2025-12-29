import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    LogOut, 
    Menu, 
    X, 
    Shield,
    User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';
import { cn } from '../../lib/utils';

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
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-none tracking-tight">AUTOADMIN</h1>
                            <p className="text-xs text-muted-foreground">Premium Fleet</p>
                        </div>
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
                <header className="md:hidden h-16 border-b border-border flex items-center px-4 bg-background/50 backdrop-blur-md sticky top-0 z-40">
                    <button onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="w-6 h-6 text-foreground" />
                    </button>
                    <span className="ml-4 font-semibold">Makina Ime</span>
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

