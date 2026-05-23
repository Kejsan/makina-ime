import { Link } from 'react-router-dom';
import {
    ArrowRight,
    Bell,
    CalendarCheck,
    Car,
    CheckCircle2,
    FileText,
    Gauge,
    Receipt,
    Smartphone,
    UploadCloud,
    Wrench,
} from 'lucide-react';
import { AppSurface, Panel, StatusPill, ThemeToggle } from '../components/ui/design-system';
import { PwaInstallButton } from '../components/PwaInstallButton';
import {
    Seo,
    faqPageSchema,
    graphJsonLd,
    organizationSchema,
    webApplicationSchema,
    webPageSchema,
    websiteSchema,
} from '../lib/seo';
import logo from '../assets/Makina Ime Logo.png';

const personalTitle = 'Makina Ime Personal Garage | Free vehicle documents, reminders, and expenses';
const personalDescription = 'Makina Ime Personal Garage is a free vehicle management app for private car owners. Track documents, renewal reminders, service history, and expenses from one dashboard.';

const features = [
    { icon: Car, title: 'One profile per vehicle', body: 'Save make, model, plate, VIN, mileage, engine capacity, value, and renewal dates for each car.' },
    { icon: FileText, title: 'Private document vault', body: 'Attach insurance, registration, inspection, tax, ownership, service invoices, and warranties to the right vehicle.' },
    { icon: Bell, title: 'Renewal reminders', body: 'Track TPL insurance, road tax, technical inspection, tinted-glass certificates, and custom maintenance tasks.' },
    { icon: Receipt, title: 'Real expense history', body: 'Log fuel, servicing, parking, tax, insurance, documents, and other costs so totals and monthly stats stay visible.' },
];

const benefits = [
    ['Less renewal stress', 'See upcoming dates before documents expire instead of searching through messages and folders.'],
    ['Better ownership history', 'Keep a usable record of repairs, invoices, mileage, and vehicle care over time.'],
    ['Clear cost visibility', 'Know what each car costs this month and across its full history.'],
    ['Mobile-first access', 'Use it as a browser app from your phone, with installation support and quick daily access.'],
];

const workflow = [
    ['Add your car', 'Create a vehicle profile with the legal and care fields that matter.'],
    ['Upload or enter records', 'Save documents, services, manual expenses, and reminder dates.'],
    ['Review the dashboard', 'Totals, deadlines, service history, and reminders stay connected to the vehicle.'],
    ['Update anything later', 'Edit vehicle data, manual expenses, service records, and reminders as information changes.'],
];

const faqs = [
    {
        question: 'Is Makina Ime free for personal users?',
        answer: 'Yes. The first version of Makina Ime Personal Garage is free for private vehicle owners, with a paid version planned later for advanced capabilities.',
    },
    {
        question: 'What can I track in a personal garage?',
        answer: 'You can track vehicle profiles, insurance and road tax dates, technical inspections, service history, uploaded document metadata, reminders, fuel, maintenance, and other expenses.',
    },
    {
        question: 'Can I install Makina Ime on my phone?',
        answer: 'Yes. Makina Ime is built as an installable progressive web app, so supported mobile browsers can add it to the home screen for quicker access.',
    },
    {
        question: 'Can vehicle records and expenses be edited later?',
        answer: 'Yes. Vehicle details, manual expenses, service records, and reminders are designed to stay editable as your information changes.',
    },
];

const structuredData = graphJsonLd([
    organizationSchema(),
    websiteSchema(),
    webPageSchema('/', personalTitle, personalDescription),
    webApplicationSchema(
        '/',
        'Makina Ime Personal Garage',
        personalDescription,
        'LifestyleApplication',
        'Private vehicle owners'
    ),
    faqPageSchema(faqs),
]);

