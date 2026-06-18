import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    Building2,
    CalendarCheck,
    CheckCircle2,
    ClipboardCheck,
    Gauge,
    Receipt,
    ShieldCheck,
    UploadCloud,
    Users,
    Wrench,
} from 'lucide-react';
import { AppSurface, Panel, StatusPill } from '../components/ui/design-system';
import { PublicHeader } from '../components/PublicHeader';
import { DevelopmentDisclaimer, PaidPlanInterestForm } from '../components/DevelopmentNotice';
import {
    Seo,
    breadcrumbSchema,
    faqPageSchema,
    graphJsonLd,
    organizationSchema,
    webApplicationSchema,
    webPageSchema,
    websiteSchema,
} from '../lib/seo';
import logo from '../assets/Makina Ime Logo.webp';

const businessTitle = 'Makina Ime Business Fleet | Free fleet records, compliance, and expense tracking';
const businessDescription = 'Makina Ime Business Fleet is a free fleet management workspace for businesses. Track vehicles, documents, reminders, inspections, work orders, team roles, and expenses.';

const features = [
    { icon: Building2, title: 'Organization workspaces', body: 'Create a shared fleet account for company cars, taxis, rentals, service vans, dealership stock, or mixed fleets.' },
    { icon: Users, title: 'Roles and team access', body: 'Give owners, admins, managers, drivers, and viewers the right level of access to fleet records.' },
    { icon: ClipboardCheck, title: 'Inspections and issues', body: 'Run vehicle readiness checks, capture failed items, and convert them into issues and work orders.' },
    { icon: BarChart3, title: 'Fleet reporting', body: 'Review compliance score, unavailable vehicles, open issues, monthly spend, total spend, and cost per vehicle.' },
];

const useCases = [
    ['Taxi fleets', 'Track taxi permits, TPL insurance, technical inspections, readiness checks, driver assignments, and vehicles out of service.'],
    ['Rental fleets', 'Keep documents, service history, reconditioning tasks, mileage, and vehicle availability in one operational view.'],
    ['Car sellers', 'Maintain stock documents, ownership files, service invoices, preparation work, sold/reserved status, and exportable records.'],
    ['Company vehicles', 'Give managers visibility into renewals, assignments, departments, vendors, expenses, and service work.'],
];

const benefits = [
    ['Operational visibility', 'Managers can see which vehicles are healthy, due soon, expired, unavailable, assigned, or waiting for work.'],
    ['Lower compliance risk', 'Renewal dates, inspection failures, and document gaps are surfaced before they become expensive surprises.'],
    ['Cleaner team workflow', 'Drivers and managers can submit records without losing context across messages, paper folders, and spreadsheets.'],
    ['Cost accountability', 'Service, document, and manual expenses roll into fleet totals, monthly spend, and vehicle-level reporting.'],
];

const workflow = [
    ['Create workspace', 'Register a business account and create an organization for the fleet.'],
    ['Add vehicles', 'Enter vehicles manually or import stock with a CSV.'],
    ['Assign and inspect', 'Add drivers, departments, statuses, readiness checks, issues, and work orders.'],
    ['Monitor spend and deadlines', 'Use the dashboard for compliance, upcoming dates, vendors, and expense totals.'],
];

const faqs = [
    {
        question: 'Is Makina Ime Business Fleet free?',
        answer: 'Yes. Makina Ime Business Fleet and all currently available features are free during active development. Paid plans are expected later, after a more stable version is reached, with a target window in 2026.',
    },
    {
        question: 'What types of businesses can use the fleet workspace?',
        answer: 'Makina Ime Business Fleet is suitable for taxi fleets, rental fleets, company cars, service vans, car sellers, and mixed vehicle operations.',
    },
    {
        question: 'Can teams share access to fleet records?',
        answer: 'Yes. Business workspaces support organization records, member roles, team access, assignments, inspections, issues, work orders, and shared vehicle history.',
    },
    {
        question: 'What fleet information is reported?',
        answer: 'The fleet dashboard is designed to show vehicle status, compliance dates, monthly spend, total expenses, open issues, inspections, work orders, vendors, and vehicle-level records.',
    },
];

