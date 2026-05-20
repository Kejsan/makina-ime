import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    Bell,
    Building2,
    CalendarCheck,
    Car,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Gauge,
    Receipt,
    UploadCloud,
    Users,
    Wrench,
} from 'lucide-react';
import { AppSurface, Panel, StatusPill, ThemeToggle } from '../components/ui/design-system';
import logo from '../assets/Makina Ime Logo.png';

const personalFeatures = [
    { icon: Car, title: 'Vehicle profiles', body: 'Plate, VIN, mileage, value, engine size, and legal dates in one profile.' },
    { icon: FileText, title: 'Document vault', body: 'Keep registration, TPL insurance, inspection, road tax, ownership, and service PDFs attached to the right vehicle.' },
    { icon: Bell, title: 'Renewal reminders', body: 'Set alerts for documents, yearly renewals, inspections, tax payments, and maintenance routines.' },
    { icon: Receipt, title: 'Cost history', body: 'Track fuel, service, parking, tax, insurance, documents, and one-off vehicle expenses.' },
];

const businessFeatures = [
    { icon: Building2, title: 'Organization workspaces', body: 'Create shared fleet accounts for company cars, taxis, rentals, service vans, or dealer stock.' },
    { icon: Users, title: 'Roles and team access', body: 'Owners, admins, managers, drivers, and viewers get different levels of access.' },
    { icon: ClipboardCheck, title: 'Inspections and issues', body: 'Run readiness checks; failed checklist items create issues and work orders automatically.' },
    { icon: BarChart3, title: 'Fleet reporting', body: 'See compliance score, open issues, unavailable vehicles, vendor spend, and cost per vehicle.' },
];

const workflows = [
    ['Upload a document', 'OCR suggests dates, document type, plate, VIN, and cost before private upload.'],
    ['Connect the expense', 'Service and document costs can become expense records automatically.'],
    ['Create the reminder', 'Expiry dates can become reminders so renewals do not disappear into a folder.'],
    ['Review the dashboard', 'Personal and business dashboards show what is healthy, due soon, expired, or out of service.'],
];

