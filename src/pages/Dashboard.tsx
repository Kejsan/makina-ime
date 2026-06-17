import React, { useEffect, useMemo, useState } from 'react';
import {
    Bell,
    Building2,
    Calendar,
    Car as CarIcon,
    CreditCard,
    DollarSign,
    FileText,
    Filter,
    Pencil,
    Plus,
    ShieldAlert,
    Trash2,
    Wrench,
    X,
} from 'lucide-react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Layout } from '../components/ui/Layout';
import { AppSurface, EmptyState, MetricCard, PageHeader, Panel, StatusPill } from '../components/ui/design-system';
import type { ExpenseRecord, Reminder } from '../lib/types';
import { callR2DocumentFunction } from '../lib/r2Documents';
import { expenseAmount, moneyValue, sumExpenses } from '../lib/expenses';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    ownerType?: 'personal' | 'organization';
    plateNumber?: string;
    vin?: string;
    vehicleType?: string;
    currentMileage?: number;
    registrationExpiry?: Timestamp | null;
    engineCapacity?: number;
    estimatedValue?: number;
    isLuxury?: boolean;
    technicalInspectionExpiry?: Timestamp | null;
    tplInsuranceExpiry?: Timestamp | null;
    roadTaxExpiry?: Timestamp | null;
    tintedGlassCertificateExpiry?: Timestamp | null;
}

const formatCurrency = (value: number) => `€${value.toFixed(2)}`;

const dateFromTimestamp = (value?: Timestamp | null) => value?.toDate?.() || null;

const daysUntil = (date: Date) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const canEditExpense = (expense: ExpenseRecord) => !expense.sourceType || expense.sourceType === 'manual' || expense.sourceType === 'service';

const formatDateInput = (timestamp?: Timestamp) => {
    const value = timestamp?.toDate?.();
    return value ? value.toISOString().slice(0, 10) : '';
};

const expenseCategories = ['Fuel', 'Insurance', 'Tax', 'Parking', 'Tolls', 'Cleaning', 'Maintenance', 'Document', 'Other'];

