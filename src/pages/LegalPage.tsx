import type React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { AppSurface, StatusPill, ThemeToggle } from '../components/ui/design-system';
import { PwaInstallButton } from '../components/PwaInstallButton';
import {
    Seo,
    breadcrumbSchema,
    graphJsonLd,
    organizationSchema,
    webPageSchema,
    websiteSchema,
} from '../lib/seo';
import logo from '../assets/Makina Ime Logo.png';

const updatedAt = '20 May 2026';
const contactEmail = 'infomakinaime@gmail.com';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
);

const policyMeta = {
    privacy: {
        badge: 'Privacy and data protection',
        title: 'Privacy Policy',
        description: 'Read the Makina Ime Privacy Policy for personal vehicle and business fleet records, document metadata, reminders, account data, exports, and deletion requests.',
        path: '/privacy',
        icon: ShieldCheck,
    },
    terms: {
        badge: 'Service terms',
        title: 'Terms and Conditions',
        description: 'Read the Makina Ime Terms and Conditions for personal vehicle accounts, business fleet workspaces, shared records, files, reminders, and service availability.',
        path: '/terms',
        icon: FileText,
    },
    cookies: {
        badge: 'Cookie and local storage notice',
        title: 'Cookie Policy',
        description: 'Read the Makina Ime Cookie Policy covering necessary browser storage, preferences, PWA behavior, analytics, and cookie controls.',
        path: '/cookies',
        icon: ShieldCheck,
    },
};

export const LegalPage = ({ type }: { type: 'privacy' | 'terms' | 'cookies' }) => {
    const meta = policyMeta[type];
    const Icon = meta.icon;
    const title = `${meta.title} | Makina Ime`;
    const structuredData = graphJsonLd([
        organizationSchema(),
        websiteSchema(),
        webPageSchema(meta.path, title, meta.description),
        breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: meta.title, path: meta.path },
        ]),
    ]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Seo title={title} description={meta.description} path={meta.path} jsonLd={structuredData} />
            <header className="border-b border-border/80 bg-background/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logo} alt="Makina Ime" className="h-9 w-auto" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <PwaInstallButton compact />
                        <ThemeToggle />
                        <Link to="/auth" className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                            Sign in
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-10">
                <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>

                <div className="mb-10 space-y-4">
                    <StatusPill tone="amber">
                        <Icon className="h-4 w-4" />
                        {meta.badge}
                    </StatusPill>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{meta.title}</h1>
                    <p className="text-sm text-muted-foreground">Last updated: {updatedAt}</p>
                </div>

                {type === 'privacy' && <PrivacyPolicy />}
                {type === 'terms' && <TermsPolicy />}
                {type === 'cookies' && <CookiePolicy />}
            </main>
        </div>
    );
};

const PrivacyPolicy = () => (
    <AppSurface className="space-y-8 p-6 sm:p-8">
        <Section title="What Makina Ime Collects">
            <p>Makina Ime collects the information needed to provide personal vehicle and business fleet records. This may include account email, vehicle make/model/year, plate number, VIN, mileage, vehicle status, assignments, document metadata, service records, expenses, reminders, inspections, issues, work orders, vendors, organization names, team roles, and uploaded files.</p>
            <p>For business workspaces, organization owners or administrators may add member emails, assign roles, invite users, create vehicle records, and store operational information about fleet status and maintenance.</p>
        </Section>
        <Section title="Uploaded Documents And Files">
            <p>You may upload registration certificates, insurance documents, technical inspection papers, road tax documents, ownership papers, service invoices, taxi permits, contracts, photos, and related files. File metadata is stored with the vehicle record. Private file contents are used only to provide upload, download, document review, and recordkeeping functionality.</p>
        </Section>
        <Section title="How Data Is Used">
            <p>We use data to provide account access, personal garage management, organization workspaces, reminders, document storage, OCR assistance, expense tracking, inspection records, work order tracking, exports, notifications, and customer support.</p>
            <p>We do not sell private vehicle records or uploaded files. We do not use uploaded vehicle documents for advertising.</p>
        </Section>
        <Section title="Business Workspace Data">
            <p>Business workspace records may be visible to other members of the same organization according to their assigned role. Organization owners and administrators are responsible for inviting the correct users, assigning suitable roles, and ensuring they have permission to store business, employee, driver, customer, or vehicle information in the platform.</p>
        </Section>
        <Section title="Service Providers">
            <p>Makina Ime uses third-party infrastructure and service providers for authentication, database storage, private file storage, hosting, serverless functions, email delivery, and browser-based app delivery. These providers process data only as needed to operate the service.</p>
        </Section>
        <Section title="Cookies And Local Storage">
            <p>Makina Ime uses necessary cookies or browser storage for authentication, session behavior, theme preferences, app installation behavior, language preferences, and service operation. See the Cookie Policy for more detail.</p>
        </Section>
        <Section title="Retention, Export, And Deletion">
            <p>Personal users can export account records from Profile Settings. Business users can export vehicle and organization records where their role allows it. You may request account deletion from Profile Settings or by contacting {contactEmail}. Some business records may remain in an organization workspace if they are needed by that organization or required for legitimate recordkeeping.</p>
        </Section>
        <Section title="Your Rights">
            <p>For an Albania/EU GDPR-style launch, you may request access, correction, export, restriction, objection, or deletion of personal data. Send requests to {contactEmail}. We may need to verify account ownership and, for organization data, confirm whether you are acting personally or on behalf of a business workspace.</p>
        </Section>
        <Section title="Contact">
            <p>For privacy questions or data rights requests, contact {contactEmail}.</p>
        </Section>
    </AppSurface>
);