const structuredData = graphJsonLd([
    organizationSchema(),
    websiteSchema(),
    webPageSchema('/business-fleet', businessTitle, businessDescription),
    webApplicationSchema(
        '/business-fleet',
        'Makina Ime Business Fleet',
        businessDescription,
        'BusinessApplication',
        'Businesses that manage fleets, company vehicles, taxis, rentals, service vehicles, or dealer stock'
    ),
    breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Business Fleet', path: '/business-fleet' },
    ]),
    faqPageSchema(faqs),
]);

export const BusinessLanding = () => {
    const currentYear = new Date().getFullYear();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Seo title={businessTitle} description={businessDescription} path="/business-fleet" jsonLd={structuredData} />
            <PublicHeader
                tagline="Business fleet workspace"
                navItems={[
                    { label: 'Features', href: '#features' },
                    { label: 'Use cases', href: '#use-cases' },
                    { label: 'Benefits', href: '#benefits' },
                    { label: 'Personal users', to: '/' },
                ]}
                primaryCta={{ label: 'Create fleet', to: '/auth?type=business&mode=signup' }}
                alternateCta={{ label: 'Personal garage', to: '/' }}
            />

            <main>
                <section className="relative min-h-[86vh] overflow-hidden border-b border-border/80">
                    <img src={logo} alt="" width="658" height="658" decoding="async" className="pointer-events-none absolute right-[-5rem] top-10 w-[28rem] max-w-none opacity-10 sm:right-2 sm:w-[34rem]" />
                    <div className="absolute inset-x-0 bottom-0 hidden h-40 border-t border-border/50 bg-card/25 md:block" />
                    <div className="relative mx-auto flex min-h-[86vh] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-10">
                        <div className="max-w-3xl space-y-6">
                            <StatusPill tone="amber">
                                <Building2 className="h-3.5 w-3.5" />
                                Free during development, paid plans expected later
                            </StatusPill>
                            <div className="space-y-4">
                                <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
                                    <span>Makina Ime</span>
                                    {' '}
                                    <span className="block text-primary">Business Fleet</span>
                                </h1>
                                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                                    A shared vehicle operations workspace for companies that need fleet documents, compliance dates, inspections, work orders, assignments, and expenses under control.
                                </p>
                            </div>
                            <div className="grid gap-3 sm:flex">
                                <Link to="/auth?type=business&mode=signup" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90">
                                    Create your business fleet
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                                <Link to="/" className="inline-flex h-12 items-center justify-center rounded-xl border border-input bg-background/70 px-8 text-sm font-bold hover:bg-accent">
                                    Use personal garage
                                </Link>
                            </div>
                            <div className="grid max-w-3xl gap-3 pt-3 sm:grid-cols-3">
                                {['Team roles', 'Compliance tracking', 'Fleet expense totals'].map((item) => (
                                    <Panel key={item} className="flex items-center gap-3 p-3">
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                        <span className="text-sm font-semibold">{item}</span>
                                    </Panel>
                                ))}
                            </div>
                            <DevelopmentDisclaimer className="max-w-3xl" compact />
                        </div>
                        <div className="mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
                            <AppSurface className="p-5">
                                <ShieldCheck className="mb-4 h-6 w-6 text-emerald-400" />
                                <p className="mi-label">Compliance</p>
                                <h2 className="mt-2 text-xl font-bold">84% healthy</h2>
                                <p className="mt-2 text-sm text-muted-foreground">Insurance, tax, and inspections</p>
                            </AppSurface>
                            <AppSurface className="p-5">
                                <Wrench className="mb-4 h-6 w-6 text-primary" />
                                <p className="mi-label">Work orders</p>
                                <h2 className="mt-2 text-xl font-bold">7 open</h2>
                                <p className="mt-2 text-sm text-muted-foreground">Maintenance and repairs</p>
                            </AppSurface>
                            <AppSurface className="p-5">
                                <Receipt className="mb-4 h-6 w-6 text-blue-400" />
                                <p className="mi-label">Fleet spend</p>
                                <h2 className="mt-2 text-xl font-bold">€4,830</h2>
                                <p className="mt-2 text-sm text-muted-foreground">From linked records</p>
                            </AppSurface>
                        </div>
                    </div>
                </section>

                <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                    <div className="mb-7 max-w-3xl">
                        <p className="mi-label mb-2 text-primary">Business features</p>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">A fleet workspace for shared responsibility.</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Business mode extends the vehicle record into team operations: roles, assignments, inspections, issues, work orders, vendors, reports, and exports.
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

                <section id="use-cases" className="border-y border-border/80 bg-card/35">
                    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                        <div className="mb-7 max-w-3xl">
                            <p className="mi-label mb-2 text-primary">Use cases</p>
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for businesses that manage vehicles every week.</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {useCases.map(([title, body]) => (
                                <Panel key={title} className="p-5">
                                    <h3 className="font-bold">{title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                                </Panel>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="benefits" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                    <div className="mb-7 max-w-3xl">
                        <p className="mi-label mb-2 text-primary">Business value</p>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Turn scattered fleet admin into visible operating data.</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {benefits.map(([title, body]) => (
                            <AppSurface key={title} className="p-5">
                                <h3 className="font-bold">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                            </AppSurface>
                        ))}
                    </div>
                </section>

                <section className="border-y border-border/80 bg-card/35">
                    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                        <div className="mb-7 max-w-3xl">
                            <p className="mi-label mb-2 text-primary">Workflow</p>
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">From vehicle profile to fleet dashboard.</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-4">
                            {workflow.map(([title, body], index) => (
                                <AppSurface key={title} className="p-5">
                                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{index + 1}</div>
                                    <h3 className="font-semibold">{title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                                </AppSurface>
                            ))}
                        </div>
                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {[
                                [UploadCloud, 'Document metadata', 'Attach document records, costs, and expiry dates to the right vehicle.'],
                                [Gauge, 'Lifecycle status', 'Track active, in service, needs attention, out of service, reserved, sold, and archived vehicles.'],
                                [CalendarCheck, 'Renewal timeline', 'See upcoming legal dates and reminders across the fleet.'],
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
                    </div>
                </section>

                <section id="questions" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                    <div className="mb-7 max-w-3xl">
                        <p className="mi-label mb-2 text-primary">Questions</p>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Business fleet questions, answered directly.</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {faqs.map((item) => (
                            <AppSurface key={item.question} className="p-5">
                                <h3 className="font-bold">{item.question}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                            </AppSurface>
                        ))}
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                    <AppSurface className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <p className="mi-label mb-2 text-primary">Free during development</p>
                            <h2 className="text-2xl font-bold tracking-tight">Start building your fleet record system now.</h2>
                            <p className="mt-2 text-sm text-muted-foreground">All currently available business features are free while Makina Ime is in development. Paid plans are expected later after a more stable release, targeted within 2026.</p>
                        </div>
                        <Link to="/auth?type=business&mode=signup" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground">
                            Create fleet workspace
                        </Link>
                    </AppSurface>
                </section>

                <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-10">
                    <PaidPlanInterestForm />
                </section>
            </main>

            <footer className="border-t border-border/80">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
                    <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            <span>&copy; {currentYear} </span>
                            <span>Makina Ime. Business fleet documents, compliance, inspections, work orders, and expenses.</span>
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link to="/" className="hover:text-foreground">Personal users</Link>
                            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
                            <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
                            <Link to="/terms" className="hover:text-foreground">Terms</Link>
                        </div>
                    </div>
                    <p className="mt-5 max-w-4xl text-xs leading-5 text-muted-foreground">
                        Development notice: Makina Ime is shared as a work-in-progress project for early testing. Data safety and uninterrupted access are not guaranteed yet; use the platform at your own discretion.
                    </p>
                </div>
            </footer>
        </div>
    );
};
