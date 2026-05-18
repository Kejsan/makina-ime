import { Link } from 'react-router-dom';
import { Bell, Car, FileText, Lock, Receipt, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import logo from '../assets/Makina Ime Logo.png';

const features = [
    { icon: Car, title: 'Vehicle profile', body: 'Keep plate, VIN, mileage, expiry dates, and ownership details in one protected workspace.' },
    { icon: FileText, title: 'Private documents', body: 'Store insurance, inspection, tax, and service files behind signed short-lived access links.' },
    { icon: Receipt, title: 'Costs and expenses', body: 'Track service costs, document costs, and separate manual expenses against each vehicle.' },
    { icon: Bell, title: 'Reminders', body: 'Get browser and email reminders for renewals, maintenance, inspections, and care tasks.' },
];

export const Landing = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logo} alt="Makina Ime" className="h-10 w-auto" />
                    </Link>
                    <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
                        <a href="#features" className="hover:text-foreground">Features</a>
                        <a href="#security" className="hover:text-foreground">Security</a>
                        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
                    </nav>
                    <Link to="/auth" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                        Sign in
                    </Link>
                </div>
            </header>

            <main>
                <section className="border-b border-border">
                    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_0.9fr] md:items-center md:py-16">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
                                <ShieldCheck className="h-4 w-4" />
                                Security-first vehicle records
                            </div>
                            <div className="space-y-4">
                                <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                                    Makina Ime
                                </h1>
                                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                                    A mobile-first workspace for car documents, service history, costs, reminders, and long-term vehicle care.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link to="/auth" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                                    Create account
                                </Link>
                                <a href="#features" className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                                    See what it tracks
                                </a>
                            </div>
                        </div>

                        <Card className="overflow-hidden border-primary/20 bg-card p-0 shadow-xl">
                            <div className="border-b border-border bg-accent/40 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Garage overview</p>
                                        <p className="text-xs text-muted-foreground">Documents, costs, and deadlines</p>
                                    </div>
                                    <Lock className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                            <div className="space-y-4 p-5">
                                {[
                                    ['BMW X5', 'Insurance due in 19 days', '€420 tracked this year'],
                                    ['Mercedes C-Class', 'Service completed', 'Oil, filters, inspection'],
                                    ['VW Golf', 'Inspection document saved', 'Signed private link'],
                                ].map(([name, status, detail]) => (
                                    <div key={name} className="rounded-lg border border-border bg-background p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">{name}</p>
                                                <p className="text-sm text-muted-foreground">{status}</p>
                                            </div>
                                            <Car className="h-5 w-5 text-primary" />
                                        </div>
                                        <p className="mt-3 text-xs text-muted-foreground">{detail}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </section>

                <section id="features" className="mx-auto max-w-6xl px-4 py-12">
                    <div className="mb-6 max-w-2xl">
                        <h2 className="text-2xl font-bold tracking-tight">Built for the full vehicle lifecycle</h2>
                        <p className="mt-2 text-muted-foreground">
                            The app connects documents, servicing, expenses, reminders, and care history so ownership records stay complete.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {features.map(({ icon: Icon, title, body }) => (
                            <Card key={title} className="p-5">
                                <Icon className="mb-4 h-6 w-6 text-primary" />
                                <h3 className="font-semibold">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                            </Card>
                        ))}
                    </div>
                </section>

                <section id="security" className="border-y border-border bg-card/40">
                    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
                        <div className="md:col-span-1">
                            <h2 className="text-2xl font-bold tracking-tight">Privacy and security posture</h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                Sensitive files stay private, identity is handled by Firebase Auth, and user access is checked before data is read or changed.
                            </p>
                        </div>
                        <div className="grid gap-3 md:col-span-2 sm:grid-cols-2">
                            {['Private Cloudflare R2 file storage', 'Short-lived signed document URLs', 'Firebase authenticated access', 'Account export and deletion request path'].map((item) => (
                                <div key={item} className="flex items-center gap-3 rounded-lg bg-background p-4 text-sm">
                                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>Makina Ime. Vehicle documentation, servicing, and care records.</p>
                <div className="flex gap-4">
                    <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
                    <Link to="/terms" className="hover:text-foreground">Terms</Link>
                </div>
            </footer>
        </div>
    );
};
