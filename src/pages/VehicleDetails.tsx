import { useEffect, useState } from 'react';
import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { ArrowLeft, Bell, Calendar, Car, DollarSign, FileText, Pencil, Wrench, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { AppSurface, PageHeader, Panel, StatusPill } from '../components/ui/design-system';
import { ServiceLog } from '../components/ServiceLog';
import { ExpenseTracker } from '../components/ExpenseTracker';
import { DocumentManager } from '../components/DocumentManager';
import { ReminderManager } from '../components/ReminderManager';
import { MaintenanceInsights } from '../components/MaintenanceInsights';
import type { Vehicle } from '../lib/types';
import { type FieldErrors, type VehicleField, validateVehicleDraft, vehicleRecordErrors } from '../lib/validation';

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
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<VehicleTab>('overview');
    const [quickAddToken, setQuickAddToken] = useState(0);
    const [message, setMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editErrors, setEditErrors] = useState<FieldErrors<VehicleField>>({});
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
                setVehicle({ id: snapshot.id, ...snapshot.data() } as Vehicle);
            } else {
                navigate('/app');
            }
            setLoading(false);
        });
        return unsubscribe;
    }, [id, navigate]);

    useEffect(() => {
        const handleQuickAdd = () => {
            if (activeTab === 'overview') setActiveTab('expenses');
            setQuickAddToken((current) => current + 1);
        };

        window.addEventListener('makina-ime:quick-add', handleQuickAdd);
        return () => window.removeEventListener('makina-ime:quick-add', handleQuickAdd);
    }, [activeTab]);

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
        setEditErrors(vehicleRecordErrors(vehicle));
        setIsEditing(true);
    };

    const dateOrNull = (value: string) => value ? Timestamp.fromDate(new Date(value)) : null;

    const saveVehicleProfile = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!id) return;
        const validation = validateVehicleDraft(editForm);
        setEditErrors(validation.errors);
        if (!validation.value) {
            window.requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
            return;
        }
        const values = validation.value;
        setSaving(true);

        try {
            await updateDoc(doc(db, 'vehicles', id), {
                make: values.make,
                model: values.model,
                year: values.year,
                plateNumber: values.plateNumber,
                vin: values.vin,
                vehicleType: editForm.vehicleType,
                currentMileage: values.currentMileage,
                registrationExpiry: dateOrNull(editForm.registrationExpiry),
                engineCapacity: values.engineCapacity,
                estimatedValue: values.estimatedValue,
                isLuxury: editForm.isLuxury,
                technicalInspectionExpiry: dateOrNull(editForm.technicalInspectionExpiry),
                tplInsuranceExpiry: dateOrNull(editForm.tplInsuranceExpiry),
                roadTaxExpiry: dateOrNull(editForm.roadTaxExpiry),
                tintedGlassCertificateExpiry: dateOrNull(editForm.tintedGlassCertificateExpiry),
            });
            setIsEditing(false);
            setEditErrors({});
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
    const legacyErrors = vehicleRecordErrors(vehicle);
    const needsCorrection = Object.keys(legacyErrors).length > 0;

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

                {message && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{message}</div>}
                {needsCorrection && (
                    <button type="button" onClick={openEditModal} className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm text-amber-200">
                        <strong className="block">This vehicle profile needs correction.</strong>
                        <span className="mt-1 block text-amber-100/80">Review the highlighted fields before making further updates.</span>
                    </button>
                )}

                <div className="sticky top-16 z-20 -mx-4 border-y border-border/80 bg-background px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
                    <div className="flex gap-2 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
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
                    <div className="space-y-5">
                        <MaintenanceInsights vehicle={vehicle} onMessage={setMessage} />
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
                    </div>
                )}

                {activeTab === 'services' && <ServiceLog vehicleId={id!} quickAddToken={quickAddToken} vehicleCurrentMileage={vehicle.currentMileage || 0} />}
                {activeTab === 'expenses' && <ExpenseTracker vehicleId={id!} quickAddToken={quickAddToken} />}
                {activeTab === 'documents' && <DocumentManager quickAddToken={quickAddToken} />}
                {activeTab === 'reminders' && <ReminderManager quickAddToken={quickAddToken} />}

                {isEditing && (
                    <Modal onClose={() => setIsEditing(false)} titleId="edit-vehicle-title" className="max-w-2xl">
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <h2 id="edit-vehicle-title" className="flex items-center gap-2 text-xl font-bold">
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
                                    <Input label="Make" value={editForm.make} maxLength={80} error={editErrors.make} onChange={(event) => setEditForm({ ...editForm, make: event.target.value })} required />
                                    <Input label="Model" value={editForm.model} maxLength={80} error={editErrors.model} onChange={(event) => setEditForm({ ...editForm, model: event.target.value })} required />
                                    <Input label="Year" type="text" inputMode="numeric" maxLength={4} value={editForm.year} error={editErrors.year} onChange={(event) => setEditForm({ ...editForm, year: event.target.value })} required />
                                    <Input label="Plate number" maxLength={15} autoCapitalize="characters" spellCheck={false} value={editForm.plateNumber} error={editErrors.plateNumber} onChange={(event) => setEditForm({ ...editForm, plateNumber: event.target.value })} />
                                    <Input label="VIN" maxLength={17} autoCapitalize="characters" spellCheck={false} value={editForm.vin} error={editErrors.vin} onChange={(event) => setEditForm({ ...editForm, vin: event.target.value })} />
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
                                    <Input label="Current mileage" type="text" inputMode="numeric" maxLength={7} value={editForm.currentMileage} error={editErrors.currentMileage} onChange={(event) => setEditForm({ ...editForm, currentMileage: event.target.value })} />
                                    <Input label="Engine capacity (cc)" type="text" inputMode="numeric" maxLength={6} value={editForm.engineCapacity} error={editErrors.engineCapacity} onChange={(event) => setEditForm({ ...editForm, engineCapacity: event.target.value })} />
                                    <Input label="Estimated value (€)" type="text" inputMode="decimal" maxLength={13} value={editForm.estimatedValue} error={editErrors.estimatedValue} onChange={(event) => setEditForm({ ...editForm, estimatedValue: event.target.value })} />
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
                    </Modal>
                )}
            </div>
        </Layout>
    );
};
