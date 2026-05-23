import type React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export const AppSurface = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('mi-surface', className)} {...props} />
);

export const Panel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('mi-panel', className)} {...props} />
);

export const PageHeader = ({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: React.ReactNode;
}) => (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
            {eyebrow && <p className="mi-label mb-2 text-primary">{eyebrow}</p>}
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
            {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div>}
    </div>
);

export const MetricCard = ({
    icon: Icon,
    label,
    value,
    detail,
    tone = 'blue',
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    detail?: string;
    tone?: 'amber' | 'blue' | 'emerald' | 'indigo' | 'rose';
}) => {
    const tones = {
        amber: 'bg-amber-500/10 text-amber-400',
        blue: 'bg-blue-500/10 text-blue-400',
        emerald: 'bg-emerald-500/10 text-emerald-400',
        indigo: 'bg-indigo-500/10 text-indigo-400',
        rose: 'bg-rose-500/10 text-rose-400',
    };

    return (
        <AppSurface className="p-5 transition-transform duration-200 hover:-translate-y-0.5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <span className="mi-label">{label}</span>
                <div className={cn('rounded-xl p-2.5', tones[tone])}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {detail && <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p>}
        </AppSurface>
    );
};

export const StatusPill = ({
    children,
    tone = 'slate',
}: {
    children: React.ReactNode;
    tone?: 'amber' | 'blue' | 'emerald' | 'indigo' | 'rose' | 'slate';
}) => {
    const tones = {
        amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
        emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
        rose: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
        slate: 'border-border bg-accent/60 text-muted-foreground',
    };

    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', tones[tone])}>
            {children}
        </span>
    );
};

export const EmptyState = ({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    action?: React.ReactNode;
}) => (
    <div className="mi-panel flex flex-col items-center justify-center px-5 py-12 text-center">
        <div className="mb-4 rounded-2xl bg-accent/70 p-4 text-muted-foreground">
            <Icon className="h-8 w-8" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        {action && <div className="mt-5">{action}</div>}
    </div>
);

export const ThemeToggle = ({ className }: { className?: string }) => {
    const { theme, toggleTheme } = useTheme();
    const Icon = theme === 'dark' ? Sun : Moon;

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-accent/60 text-muted-foreground transition-colors hover:text-foreground', className)}
            title="Toggle theme"
            aria-label="Toggle theme"
        >
            <Icon className="h-4 w-4" />
        </button>
    );
};