const businessUseCases = [
    ['Taxi fleets', 'Track taxi permits, insurance, technical inspection, readiness checks, driver assignment, and out-of-service status.'],
    ['Rental fleets', 'Keep documents, mileage, service, damage/reconditioning tasks, and availability status per vehicle.'],
    ['Car sellers', 'Maintain stock documents, service invoices, ownership papers, prep work, and sold/reserved/archive status.'],
    ['Company vehicles', 'Give managers visibility into renewals, spend, inspections, vendors, and team assignments.'],
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
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vehicle records and fleet care</p>
                        </div>
                    </Link>
                    <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
                        <a href="#personal" className="hover:text-foreground">Personal</a>
                        <a href="#business" className="hover:text-foreground">Business</a>
                        <a href="#features" className="hover:text-foreground">Features</a>
                        <a href="#faq" className="hover:text-foreground">FAQ</a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link to="/auth" className="hidden h-10 items-center justify-center rounded-xl border border-input bg-background/70 px-4 text-sm font-semibold hover:bg-accent sm:inline-flex">
                            Sign in
                        </Link>
                        <Link to="/auth?type=personal&mode=signup" className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90">
                            Start free
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="border-b border-border/80">
                    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_0.95fr] md:items-center md:py-16 lg:px-10">
                        <div className="space-y-6">
                            <StatusPill tone="amber">
                                <CalendarCheck className="h-3.5 w-3.5" />
                                For private owners and business fleets
                            </StatusPill>
                            <div className="space-y-4">
                                <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
                                    Know every vehicle's documents, costs, care, and status.
                                </h1>
                                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                                    Makina Ime turns scattered car papers, service invoices, renewal dates, inspections, and expenses into one practical workspace for personal garages and shared business fleets.
                                </p>
                            </div>
                            <div className="grid gap-3 sm:flex">
                                <Link to="/auth?type=personal&mode=signup" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90">
                                    Register as personal user
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                                <Link to="/auth?type=business&mode=signup" className="inline-flex h-12 items-center justify-center rounded-xl border border-input bg-background/70 px-8 text-sm font-semibold hover:bg-accent">
                                    Register a business fleet
                                </Link>
                            </div>
                            <div className="grid gap-3 pt-2 sm:grid-cols-3">
                                {['No spreadsheet required', 'Private document uploads', 'Personal + business modes'].map((item) => (
                                    <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <AppSurface className="p-5">
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold">Fleet readiness snapshot</p>
                                    <p className="text-xs text-muted-foreground">Documents, costs, inspections, and deadlines</p>
                                </div>
                                <StatusPill tone="emerald">82% compliant</StatusPill>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Panel className="p-4">
                                    <Car className="mb-3 h-5 w-5 text-blue-400" />
                                    <p className="mi-label">Vehicles</p>
                                    <p className="text-2xl font-bold">24</p>
                                    <p className="text-xs text-muted-foreground">Personal or business</p>
                                </Panel>
                                <Panel className="p-4">
                                    <AlertBadge />
                                    <p className="mi-label">Needs action</p>
                                    <p className="text-2xl font-bold">5</p>
                                    <p className="text-xs text-muted-foreground">Due, expired, or in service</p>
                                </Panel>
                            </div>
                            <div className="mt-4 space-y-3">
                                {[
                                    ['AA 123 AB', 'TPL insurance due in 19 days', 'Renewal reminder active', 'amber'],
                                    ['Rental van 04', 'Inspection failed: tires', 'Work order opened', 'rose'],
                                    ['BMW X5', 'Service invoice uploaded', 'Expense linked', 'blue'],
                                    ['Taxi fleet', '3 permits due this month', 'Manager review', 'emerald'],
                                ].map(([name, status, detail, tone]) => (
                                    <Panel key={name} className="p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold">{name}</p>
                                                <p className="truncate text-sm text-muted-foreground">{status}</p>
                                            </div>
                                            <StatusPill tone={tone as 'amber' | 'emerald' | 'blue' | 'rose'}>{detail}</StatusPill>
                                        </div>
                                    </Panel>
                                ))}
                            </div>
                        </AppSurface>
                    </div>
                </section>

                <section id="personal" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                    <div className="mb-7 grid gap-4 md:grid-cols-[0.8fr_1fr] md:items-end">
                        <div>
                            <p className="mi-label mb-2 text-primary">Personal garage</p>
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">For owners who want fewer surprises.</h2>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                            Keep the full story of each car: when insurance expires, what the last service cost, where the registration file is, and what needs attention next.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {personalFeatures.map(({ icon: Icon, title, body }) => (
                            <AppSurface key={title} className="p-5">
                                <Icon className="mb-4 h-6 w-6 text-primary" />
                                <h3 className="font-semibold">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                            </AppSurface>
                        ))}
                    </div>
                    <div className="mt-7">
                        <Link to="/auth?type=personal&mode=signup" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground">
                            Start your personal garage
                        </Link>
                    </div>
                </section>

                <section id="business" className="border-y border-border/80 bg-card/35">
                    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                        <div className="mb-7 grid gap-4 md:grid-cols-[0.8fr_1fr] md:items-end">
                            <div>
                                <p className="mi-label mb-2 text-primary">Business fleet</p>
                                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">For teams that need vehicle status, not guesswork.</h2>
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Give managers and drivers a shared workspace for compliance, inspections, work orders, vendor history, document renewals, and operating costs.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {businessFeatures.map(({ icon: Icon, title, body }) => (
                                <AppSurface key={title} className="p-5">
                                    <Icon className="mb-4 h-6 w-6 text-primary" />
                                    <h3 className="font-semibold">{title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                                </AppSurface>
                            ))}
                        </div>
                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            {businessUseCases.map(([title, body]) => (
                                <Panel key={title} className="p-5">
                                    <h3 className="font-bold">{title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                                </Panel>
                            ))}
                        </div>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <Link to="/auth?type=business&mode=signup" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground">
                                Create a business workspace
                            </Link>
                            <a href="#features" className="inline-flex h-11 items-center justify-center rounded-xl border border-input bg-background/70 px-6 text-sm font-semibold hover:bg-accent">
                                Compare capabilities
                            </a>
                        </div>
                    </div>
                </section>

                <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                    <div className="mb-7 max-w-3xl">
                        <p className="mi-label mb-2 text-primary">How it works</p>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">One record chain from document to action.</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            The app is built around real vehicle admin work: upload the proof, capture the important dates and cost, create the reminder, and keep the vehicle status visible.
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                        {workflows.map(([title, body], index) => (
                            <AppSurface key={title} className="p-5">
                                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{index + 1}</div>
                                <h3 className="font-semibold">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                            </AppSurface>
                        ))}
                    </div>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {[
                            [UploadCloud, 'Local OCR assist', 'Review suggested document fields before saving.'],
                            [Gauge, 'Health status', 'See active, in service, needs attention, out of service, reserved, sold, and archived vehicles.'],
                            [Wrench, 'Maintenance history', 'Service logs and work orders keep repair context close to cost records.'],
                        ].map(([Icon, title, body]) => {
                            const FeatureIcon = Icon as typeof UploadCloud;
                            return (
                                <Panel key={title as string} className="p-5">
                                    <FeatureIcon className="mb-4 h-6 w-6 text-primary" />
                                    <h3 className="font-semibold">{title as string}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{body as string}</p>
                                </Panel>
                            );
                        })}
                    </div>
                </section>

                <section className="border-y border-border/80 bg-card/35">
                    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-10">
                        {[
                            ['Due soon', 'Know which documents and service tasks need action before they become urgent.'],
                            ['Every cost attached', 'Review vehicle spend from documents, service records, fuel, tax, insurance, and manual expenses.'],
                            ['Ready for teams', 'Move from a personal garage to a business workspace when the fleet grows.'],
                        ].map(([title, body]) => (
                            <div key={title}>
                                <h3 className="text-lg font-bold">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="faq" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                    <div className="mb-7 max-w-2xl">
                        <p className="mi-label mb-2 text-primary">Common questions</p>
                        <h2 className="text-2xl font-bold tracking-tight">Built for practical vehicle administration.</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {[
                            ['Can I use it for one car?', 'Yes. Personal registration starts with your own garage, and you can add more vehicles over time.'],
                            ['Can businesses assign vehicles to drivers?', 'Yes. Business vehicles support driver names, departments, lifecycle status, inspections, issues, and work orders.'],
                            ['Does it replace GPS tracking?', 'No. Makina Ime focuses on records, documents, compliance, service history, status, and costs. GPS integrations can come later.'],
                            ['Can I export records?', 'Personal users can export account records. Business users can export vehicle CSVs and organization JSON records.'],
                        ].map(([title, body]) => (
                            <AppSurface key={title} className="p-5">
                                <h3 className="font-bold">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                            </AppSurface>
                        ))}
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-10">
                    <AppSurface className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <p className="mi-label mb-2 text-primary">Choose your workspace</p>
                            <h2 className="text-2xl font-bold tracking-tight">Start with personal records or launch a business fleet workspace.</h2>
                            <p className="mt-2 text-sm text-muted-foreground">Both paths use the same vehicle-care foundation, with business tools added when teams need roles, inspections, reports, and shared operations.</p>
                        </div>
                        <div className="grid gap-2 sm:flex">
                            <Link to="/auth?type=personal&mode=signup" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground">
                                Personal signup
                            </Link>
                            <Link to="/auth?type=business&mode=signup" className="inline-flex h-12 items-center justify-center rounded-xl border border-input bg-background/70 px-6 text-sm font-semibold hover:bg-accent">
                                Business signup
                            </Link>
                        </div>
                    </AppSurface>
                </section>
            </main>

            <footer className="border-t border-border/80">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
                    <p>Makina Ime. Vehicle documentation, fleet operations, servicing, costs, and reminders.</p>
                    <div className="flex flex-wrap gap-4">
                        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
                        <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
                        <Link to="/terms" className="hover:text-foreground">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const AlertBadge = () => (
    <div className="mb-3 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <Bell className="h-3.5 w-3.5" />
    </div>
);