const TermsPolicy = () => (
    <AppSurface className="space-y-8 p-6 sm:p-8">
        <Section title="Use Of The Service">
            <p>Makina Ime helps personal users and business organizations manage vehicle documents, service history, expenses, reminders, inspections, issues, work orders, and fleet status. You are responsible for the accuracy of the information you enter and for keeping legally required vehicle documents valid.</p>
        </Section>
        <Section title="Personal And Business Accounts">
            <p>Personal accounts are intended for individual vehicle records. Business workspaces are intended for teams and organizations such as taxi fleets, rental fleets, company vehicle fleets, car sellers, and service vehicle operators.</p>
            <p>If you create or administer a business workspace, you confirm that you are authorized to do so for that organization and that you will manage member access responsibly.</p>
        </Section>
        <Section title="Roles And Shared Records">
            <p>Business workspace roles may allow members to view, create, edit, or manage shared organization records. Organization owners and administrators are responsible for invitations, role changes, and removing access when a team member should no longer use the workspace.</p>
        </Section>
        <Section title="No Legal, Insurance, Tax, Or Mechanical Advice">
            <p>The app is an organizational and recordkeeping tool. Reminders, summaries, inspections, OCR suggestions, work orders, reports, and dashboards do not replace legal, insurance, tax, roadworthiness, or professional mechanic advice.</p>
        </Section>
        <Section title="Files And Records">
            <p>You should only upload files you have the right to store. Do not upload unlawful, malicious, unrelated, or harmful content. We may remove content or disable access if needed for security, abuse prevention, service reliability, or legal compliance.</p>
        </Section>
        <Section title="Account Security">
            <p>You must keep login credentials secure and notify us if you believe your account or business workspace has been accessed without authorization. We may suspend access where needed to protect users, organizations, or the platform.</p>
        </Section>
        <Section title="Availability And Liability">
            <p>We aim to keep the platform reliable, but we do not guarantee uninterrupted service. To the extent allowed by law, Makina Ime is not liable for missed renewals, expired documents, incorrect records, business downtime, lost sales, missed inspections, or third-party service outages.</p>
        </Section>
        <Section title="Changes To The Service">
            <p>We may improve, change, add, or remove features over time. If changes materially affect user rights or obligations, we will update these terms and revise the last updated date.</p>
        </Section>
        <Section title="Contact">
            <p>Questions about these terms can be sent to {contactEmail}.</p>
        </Section>
    </AppSurface>
);

const CookiePolicy = () => (
    <AppSurface className="space-y-8 p-6 sm:p-8">
        <Section title="What This Policy Covers">
            <p>This Cookie Policy explains how Makina Ime uses cookies, local storage, session storage, service workers, and similar browser technologies. These technologies help the app remember preferences, keep users signed in, support the PWA experience, and operate core features.</p>
        </Section>
        <Section title="Strictly Necessary Technologies">
            <p>Necessary browser storage may be used for authentication state, session handling, security checks, routing, app cache, offline/PWA behavior, and private access to your account or business workspace. The service cannot function properly without some of these technologies.</p>
        </Section>
        <Section title="Preference Storage">
            <p>Makina Ime may remember preferences such as theme, language, timezone, reminder settings, browser notification choices, and install prompts. These preferences improve usability and reduce repeated setup.</p>
        </Section>
        <Section title="Analytics And Marketing Cookies">
            <p>Makina Ime uses Google Analytics 4 to understand public site and app usage, such as page views and general interaction patterns. We do not use uploaded vehicle documents for advertising. If advertising, retargeting, or marketing cookies are added later, this policy should be updated before those tools are enabled, and consent controls should be added where required.</p>
        </Section>
        <Section title="Managing Cookies">
            <p>You can control cookies and site storage through your browser settings. Blocking necessary storage may prevent sign-in, document upload/download, PWA installation, reminders, or other app features from working correctly.</p>
        </Section>
        <Section title="Contact">
            <p>Questions about cookies or browser storage can be sent to {contactEmail}.</p>
        </Section>
    </AppSurface>
);
