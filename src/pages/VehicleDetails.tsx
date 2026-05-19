import { useEffect, useState } from 'react';
import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { ArrowLeft, Bell, Calendar, Car, DollarSign, FileText, Gauge, Pencil, Wrench, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
    vehicleType?: string;
    engineCapacity?: number;
    estimatedValue?: number;
    isLuxury?: boolean;
    technicalInspectionExpiry?: Timestamp | null;
    tplInsuranceExpiry?: Timestamp | null;
    roadTaxExpiry?: Timestamp | null;
    tintedGlassCertificateExpiry?: Timestamp | null;
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
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        make: '',
        model: '',
        year: '',
        plateNumber: '',
        vin: '',
        vehicleType: 'car',
        currentMileage: '',
        registrationExpiry: '',
        engineCapacity: '',
        estimatedValue: '',
        isLuxury: false,
        technicalInspectionExpiry: '',
        tplInsuranceExpiry: '',
        roadTaxExpiry: '',
        tintedGlassCertificateExpiry: '',
    });

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

    const formatDateInput = (timestamp?: Timestamp | null) => {
        if (!timestamp?.toDate) return '';
        return timestamp.toDate().toISOString().slice(0, 10);
    };

    const openEditModal = () => {
        if (!vehicle) return;
        setEditForm({
            make: vehicle.make || '',
            model: vehicle.model || '',
            year: String(vehicle.year || ''),
            plateNumber: vehicle.plateNumber || '',
            vin: vehicle.vin || '',
            vehicleType: vehicle.vehicleType || 'car',
            currentMileage: vehicle.currentMileage ? String(vehicle.currentMileage) : '',
            registrationExpiry: formatDateInput(vehicle.registrationExpiry),
            engineCapacity: vehicle.engineCapacity ? String(vehicle.engineCapacity) : '',
            estimatedValue: vehicle.estimatedValue ? String(vehicle.estimatedValue) : '',
            isLuxury: Boolean(vehicle.isLuxury),
            technicalInspectionExpiry: formatDateInput(vehicle.technicalInspectionExpiry),
            tplInsuranceExpiry: formatDateInput(vehicle.tplInsuranceExpiry),
            roadTaxExpiry: formatDateInput(vehicle.roadTaxExpiry),
            tintedGlassCertificateExpiry: formatDateInput(vehicle.tintedGlassCertificateExpiry),
        });
        setIsEditing(true);
    };

    const dateOrNull = (value: string) => value ? Timestamp.fromDate(new Date(value)) : null;

    const saveVehicleProfile = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!id) return;
        setSaving(true);

        try {
            await updateDoc(doc(db, 'vehicles', id), {
                make: editForm.make.trim(),
                model: editForm.model.trim(),
                year: parseInt(editForm.year),
                plateNumber: editForm.plateNumber.trim().toUpperCase(),
                vin: editForm.vin.trim().toUpperCase(),
                vehicleType: editForm.vehicleType,
                currentMileage: editForm.currentMileage ? parseInt(editForm.currentMileage) : 0,
                registrationExpiry: dateOrNull(editForm.registrationExpiry),
                engineCapacity: editForm.engineCapacity ? parseInt(editForm.engineCapacity) : null,
                estimatedValue: editForm.estimatedValue ? parseFloat(editForm.estimatedValue) : null,
                isLuxury: editForm.isLuxury,
                technicalInspectionExpiry: dateOrNull(editForm.technicalInspectionExpiry),
                tplInsuranceExpiry: dateOrNull(editForm.tplInsuranceExpiry),
                roadTaxExpiry: dateOrNull(editForm.roadTaxExpiry),
                tintedGlassCertificateExpiry: dateOrNull(editForm.tintedGlassCertificateExpiry),
            });
            setIsEditing(false);
        } finally {
            setSaving(false);
        }
    };

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
                            <Button type="button" variant="outline" size="sm" onClick={openEditModal}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit profile
                            </Button>
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
                                    ['Type', vehicle.vehicleType || 'N/A'],
                                    ['Engine capacity', vehicle.engineCapacity ? `${vehicle.engineCapacity} cc` : 'N/A'],
                                    ['Estimated value', vehicle.estimatedValue ? `€${vehicle.estimatedValue.toLocaleString()}` : 'N/A'],
                                    ['Luxury flag', vehicle.isLuxury ? 'Yes' : 'No'],
                                    ['Registration expiry', vehicle.registrationExpiry?.toDate().toLocaleDateString() || 'N/A'],
                                    ['TPL insurance expiry', vehicle.tplInsuranceExpiry?.toDate().toLocaleDateString() || 'N/A'],
                                    ['Technical inspection expiry', vehicle.technicalInspectionExpiry?.toDate().toLocaleDateString() || 'N/A'],
                                    ['Road tax expiry', vehicle.roadTaxExpiry?.toDate().toLocaleDateString() || 'N/A'],
                                    ['Tinted-glass certificate expiry', vehicle.tintedGlassCertificateExpiry?.toDate().toLocaleDateString() || 'N/A'],
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

                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                        <AppSurface className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6 shadow-2xl">
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="flex items-center gap-2 text-xl font-bold">
                                        <Pencil className="h-5 w-5 text-primary" />
                                        Edit vehicle profile
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">Update identity, legal dates, and care data.</p>
                                </div>
                                <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={saveVehicleProfile} className="space-y-5">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Input label="Make" value={editForm.make} onChange={(event) => setEditForm({ ...editForm, make: event.target.value })} required />
                                    <Input label="Model" value={editForm.model} onChange={(event) => setEditForm({ ...editForm, model: event.target.value })} required />
                                    <Input label="Year" type="number" value={editForm.year} onChange={(event) => setEditForm({ ...editForm, year: event.target.value })} required />
                                    <Input label="Plate number" value={editForm.plateNumber} onChange={(event) => setEditForm({ ...editForm, plateNumber: event.target.value })} />
                                    <Input label="VIN" value={editForm.vin} onChange={(event) => setEditForm({ ...editForm, vin: event.target.value })} />
                                    <div className="space-y-2">
                                        <label className="mi-label">Vehicle type</label>
                                        <select className="mi-field" value={editForm.vehicleType} onChange={(event) => setEditForm({ ...editForm, vehicleType: event.target.value })}>
                                            <option value="car">Car</option>
                                            <option value="suv">SUV</option>
                                            <option value="motorcycle">Motorcycle</option>
                                            <option value="truck">Truck</option>
                                            <option value="van">Van</option>
                                        </select>
                                    </div>
                                    <Input label="Current mileage" type="number" value={editForm.currentMileage} onChange={(event) => setEditForm({ ...editForm, currentMileage: event.target.value })} />
                                    <Input label="Engine capacity (cc)" type="number" value={editForm.engineCapacity} onChange={(event) => setEditForm({ ...editForm, engineCapacity: event.target.value })} />
                                    <Input label="Estimated value (€)" type="number" step="0.01" value={editForm.estimatedValue} onChange={(event) => setEditForm({ ...editForm, estimatedValue: event.target.value })} />
                                    <Input label="Registration expiry" type="date" value={editForm.registrationExpiry} onChange={(event) => setEditForm({ ...editForm, registrationExpiry: event.target.value })} />
                                    <Input label="TPL insurance expiry" type="date" value={editForm.tplInsuranceExpiry} onChange={(event) => setEditForm({ ...editForm, tplInsuranceExpiry: event.target.value })} />
                                    <Input label="Technical inspection expiry" type="date" value={editForm.technicalInspectionExpiry} onChange={(event) => setEditForm({ ...editForm, technicalInspectionExpiry: event.target.value })} />
                                    <Input label="Road tax expiry" type="date" value={editForm.roadTaxExpiry} onChange={(event) => setEditForm({ ...editForm, roadTaxExpiry: event.target.value })} />
                                    <Input label="Tinted-glass certificate expiry" type="date" value={editForm.tintedGlassCertificateExpiry} onChange={(event) => setEditForm({ ...editForm, tintedGlassCertificateExpiry: event.target.value })} />
                                </div>
                                <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-3 text-sm">
                                    <span>
                                        <span className="block font-semibold">Luxury vehicle flag</span>
                                        <span className="text-xs text-muted-foreground">Reserved for future tax and compliance logic.</span>
                                    </span>
                                    <input type="checkbox" checked={editForm.isLuxury} onChange={(event) => setEditForm({ ...editForm, isLuxury: event.target.checked })} className="h-5 w-5 accent-primary" />
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button type="submit" className="h-11 flex-1" isLoading={saving}>Save profile</Button>
                                    <Button type="button" variant="outline" className="h-11" onClick={() => setIsEditing(false)}>Cancel</Button>
                                </div>
                            </form>
                        </AppSurface>
                    </div>
                )}
            </div>
        </Layout>
    );
};
