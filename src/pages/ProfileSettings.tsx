import { useState } from 'react';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { Download, FileText, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Layout } from '../components/ui/Layout';
import { AppSurface, PageHeader, Panel } from '../components/ui/design-system';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';

const toPlainJson = (value: unknown): unknown => {
    const timestampLike = value as { toDate?: unknown };
    if (value && typeof value === 'object' && typeof timestampLike.toDate === 'function') {
        return timestampLike.toDate().toISOString();
    }

    if (Array.isArray(value)) {
        return value.map(toPlainJson);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, toPlainJson(item)])
        );
    }

    return value;
};

const downloadJson = (fileName: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(toPlainJson(data), null, 2)], {
        type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};

export const ProfileSettings = () => {
    const { user } = useAuth();
    const [isExporting, setIsExporting] = useState(false);
    const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const exportMyData = async () => {
        if (!user) return;
        setError('');
        setMessage('');
        setIsExporting(true);

        try {
            const vehiclesSnapshot = await getDocs(query(collection(db, 'vehicles'), where('userId', '==', user.uid)));
            const remindersSnapshot = await getDocs(query(collection(db, 'reminders'), where('userId', '==', user.uid)));
            const notificationsSnapshot = await getDocs(collection(db, 'users', user.uid, 'notifications'));

            const vehicles = await Promise.all(vehiclesSnapshot.docs.map(async (vehicleDoc) => {
                const vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
                const [services, expenses, documents] = await Promise.all([
                    getDocs(collection(db, 'vehicles', vehicleDoc.id, 'services')),
                    getDocs(collection(db, 'vehicles', vehicleDoc.id, 'expenses')),
                    getDocs(collection(db, 'vehicles', vehicleDoc.id, 'documents')),
                ]);

                return {
                    ...vehicle,
                    services: services.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
                    expenses: expenses.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
                    documents: documents.docs.map((doc) => ({ id: doc.id, ...doc.data(), privateFileExport: 'metadata-only' })),
                };
            }));

            downloadJson(`makina-ime-export-${new Date().toISOString().slice(0, 10)}.json`, {
                exportedAt: new Date().toISOString(),
                account: {
                    uid: user.uid,
                    email: user.email,
                },
                dataStores: {
                    identity: 'Firebase Authentication',
                    appRecords: 'Cloud Firestore',
                    privateFiles: 'Cloudflare R2',
                    reminderEmailDelivery: 'Brevo',
                    hostingAndFunctions: 'Netlify',
                },
                vehicles,
                reminders: remindersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
                notifications: notificationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
            });
            setMessage('Your export was prepared. Private file binaries are not included; document metadata is included.');
        } catch {
            setError('Could not export your data. Please try again or contact support.');
        } finally {
            setIsExporting(false);
        }
    };

    const requestAccountDeletion = async () => {
        if (!user) return;

        if (!confirm('Request account deletion? We will verify ownership before deleting account data and private files.')) {
            return;
        }

        setError('');
        setMessage('');
        setIsRequestingDeletion(true);

        try {
            await addDoc(collection(db, 'accountDeletionRequests'), {
                userId: user.uid,
                email: user.email || null,
                status: 'requested',
                createdAt: serverTimestamp(),
            });
            setMessage('Account deletion request submitted. We will verify ownership before deletion.');
        } catch {
            setError('Could not submit the deletion request. Contact infomakinaime@gmail.com from your account email.');
        } finally {
            setIsRequestingDeletion(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Profili"
                    title="Profile Settings"
                    description="Account privacy, data access, deletion requests, and storage transparency."
                />

                {(message || error) && (
                    <div className={`rounded-lg border p-4 text-sm ${error ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                        {error || message}
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <AppSurface className="p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                            <div>
                                <h2 className="font-semibold">Where your data is stored</h2>
                                <p className="text-sm text-muted-foreground">Current production data processors.</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            {[
                                ['Firebase Auth', 'Account identity and sign-in.'],
                                ['Cloud Firestore', 'Vehicle, service, expense, reminder, notification, and document metadata.'],
                                ['Cloudflare R2', 'Private document and image files.'],
                                ['Brevo', 'Transactional reminder email delivery metadata.'],
                                ['Netlify', 'Hosting and serverless function execution.'],
                            ].map(([name, detail]) => (
                                <Panel key={name} className="p-3">
                                    <p className="font-medium">{name}</p>
                                    <p className="text-muted-foreground">{detail}</p>
                                </Panel>
                            ))}
                        </div>
                    </AppSurface>

                    <AppSurface className="p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <FileText className="h-6 w-6 text-primary" />
                            <div>
                                <h2 className="font-semibold">Privacy documents</h2>
                                <p className="text-sm text-muted-foreground">Public policies and account rights.</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground">
                            <p>Privacy and terms are public before sign-up. Export and deletion controls are available here after sign-in.</p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <a href="/privacy" className="inline-flex h-10 items-center justify-center rounded-xl border border-input px-4 font-medium text-foreground hover:bg-accent">Privacy Policy</a>
                                <a href="/terms" className="inline-flex h-10 items-center justify-center rounded-xl border border-input px-4 font-medium text-foreground hover:bg-accent">Terms</a>
                            </div>
                        </div>
                    </AppSurface>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <AppSurface className="p-5">
                        <Download className="mb-4 h-6 w-6 text-primary" />
                        <h2 className="font-semibold">Export my data</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Download a JSON export of your vehicle records, services, expenses, reminders, notifications, and document metadata.
                        </p>
                        <Button className="mt-4 w-full sm:w-auto" onClick={exportMyData} isLoading={isExporting}>
                            Export data
                        </Button>
                    </AppSurface>

                    <AppSurface className="border-destructive/30 p-5">
                        <Trash2 className="mb-4 h-6 w-6 text-destructive" />
                        <h2 className="font-semibold">Delete account request</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Submit a deletion request for your account, app records, and private files. We verify ownership before deleting sensitive data.
                        </p>
                        <Button className="mt-4 w-full sm:w-auto" variant="destructive" onClick={requestAccountDeletion} isLoading={isRequestingDeletion}>
                            Request deletion
                        </Button>
                    </AppSurface>
                </div>
            </div>
        </Layout>
    );
};
