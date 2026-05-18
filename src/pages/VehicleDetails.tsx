import { useEffect, useState } from 'react';
import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { ArrowLeft, Bell, Calendar, Car, DollarSign, FileText, Gauge, Wrench } from 'lucide-react';
import { db } from '../lib/firebase';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { AppSurface, PageHeader, Panel, StatusPill } from '../components/ui/design-system';
import { ServiceLog } from '../components/ServiceLog';
import { ExpenseTracker } from '../components/ExpenseTracker';
import { DocumentManager } from '../components/DocumentManager';
import { ReminderManager } from '../components/ReminderManager';

interface VehicleDetailsData {
    id: string;
    make: string;
    model: string;
    year: number;
    plateNumber?: string;
    vin?: string;
    currentMileage?: number;
    registrationExpiry?: Timestamp | null;
}

type VehicleTab = 'overview' | 'services' | 'expenses' | 'documents' | 'reminders';

const tabs: { id: VehicleTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Car },
    { id: 'services', label: 'Services', icon: Wrench },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'reminders', label: 'Reminders', icon: Bell },
];

export const VehicleDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vehicle, setVehicle] = useState<VehicleDetailsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<VehicleTab>('overview');

    useEffect(() => {
        if (!id) return;
        const unsubscribe = onSnapshot(doc(db, 'vehicles', id), (snapshot) => {
            if (snapshot.exists()) {
                setVehicle({ id: snapshot.id, ...snapshot.data() } as VehicleDetailsData);
            } else {
                navigate('/app');
            }
            setLoading(false);
        });
        return unsubscribe;
    }, [id, navigate]);

    if (loading) {
        return (
            <Layout>
                <div className="flex h-[50vh] items-center justify-center">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!vehicle) return null;

    return (
        <Layout>
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate('/app')} className="pl-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to dashboard
                </Button>

                <PageHeader
                    eyebrow="Vehicle workspace"
                    title={`${vehicle.make} ${vehicle.model}`}
                    description="Documents, services, expenses, and reminders for this vehicle."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <StatusPill tone="blue">
                                <Calendar className="h-3.5 w-3.5" />
                                {vehicle.year}
                            </StatusPill>
                            <StatusPill tone="amber">
                                <Car className="h-3.5 w-3.5" />
                                {vehicle.plateNumber || 'No plate'}
                            </StatusPill>
                        </div>
                    }
                />

                <div className="sticky top-16 z-20 -mx-4 border-y border-border/80 bg-background/95 px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
                    <div className="flex gap-2 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                        : 'border border-border bg-card/60 text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                        <AppSurface className="p-6">
                            <h2 className="mb-5 text-lg font-bold">Vehicle information</h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {[
                                    ['Make', vehicle.make],
                                    ['Model', vehicle.model],
                                    ['Year', vehicle.year],
                                    ['Plate', vehicle.plateNumber || 'N/A'],
                                    ['VIN', vehicle.vin || 'N/A'],
                                    ['Registration expiry', vehicle.registrationExpiry?.toDate().toLocaleDateString() || 'N/A'],
                                ].map(([label, value]) => (
                                    <Panel key={label} className="p-4">
                                        <p className="mi-label">{label}</p>
                                        <p className="mt-2 break-words font-semibold">{value}</p>
                                    </Panel>
                                ))}
                            </div>
                        </AppSurface>

                        <AppSurface className="p-6">
                            <h2 className="mb-5 text-lg font-bold">Care status</h2>
                            <div className="space-y-3">
                                <Panel className="flex items-center justify-between gap-3 p-4">
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Gauge className="h-4 w-4 text-primary" />
                                        Mileage
                                    </span>
                                    <span className="font-mono font-bold">
                                        {vehicle.currentMileage ? `${vehicle.currentMileage.toLocaleString()} km` : 'N/A'}
                                    </span>
                                </Panel>
                                <Panel className="flex items-center justify-between gap-3 p-4">
                                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Bell className="h-4 w-4 text-amber-400" />
                                        Reminder status
                                    </span>
                                    <StatusPill tone="emerald">Active</StatusPill>
                                </Panel>
                            </div>
                        </AppSurface>
                    </div>
                )}

                {activeTab === 'services' && <ServiceLog vehicleId={id!} />}
                {activeTab === 'expenses' && <ExpenseTracker vehicleId={id!} />}
                {activeTab === 'documents' && <DocumentManager />}
                {activeTab === 'reminders' && <ReminderManager />}
            </div>
        </Layout>
    );
};