export const Dashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [expensesByVehicle, setExpensesByVehicle] = useState<Record<string, ExpenseRecord[]>>({});
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('all');
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [expenseLoadError, setExpenseLoadError] = useState('');
    const [expenseSaveError, setExpenseSaveError] = useState('');
    const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
    const [isExpenseCreateOpen, setIsExpenseCreateOpen] = useState(false);

    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [vin, setVin] = useState('');
    const [vehicleType, setVehicleType] = useState('car');
    const [currentMileage, setCurrentMileage] = useState('');
    const [expiry, setExpiry] = useState('');
    const [engineCapacity, setEngineCapacity] = useState('');
    const [estimatedValue, setEstimatedValue] = useState('');
    const [isLuxury, setIsLuxury] = useState(false);
    const [technicalInspectionExpiry, setTechnicalInspectionExpiry] = useState('');
    const [tplInsuranceExpiry, setTplInsuranceExpiry] = useState('');
    const [roadTaxExpiry, setRoadTaxExpiry] = useState('');
    const [tintedGlassCertificateExpiry, setTintedGlassCertificateExpiry] = useState('');
    const [expenseForm, setExpenseForm] = useState({
        vehicleId: '',
        category: 'Fuel',
        amount: '',
        date: '',
        notes: '',
    });

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'vehicles'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setVehicles(snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() } as Vehicle))
                .filter((vehicle) => vehicle.ownerType !== 'organization'));
            setLoading(false);
            setDeleteError('');
        }, (error) => {
            console.error('Vehicle listener failed', error);
            setDeleteError('Vehicles could not be loaded. Please check your account permissions and try again.');
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    useEffect(() => {
        if (!user || vehicles.length === 0) {
            return;
        }

        const unsubscribes = vehicles.map((vehicle) => {
            const q = query(collection(db, 'vehicles', vehicle.id, 'expenses'), orderBy('date', 'desc'));
            return onSnapshot(q, (snapshot) => {
                setExpensesByVehicle((previous) => ({
                    ...previous,
                    [vehicle.id]: snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, vehicleId: vehicle.id, ...snapshotDoc.data() } as ExpenseRecord)),
                }));
                setExpenseLoadError('');
            }, (error) => {
                console.error('Expense listener failed', error);
                setExpenseLoadError('Expenses could not be loaded. Please check your account permissions and try again.');
            });
        });

        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [user, vehicles]);

    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'reminders'), where('userId', '==', user.uid), where('completed', '==', false));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setReminders(snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() } as Reminder))
                .filter((reminder) => reminder.ownerType !== 'organization'));
        }, (error) => {
            console.error('Reminder listener failed', error);
        });

        return unsubscribe;
    }, [user]);

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await addDoc(collection(db, 'vehicles'), {
                userId: user.uid,
                ownerType: 'personal',
                ownerId: user.uid,
                make: make.trim(),
                model: model.trim(),
                year: parseInt(year),
                plateNumber: plateNumber.trim().toUpperCase(),
                vin: vin.trim().toUpperCase(),
                vehicleType,
                currentMileage: currentMileage ? parseInt(currentMileage) : 0,
                registrationExpiry: expiry ? Timestamp.fromDate(new Date(expiry)) : null,
                engineCapacity: engineCapacity ? parseInt(engineCapacity) : null,
                estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
                isLuxury,
                technicalInspectionExpiry: technicalInspectionExpiry ? Timestamp.fromDate(new Date(technicalInspectionExpiry)) : null,
                tplInsuranceExpiry: tplInsuranceExpiry ? Timestamp.fromDate(new Date(tplInsuranceExpiry)) : null,
                roadTaxExpiry: roadTaxExpiry ? Timestamp.fromDate(new Date(roadTaxExpiry)) : null,
                tintedGlassCertificateExpiry: tintedGlassCertificateExpiry ? Timestamp.fromDate(new Date(tintedGlassCertificateExpiry)) : null,
                createdAt: Timestamp.now(),
            });

            setIsVehicleModalOpen(false);
            setMake('');
            setModel('');
            setYear('');
            setPlateNumber('');
            setVin('');
            setVehicleType('car');
            setCurrentMileage('');
            setExpiry('');
            setEngineCapacity('');
            setEstimatedValue('');
            setIsLuxury(false);
            setTechnicalInspectionExpiry('');
            setTplInsuranceExpiry('');
            setRoadTaxExpiry('');
            setTintedGlassCertificateExpiry('');
        } catch {
            console.error('Vehicle creation failed');
        }
    };

    const handleDelete = async (vehicleId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;

        if (confirm('Delete this vehicle and all linked services, expenses, documents, reminders, and private files?')) {
            try {
                setDeleteError('');
                await callR2DocumentFunction(user, 'deleteVehicleCascade', { vehicleId });
                if (selectedVehicleFilter === vehicleId) setSelectedVehicleFilter('all');
            } catch {
                setDeleteError('Vehicle deletion failed. Please try again.');
            }
        }
    };

    const openExpenseEditor = (expense: ExpenseRecord) => {
        if (!canEditExpense(expense)) {
            setExpenseSaveError('Document-linked expenses must be edited from the related document.');
            return;
        }

        setEditingExpense(expense);
        setExpenseForm({
            vehicleId: expense.vehicleId,
            category: expense.category || 'Fuel',
            amount: String(expenseAmount(expense) || ''),
            date: formatDateInput(expense.date),
            notes: expense.notes || '',
        });
        setExpenseSaveError('');
    };

    const openExpenseCreator = () => {
        const defaultVehicleId = selectedVehicleFilter !== 'all' ? selectedVehicleFilter : vehicles[0]?.id || '';
        if (!defaultVehicleId) {
            setIsVehicleModalOpen(true);
            return;
        }

        setEditingExpense(null);
        setExpenseForm({
            vehicleId: defaultVehicleId,
            category: 'Fuel',
            amount: '',
            date: new Date().toISOString().slice(0, 10),
            notes: '',
        });
        setExpenseSaveError('');
        setIsExpenseCreateOpen(true);
    };

    const closeExpenseEditor = () => {
        setEditingExpense(null);
        setIsExpenseCreateOpen(false);
        setExpenseSaveError('');
        setExpenseForm({
            vehicleId: '',
            category: 'Fuel',
            amount: '',
            date: '',
            notes: '',
        });
    };

    useEffect(() => {
        const handleQuickAdd = () => {
            const defaultVehicleId = selectedVehicleFilter !== 'all' ? selectedVehicleFilter : vehicles[0]?.id || '';
            if (!defaultVehicleId) {
                setIsVehicleModalOpen(true);
                return;
            }

            setEditingExpense(null);
            setExpenseForm({
                vehicleId: defaultVehicleId,
                category: 'Fuel',
                amount: '',
                date: new Date().toISOString().slice(0, 10),
                notes: '',
            });
            setExpenseSaveError('');
            setIsExpenseCreateOpen(true);
        };

        window.addEventListener('makina-ime:quick-add', handleQuickAdd);
        return () => window.removeEventListener('makina-ime:quick-add', handleQuickAdd);
    }, [selectedVehicleFilter, vehicles]);

    const handleCreateExpense = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !expenseForm.vehicleId) return;

        try {
            setExpenseSaveError('');
            await addDoc(collection(db, 'vehicles', expenseForm.vehicleId, 'expenses'), {
                userId: user.uid,
                vehicleId: expenseForm.vehicleId,
                category: expenseForm.category,
                amount: moneyValue(expenseForm.amount),
                date: Timestamp.fromDate(new Date(expenseForm.date)),
                notes: expenseForm.notes.trim(),
                sourceType: 'manual',
                createdAt: Timestamp.now(),
            });
            closeExpenseEditor();
        } catch {
            setExpenseSaveError('Expense creation failed. Please try again.');
        }
    };

    const handleUpdateExpense = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingExpense || !canEditExpense(editingExpense)) return;

        try {
            setExpenseSaveError('');
            const parsedAmount = moneyValue(expenseForm.amount);
            const nextDate = Timestamp.fromDate(new Date(expenseForm.date));
            const payload = {
                category: expenseForm.category,
                amount: parsedAmount,
                date: nextDate,
                notes: expenseForm.notes.trim(),
                updatedAt: Timestamp.now(),
            };

            if (editingExpense.sourceType === 'service' && editingExpense.sourceId) {
                const batch = writeBatch(db);
                batch.update(doc(db, 'vehicles', editingExpense.vehicleId, 'expenses', editingExpense.id), {
                    ...payload,
                    sourceLabel: expenseForm.notes.trim().replace(/^Service:\s*/i, '') || editingExpense.sourceLabel || 'Service',
                });
                batch.update(doc(db, 'vehicles', editingExpense.vehicleId, 'services', editingExpense.sourceId), {
                    cost: parsedAmount,
                    date: nextDate,
                    updatedAt: Timestamp.now(),
                });
                await batch.commit();
            } else {
                await updateDoc(doc(db, 'vehicles', editingExpense.vehicleId, 'expenses', editingExpense.id), payload);
            }
            closeExpenseEditor();
        } catch {
            setExpenseSaveError('Expense update failed. Please try again.');
        }
    };

    const allExpenses = useMemo(() => vehicles.flatMap((vehicle) => expensesByVehicle[vehicle.id] || []), [vehicles, expensesByVehicle]);
    const filteredExpenses = selectedVehicleFilter === 'all'
        ? allExpenses
        : allExpenses.filter((expense) => expense.vehicleId === selectedVehicleFilter);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlySpend = allExpenses
        .filter((expense) => expense.date?.toDate && expense.date.toDate() >= monthStart)
        .reduce((total, expense) => total + expenseAmount(expense), 0);
    const totalSpend = sumExpenses(allExpenses);
    const linkedSpend = allExpenses
        .filter((expense) => expense.sourceType && expense.sourceType !== 'manual')
        .reduce((total, expense) => total + expenseAmount(expense), 0);

    const upcomingDeadlines = useMemo(() => {
        const legalDeadlines = vehicles.flatMap((vehicle) => {
            const entries = [
                ['registration', 'Registration', vehicle.registrationExpiry, ShieldAlert],
                ['tpl', 'TPL insurance', vehicle.tplInsuranceExpiry, ShieldAlert],
                ['inspection', 'Technical inspection', vehicle.technicalInspectionExpiry, Wrench],
                ['tax', 'Road tax', vehicle.roadTaxExpiry, FileText],
                ['tinted-glass', 'Tinted glass certificate', vehicle.tintedGlassCertificateExpiry, FileText],
            ] as const;

            return entries.flatMap(([key, label, timestamp, icon]) => {
                const expiryDate = dateFromTimestamp(timestamp);
                if (!expiryDate) return [];
                return [{
                    id: `${vehicle.id}-${key}`,
                    vehicleId: vehicle.id,
                    vehicleName: `${vehicle.make} ${vehicle.model}`,
                    type: label,
                    date: expiryDate,
                    daysRemaining: daysUntil(expiryDate),
                    icon,
                }];
            });
        });

        const reminderDeadlines = reminders
            .filter((reminder) => reminder.dueDate?.toDate)
            .map((reminder) => ({
                id: reminder.id,
                vehicleId: reminder.vehicleId,
                vehicleName: vehicles.find((vehicle) => vehicle.id === reminder.vehicleId)
                    ? `${vehicles.find((vehicle) => vehicle.id === reminder.vehicleId)?.make} ${vehicles.find((vehicle) => vehicle.id === reminder.vehicleId)?.model}`
                    : 'Vehicle',
                type: reminder.title,
                date: reminder.dueDate.toDate(),
                daysRemaining: daysUntil(reminder.dueDate.toDate()),
                icon: reminder.type === 'maintenance' ? Wrench : reminder.type === 'tax' ? FileText : Calendar,
            }));

        return [...legalDeadlines, ...reminderDeadlines]
            .sort((a, b) => a.daysRemaining - b.daysRemaining)
            .slice(0, 8);
    }, [reminders, vehicles]);

    const dueSoonCount = upcomingDeadlines.filter((deadline) => deadline.daysRemaining >= 0 && deadline.daysRemaining <= 30).length;

    const getVehicleName = (vehicleId: string) => {
        const vehicle = vehicles.find((item) => item.id === vehicleId);
        return vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown vehicle';
    };

    return (
        <Layout>
            <div className="space-y-7">
                <PageHeader
                    eyebrow="Paneli"
                    title="Garage Command Center"
                    description="Monitor vehicles, paperwork deadlines, servicing activity, and all costs from one mobile-first dashboard."
                    actions={
                        <>
                            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={openExpenseCreator}>
                                <DollarSign className="mr-2 h-4 w-4 text-emerald-400" />
                                Log shpenzim
                            </Button>
                            <Button onClick={() => setIsVehicleModalOpen(true)} className="h-11 rounded-xl font-bold">
                                <Plus className="mr-2 h-4 w-4 stroke-[3]" />
                                Shto mjet
                            </Button>
                        </>
                    }
                />

                {deleteError && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                        {deleteError}
                    </div>
                )}

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard icon={CarIcon} label="Mjetet" value={vehicles.length.toString()} detail="Registered profiles" tone="blue" />
                    <MetricCard icon={DollarSign} label="Kete muaj" value={formatCurrency(monthlySpend)} detail="All logged costs" tone="emerald" />
                    <MetricCard icon={CreditCard} label="Total Expenses" value={formatCurrency(totalSpend)} detail={`${formatCurrency(linkedSpend)} from linked records`} tone="indigo" />
                    <MetricCard icon={Bell} label="Afatet" value={dueSoonCount.toString()} detail="Deadlines in 30 days" tone={dueSoonCount > 0 ? 'amber' : 'blue'} />
                </section>

                <Link to="/business" className="block">
                    <AppSurface className="flex flex-col gap-4 p-4 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-bold">{t('Business workspace')}</h2>
                                <p className="mt-1 text-sm text-muted-foreground">{t('Manage shared fleets, inspections, issues, work orders, and business costs.')}</p>
                            </div>
                        </div>
                        <span className="text-sm font-bold text-primary">{t('Open business')}</span>
                    </AppSurface>
                </Link>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <section id="garage-section" className="space-y-4 lg:col-span-2">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">Garazhi im</h2>
                                <p className="text-xs text-muted-foreground">Tap a vehicle to open documents, services, expenses, and reminders.</p>
                            </div>
                            {selectedVehicleFilter !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedVehicleFilter('all')}
                                    className="inline-flex items-center gap-1 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-bold text-primary"
                                >
                                    Clear filter
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-12">
                                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            </div>
                        ) : vehicles.length === 0 ? (
                            <EmptyState
                                icon={CarIcon}
                                title="Garazhi eshte bosh"
                                description="Add your first vehicle to start tracking documents, care history, service costs, and reminders."
                                action={<Button onClick={() => setIsVehicleModalOpen(true)}>Shto mjet</Button>}
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {vehicles.map((vehicle) => {
                                    const isSelected = selectedVehicleFilter === vehicle.id;
                                    const vehicleExpenses = expensesByVehicle[vehicle.id] || [];
                                    const vehicleSpend = sumExpenses(vehicleExpenses);
                                    const expiryDate = dateFromTimestamp(vehicle.registrationExpiry);
                                    const expiryDays = expiryDate ? daysUntil(expiryDate) : null;
                                    const statusTone = expiryDays !== null && expiryDays <= 30 ? 'amber' : 'emerald';

                                    return (
                                        <AppSurface
                                            key={vehicle.id}
                                            className={`cursor-pointer p-5 transition-all hover:-translate-y-0.5 ${isSelected ? 'border-primary ring-2 ring-primary/20' : ''}`}
                                            onClick={() => navigate(`/vehicle/${vehicle.id}`)}
                                        >
                                            <div className="mb-4 flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="rounded-xl bg-primary/10 p-3 text-primary">
                                                        <CarIcon className="h-6 w-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="truncate text-lg font-bold">{vehicle.make} {vehicle.model}</h3>
                                                        <p className="mt-1 font-mono text-xs text-muted-foreground">{vehicle.plateNumber || 'No plate'}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(event) => handleDelete(vehicle.id, event)}
                                                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                                                    title="Delete vehicle"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-4 text-sm">
                                                <div>
                                                    <p className="mi-label">Viti</p>
                                                    <p className="mt-1 font-semibold">{vehicle.year}</p>
                                                </div>
                                                <div>
                                                    <p className="mi-label">Statusi</p>
                                                    <div className="mt-1">
                                                        <StatusPill tone={statusTone}>{statusTone === 'amber' ? 'Action required' : 'Healthy'}</StatusPill>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
                                                <Panel className="flex items-center justify-between gap-3 p-3 text-xs">
                                                    <span className="flex items-center gap-2 text-muted-foreground">
                                                        <ShieldAlert className="h-4 w-4 text-blue-400" />
                                                        Registration / insurance
                                                    </span>
                                                    <span className="font-mono font-semibold">{expiryDate ? expiryDate.toLocaleDateString() : 'N/A'}</span>
                                                </Panel>
                                                <Panel className="flex items-center justify-between gap-3 p-3 text-xs">
                                                    <span className="flex items-center gap-2 text-muted-foreground">
                                                        <CreditCard className="h-4 w-4 text-emerald-400" />
                                                        Total tracked
                                                    </span>
                                                    <span className="font-mono font-semibold text-emerald-400">{formatCurrency(vehicleSpend)}</span>
                                                </Panel>
                                            </div>
                                        </AppSurface>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section id="deadlines-section" className="space-y-4">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Afatet e ardhshme</h2>
                            <p className="text-xs text-muted-foreground">Dynamic action timeline</p>
                        </div>

                        <AppSurface className="p-5">
                            {upcomingDeadlines.length === 0 ? (
                                <div className="py-8 text-center">
                                    <Calendar className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
                                    <p className="font-semibold">No active deadlines</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Your garage is operational.</p>
                                </div>
                            ) : (
                                <div className="space-y-5 border-l border-border pl-4">
                                    {upcomingDeadlines.map((deadline) => {
                                        const Icon = deadline.icon;
                                        const tone = deadline.daysRemaining < 0 || deadline.daysRemaining <= 15 ? 'rose' : deadline.daysRemaining <= 45 ? 'amber' : 'emerald';
                                        const label = deadline.daysRemaining < 0 ? 'Expired' : `In ${deadline.daysRemaining} days`;

                                        return (
                                            <div key={deadline.id} className="relative">
                                                <span className={`absolute -left-[23px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${tone === 'rose' ? 'bg-rose-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="mi-label">{deadline.vehicleName}</p>
                                                        <h3 className="mt-1 flex items-center gap-2 text-sm font-bold">
                                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                                            <span className="truncate">{deadline.type}</span>
                                                        </h3>
                                                        <p className="mt-2 font-mono text-xs text-muted-foreground">{deadline.date.toLocaleDateString()}</p>
                                                    </div>
                                                    <StatusPill tone={tone}>{label}</StatusPill>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </AppSurface>
                    </section>
                </div>

                <section className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Regjistri i shpenzimeve</h2>
                            <p className="text-xs text-muted-foreground">Review service fees, document costs, fuel, and independent expenses.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <select
                                value={selectedVehicleFilter}
                                onChange={(event) => setSelectedVehicleFilter(event.target.value)}
                                className="mi-field h-10 min-w-52"
                            >
                                <option value="all">All vehicles</option>
                                {vehicles.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {expenseLoadError && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                            {expenseLoadError}
                        </div>
                    )}

                    <AppSurface className="overflow-hidden p-0">
                        {filteredExpenses.length === 0 ? (
                            <EmptyState icon={DollarSign} title="No costs recorded" description="Costs from service records, documents, and manual expenses will appear here." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                                        <tr>
                                            <th className="px-5 py-4 font-semibold">Vehicle</th>
                                            <th className="px-5 py-4 font-semibold">Category</th>
                                            <th className="px-5 py-4 font-semibold">Notes</th>
                                            <th className="px-5 py-4 font-semibold">Date</th>
                                            <th className="px-5 py-4 text-right font-semibold">Amount</th>
                                            <th className="px-5 py-4 text-right font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {filteredExpenses.slice(0, 12).map((expense) => (
                                            <tr key={expense.id} className="transition-colors hover:bg-accent/35">
                                                <td className="px-5 py-4 font-semibold">{getVehicleName(expense.vehicleId)}</td>
                                                <td className="px-5 py-4"><StatusPill tone={expense.sourceType === 'document' ? 'blue' : expense.sourceType === 'service' ? 'amber' : 'emerald'}>{expense.category}</StatusPill></td>
                                                <td className="max-w-xs truncate px-5 py-4 text-muted-foreground">{expense.notes || expense.sourceLabel || '-'}</td>
                                                <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{expense.date?.toDate?.().toLocaleDateString() || '-'}</td>
                                                <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400">{formatCurrency(expenseAmount(expense))}</td>
                                                <td className="px-5 py-4 text-right">
                                                    {canEditExpense(expense) ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openExpenseEditor(expense)}
                                                            className="inline-flex rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                            title="Edit Expense"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Linked</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </AppSurface>
                </section>
            </div>

            {isVehicleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <AppSurface className="app-dialog-panel w-full max-w-xl p-6 shadow-2xl">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="flex items-center gap-2 text-xl font-bold">
                                    <CarIcon className="h-5 w-5 text-primary" />
                                    Shto automjet te ri
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">Create the vehicle profile and first expiry reminder anchor.</p>
                            </div>
                            <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddVehicle} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Input label="Marka" placeholder="Volkswagen" value={make} onChange={(e) => setMake(e.target.value)} required />
                                <Input label="Modeli" placeholder="Polo" value={model} onChange={(e) => setModel(e.target.value)} required />
                                <Input label="Viti" type="number" placeholder="2020" value={year} onChange={(e) => setYear(e.target.value)} required />
                                <Input label="Targa" placeholder="AA 000 XX" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="mi-label">Vehicle type</label>
                                    <select className="mi-field" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                                        <option value="car">Car</option>
                                        <option value="suv">SUV</option>
                                        <option value="motorcycle">Motorcycle</option>
                                        <option value="truck">Truck</option>
                                        <option value="van">Van</option>
                                    </select>
                                </div>
                                <Input label="Kilometrazhi" type="number" placeholder="120000" value={currentMileage} onChange={(e) => setCurrentMileage(e.target.value)} />
                                <Input label="VIN" placeholder="Vehicle identification number" value={vin} onChange={(e) => setVin(e.target.value)} />
                                <Input label="Registration / insurance expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                            </div>

                            <Panel className="space-y-4 p-4">
                                <div>
                                    <p className="mi-label text-primary">Legal and valuation details</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Optional fields used for reminders, compliance, and ownership records.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Input label="Engine capacity (cc)" type="number" placeholder="1598" value={engineCapacity} onChange={(e) => setEngineCapacity(e.target.value)} />
                                    <Input label="Estimated value (€)" type="number" step="0.01" placeholder="6500" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
                                    <Input label="Technical inspection expiry" type="date" value={technicalInspectionExpiry} onChange={(e) => setTechnicalInspectionExpiry(e.target.value)} />
                                    <Input label="TPL insurance expiry" type="date" value={tplInsuranceExpiry} onChange={(e) => setTplInsuranceExpiry(e.target.value)} />
                                    <Input label="Road tax expiry" type="date" value={roadTaxExpiry} onChange={(e) => setRoadTaxExpiry(e.target.value)} />
                                    <Input label="Tinted-glass certificate expiry" type="date" value={tintedGlassCertificateExpiry} onChange={(e) => setTintedGlassCertificateExpiry(e.target.value)} />
                                </div>
                                <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-3 text-sm">
                                    <span>
                                        <span className="block font-semibold">Luxury vehicle flag</span>
                                        <span className="text-xs text-muted-foreground">Used for future tax and ownership logic.</span>
                                    </span>
                                    <input type="checkbox" checked={isLuxury} onChange={(e) => setIsLuxury(e.target.checked)} className="h-5 w-5 accent-primary" />
                                </label>
                            </Panel>

                            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                                <Button type="submit" className="h-11 flex-1 rounded-xl font-bold">Shto automjet</Button>
                                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setIsVehicleModalOpen(false)}>Anulo</Button>
                            </div>
                        </form>
                    </AppSurface>
                </div>
            )}

            {(editingExpense || isExpenseCreateOpen) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <AppSurface className="app-dialog-panel w-full max-w-lg p-6 shadow-2xl">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="flex items-center gap-2 text-xl font-bold">
                                    {editingExpense ? <Pencil className="h-5 w-5 text-primary" /> : <DollarSign className="h-5 w-5 text-primary" />}
                                    {editingExpense ? 'Edit Expense' : 'Add Expense'}
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {editingExpense ? getVehicleName(editingExpense.vehicleId) : 'Log a manual cost against one vehicle.'}
                                </p>
                            </div>
                            <button type="button" onClick={closeExpenseEditor} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense} className="space-y-4">
                            {expenseSaveError && (
                                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                                    {expenseSaveError}
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {!editingExpense && (
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="mi-label">Vehicle</label>
                                        <select
                                            className="mi-field"
                                            value={expenseForm.vehicleId}
                                            onChange={(event) => setExpenseForm({ ...expenseForm, vehicleId: event.target.value })}
                                            required
                                        >
                                            <option value="">Select vehicle</option>
                                            {vehicles.map((vehicle) => (
                                                <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="mi-label">Category</label>
                                    <select
                                        className="mi-field"
                                        value={expenseForm.category}
                                        onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}
                                    >
                                        {expenseCategories.map((categoryOption) => (
                                            <option key={categoryOption} value={categoryOption}>{categoryOption}</option>
                                        ))}
                                    </select>
                                </div>
                                <Input
                                    label="Amount (€)"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={expenseForm.amount}
                                    onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
                                    required
                                />
                                <Input
                                    label="Date"
                                    type="date"
                                    value={expenseForm.date}
                                    onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })}
                                    required
                                />
                                <Input
                                    label="Notes (Optional)"
                                    value={expenseForm.notes}
                                    onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                                <Button type="submit" className="h-11 flex-1 rounded-xl font-bold">{editingExpense ? 'Update Expense' : 'Save Expense'}</Button>
                                <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={closeExpenseEditor}>Cancel</Button>
                            </div>
                        </form>
                    </AppSurface>
                </div>
            )}
        </Layout>
    );
};
