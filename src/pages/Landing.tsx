import { Link } from 'react-router-dom';
import { Bell, Car, FileText, Lock, Receipt, ShieldCheck } from 'lucide-react';
import { AppSurface, Panel, StatusPill, ThemeToggle } from '../components/ui/design-system';
import logo from '../assets/Makina Ime Logo.png';

const features = [
    { icon: Car, title: 'Vehicle profile', body: 'Plate, VIN, mileage, expiry dates, and ownership context in one profile.' },
    { icon: FileText, title: 'Private documents', body: 'Insurance, inspection, tax, and service files stored privately through signed links.' },
    { icon: Receipt, title: 'Cost intelligence', body: 'Service costs, document costs, fuel, and separate manual expenses stay connected.' },
    { icon: Bell, title: 'Reminder workflow', body: 'Browser and email reminders for legal renewals, service tasks, and care routines.' },
];

export const Landing = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logo} alt="Makina Ime" className="h-10 w-auto" />
                        <div className="hidden sm:block">
                            <p className="text-sm font-extrabold">Makina Ime</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vehicle care platform</p>
                        </div>
                    </Link>
                    <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
                        <a href="#features" className="hover:text-foreground">Features</a>
                        <a href="#security" className="hover:text-foreground">Security</a>
                        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
                    </nav>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link to="/auth" className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90">
                            Sign in
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="border-b border-border/80">
                    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_0.95fr] md:items-center md:py-16 lg:px-10">
                        <div className="space-y-6">
                            <StatusPill tone="amber">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Security-first vehicle records
                            </StatusPill>
                            <div className="space-y-4">
                                <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
                                    Makina Ime
                                </h1>
                                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                                    A mobile-first PWA for car documents, servicing, expenses, reminders, and long-term care history.
                                </p>
                            </div>
                            <div className="grid gap-3 sm:flex">
                                <Link to="/auth" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90">
                                    Create account
                                </Link>
                                <a href="#features" className="inline-flex h-12 items-center justify-center rounded-xl border border-input bg-background/70 px-8 text-sm font-semibold hover:bg-accent">
                                    See what it tracks
                                </a>
                            </div>
                        </div>

                        <AppSurface className="p-5">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold">Garage overview</p>
                                    <p className="text-xs text-muted-foreground">Documents, costs, and deadlines</p>
                                </div>
                                <Lock className="h-5 w-5 text-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Panel className="p-4">
                                    <Car className="mb-3 h-5 w-5 text-blue-400" />
                                    <p className="mi-label">Mjetet</p>
                                    <p className="text-2xl font-bold">3</p>
                                    <p className="text-xs text-muted-foreground">Active profiles</p>
                                </Panel>
                                <Panel className="p-4">
                                    <Bell className="mb-3 h-5 w-5 text-amber-400" />
                                    <p className="mi-label">Afatet</p>
                                    <p className="text-2xl font-bold">2</p>
                                    <p className="text-xs text-muted-foreground">Due soon</p>
                                </Panel>
                            </div>
                            <div className="mt-4 space-y-3">
                                {[
                                    ['VW Polo', 'Insurance due in 19 days', '€175 tracked this month', 'amber'],
                                    ['Audi A4', 'Service completed', 'Oil, filters, inspection', 'emerald'],
                                    ['BMW X5', 'Private document saved', 'Signed R2 link', 'blue'],
                                ].map(([name, status, detail, tone]) => (
                                    <Panel key={name} className="p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold">{name}</p>
                                                <p className="truncate text-sm text-muted-foreground">{status}</p>
                                            </div>
                                            <StatusPill tone={tone as 'amber' | 'emerald' | 'blue'}>{detail}</StatusPill>
                                        </div>
                                    </Panel>
                                ))}
                            </div>
                        </AppSurface>
                    </div>
                </section>

                <section id="features" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
                    <div className="mb-6 max-w-2xl">
                        <p className="mi-label mb-2 text-primary">Complete ownership workspace</p>
                        <h2 className="text-2xl font-bold tracking-tight">Built for the full vehicle lifecycle</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            The product connects documents, servicing, expenses, reminders, and care history so ownership records stay usable.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {features.map(({ icon: Icon, title, body }) => (
                            <AppSurface key={title} className="p-5">
                                <Icon className="mb-4 h-6 w-6 text-primary" />
                                <h3 className="font-semibold">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                            </AppSurface>
                        ))}
                    </div>
                </section>

                <section id="security" className="border-y border-border/80 bg-card/35">
                    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-10">
                        <div>
                            <p className="mi-label mb-2 text-primary">Security posture</p>
                            <h2 className="text-2xl font-bold tracking-tight">Private by default</h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Identity, records, private files, and reminders are separated across trusted services with server-side access checks.
                            </p>
                        </div>
                        <div className="grid gap-3 md:col-span-2 sm:grid-cols-2">
                            {[
                                ['Firebase Auth', 'Authenticated access'],
                                ['Cloud Firestore', 'Vehicle metadata and records'],
                                ['Cloudflare R2', 'Private image and document files'],
                                ['Netlify Functions', 'Server-side R2 proxy and rate limits'],
                            ].map(([title, detail]) => (
                                <Panel key={title} className="flex items-center gap-3 p-4">
                                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                    <div>
                                        <p className="text-sm font-semibold">{title}</p>
                                        <p className="text-xs text-muted-foreground">{detail}</p>
                                    </div>
                                </Panel>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
                    <AppSurface className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Ready to organize your garage?</h2>
                            <p className="mt-2 text-sm text-muted-foreground">Start with one vehicle, then add documents, service logs, costs, and reminders as they happen.</p>
                        </div>
                        <Link to="/auth" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground">
                            Start now
                        </Link>
                    </AppSurface>
                </section>
            </main>

            <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
                <p>Makina Ime. Vehicle documentation, servicing, and care records.</p>
                <div className="flex gap-4">
                    <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
                    <Link to="/terms" className="hover:text-foreground">Terms</Link>
                </div>
            </footer>
        </div>
    );
};
