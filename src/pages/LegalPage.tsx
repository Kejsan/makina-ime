import type React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import logo from '../assets/Makina Ime Logo.png';

const updatedAt = '18 May 2026';
const contactEmail = 'infomakinaime@gmail.com';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
);

export const LegalPage = ({ type }: { type: 'privacy' | 'terms' }) => {
    const isPrivacy = type === 'privacy';

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-background/90">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
                    <Link to="/" className="flex items-center gap-3">
                        <img src={logo} alt="Makina Ime" className="h-9 w-auto" />
                    </Link>
                    <Link to="/auth" className="text-sm font-medium text-primary hover:underline">
                        Sign in
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-10">
                <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Back to home
                </Link>

                <div className="mb-10 space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        {isPrivacy ? 'Privacy and data protection' : 'Service terms'}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
                    </h1>
                    <p className="text-sm text-muted-foreground">Last updated: {updatedAt}</p>
                </div>

                {isPrivacy ? (
                    <div className="space-y-8">
                        <Section title="What Makina Ime Collects">
                            <p>Makina Ime collects account identity data, vehicle profile data, service records, expenses, reminders, document metadata, and the private files you choose to upload. Examples include email address, vehicle plate or VIN, mileage, expiry dates, maintenance notes, costs, and uploaded images or PDFs.</p>
                        </Section>
                        <Section title="Where Data Is Stored">
                            <p>Firebase Authentication stores account identity data. Cloud Firestore stores app records and metadata for vehicles, services, expenses, reminders, notifications, and documents. Cloudflare R2 stores private uploaded files such as documents and images. Brevo processes reminder email delivery metadata. Netlify hosts the web app and serverless functions.</p>
                        </Section>
                        <Section title="How Data Is Used">
                            <p>We use your data to provide vehicle documentation, servicing, expense tracking, reminders, account access, security controls, browser notifications, and transactional email reminders. We do not use your private vehicle files for advertising.</p>
                        </Section>
                        <Section title="Security Controls">
                            <p>Access requires Firebase authentication. Files in R2 remain private and are accessed through short-lived signed URLs. Server functions verify identity and vehicle ownership before creating upload links, download links, or deleting protected document files.</p>
                        </Section>
                        <Section title="Retention, Export, And Deletion">
                            <p>You can export account records from Profile Settings. You can request account deletion from Profile Settings or by contacting {contactEmail}. Deletion requests include account identity review and removal of vehicle records, related app records, and private files where technically possible and legally allowed.</p>
                        </Section>
                        <Section title="Your Rights">
                            <p>For an Albania/EU GDPR-style launch, you may request access, correction, export, restriction, objection, or deletion of personal data. Send requests to {contactEmail}. We may need to verify account ownership before fulfilling a request.</p>
                        </Section>
                        <Section title="Contact">
                            <p>For privacy questions or data rights requests, contact {contactEmail}.</p>
                        </Section>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <Section title="Use Of The Service">
                            <p>Makina Ime helps users organize vehicle documents, servicing, care tasks, expenses, and reminders. You are responsible for the accuracy of the information you enter and for keeping legally required vehicle documents valid.</p>
                        </Section>
                        <Section title="No Legal, Insurance, Or Mechanical Advice">
                            <p>The app is an organizational tool. Reminders, summaries, and records do not replace legal, insurance, tax, roadworthiness, or professional mechanic advice.</p>
                        </Section>
                        <Section title="Account Security">
                            <p>You must keep your login credentials secure and notify us if you believe your account has been accessed without authorization. We may suspend access where needed to protect users or the platform.</p>
                        </Section>
                        <Section title="Files And Records">
                            <p>You should only upload files you have the right to store. Do not upload unlawful, malicious, or unrelated content. We may remove content or disable access if needed for security, abuse prevention, or legal compliance.</p>
                        </Section>
                        <Section title="Availability And Liability">
                            <p>We aim to keep the platform reliable, but we do not guarantee uninterrupted service. To the extent allowed by law, Makina Ime is not liable for missed renewals, expired documents, incorrect records, or third-party service outages.</p>
                        </Section>
                        <Section title="Contact">
                            <p>Questions about these terms can be sent to {contactEmail}.</p>
                        </Section>
                    </div>
                )}
            </main>
        </div>
    );
};