export const Landing = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Seo title={personalTitle} description={personalDescription} path="/" jsonLd={structuredData} />
            <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logo} alt="Makina Ime" className="h-10 w-auto" />
                        <div className="hidden sm:block">
                            <p className="text-sm font-extrabold">Makina Ime</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personal vehicle care</p>
                        </div>
                    </Link>
                    <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
                        <a href="#features" className="hover:text-foreground">Features</a>
                        <a href="#benefits" className="hover:text-foreground">Benefits</a>
                        <a href="#how-it-works" className="hover:text-foreground">How it works</a>
                        <Link to="/business-fleet" className="hover:text-foreground">For businesses</Link>
                    </nav>
                    <div className="flex items-center gap-2">
                        <PwaInstallButton compact autoOffer />
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
                <section className="relative min-h-[86vh] overflow-hidden border-b border-border/80">
                    <img src={logo} alt="" className="pointer-events-none absolute right-[-5rem] top-10 w-[28rem] max-w-none opacity-10 sm:right-2 sm:w-[34rem]" />
                    <div className="absolute inset-x-0 bottom-0 hidden h-40 border-t border-border/50 bg-card/25 md:block" />
                    <div className="relative mx-auto flex min-h-[86vh] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-10">
                        <div className="max-w-3xl space-y-6">
                            <StatusPill tone="emerald">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Free for personal users
                            </StatusPill>
                            <div className="space-y-4">
                                <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">Makina Ime Personal Garage</h1>
                                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                                    A practical car management app for private owners who want documents, renewal dates, service history, reminders, and expenses in one place.
                                </p>
                            </div>
                            <div className="grid gap-3 sm:flex">
                                <Link to="/auth?type=personal&mode=signup" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90">
                                    Create your personal garage
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </div>
                            <div className="grid max-w-3xl gap-3 pt-3 sm:grid-cols-3">
                                {['Document storage', 'Expense totals', 'Renewal calendar'].map((item) => (
                                    <Panel key={item} className="flex items-center gap-3 p-3">
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                        <span className="text-sm font-semibold">{item}</span>
                                    </Panel>
                                ))}
                            </div>
                        </div>
                        <div className="mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
                            <AppSurface className="p-5">
                                <CalendarCheck className="mb-4 h-6 w-6 text-primary" />
                                <p className="mi-label">Next action</p>
                                <h2 className="mt-2 text-xl font-bold">TPL insurance</h2>
                                <p className="mt-2 text-sm text-muted-foreground">Due in 19 days</p>
                            </AppSurface>
                            <AppSurface className="p-5">
                                <Receipt className="mb-4 h-6 w-6 text-emerald-400" />
                                <p className="mi-label">This month</p>
                                <h2 className="mt-2 text-xl font-bold">€223.00</h2>
                                <p className="mt-2 text-sm text-muted-foreground">Fuel and service costs</p>
                            </AppSurface>
                            <AppSurface className="p-5">
                                <Smartphone className="mb-4 h-6 w-6 text-blue-400" />
                                <p className="mi-label">Phone ready</p>
                                <h2 className="mt-2 text-xl font-bold">Installable app</h2>
                                <p className="mt-2 text-sm text-muted-foreground">Open from your home screen</p>
                            </AppSurface>
                        </div>
                    </div>
                </section>

                <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                    <div className="mb-7 max-w-3xl">
                        <p className="mi-label mb-2 text-primary">Personal features</p>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything a private owner needs to keep a car organized.</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Makina Ime keeps the vehicle as the center of the record, so documents, expenses, services, and reminders do not get separated.
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

                <section id="benefits" className="border-y border-border/80 bg-card/35">
                    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                        <div className="mb-7 max-w-3xl">
                            <p className="mi-label mb-2 text-primary">Why use it</p>
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Less guessing, fewer missed dates, cleaner records.</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {benefits.map(([title, body]) => (
                                <Panel key={title} className="p-5">
                                    <h3 className="font-bold">{title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                                </Panel>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                    <div className="mb-7 max-w-3xl">
                        <p className="mi-label mb-2 text-primary">How it works</p>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">A simple record chain for each car.</h2>
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
                            [UploadCloud, 'OCR-assisted uploads', 'Review suggested document fields before saving metadata.'],
                            [Gauge, 'Mileage and status context', 'Keep care history tied to the car profile.'],
                            [Wrench, 'Service log', 'Costs created from service records stay connected to expense totals.'],
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

                <section id="questions" className="border-y border-border/80 bg-card/35">
                    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
                        <div className="mb-7 max-w-3xl">
                            <p className="mi-label mb-2 text-primary">Questions</p>
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Personal garage questions, answered directly.</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {faqs.map((item) => (
                                <Panel key={item.question} className="p-5">
                                    <h3 className="font-bold">{item.question}</h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                                </Panel>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-10">
                    <AppSurface className="grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <p className="mi-label mb-2 text-primary">Free first version</p>
                            <h2 className="text-2xl font-bold tracking-tight">Start organizing your vehicle records today.</h2>
                            <p className="mt-2 text-sm text-muted-foreground">This first version is free for personal users. A paid version with advanced capabilities is planned later.</p>
                        </div>
                        <Link to="/auth?type=personal&mode=signup" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground">
                            Start free
                        </Link>
                    </AppSurface>
                </section>
            </main>

            <footer className="border-t border-border/80">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
                    <p>Makina Ime. Personal vehicle documents, expenses, services, and reminders.</p>
                    <div className="flex flex-wrap gap-4">
                        <Link to="/business-fleet" className="hover:text-foreground">Business fleets</Link>
                        <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
                        <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
                        <Link to="/terms" className="hover:text-foreground">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};
