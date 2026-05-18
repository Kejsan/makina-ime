import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Car as CarIcon, AlertCircle, Trash2, Calendar, Bell, DollarSign, Receipt, Clock } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Layout } from '../components/ui/Layout';
import type { ExpenseRecord, Reminder } from '../lib/types';
import { callR2DocumentFunction } from '../lib/r2Documents';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    plateNumber?: string;
    vin?: string;
    vehicleType?: string;
    currentMileage?: number;
    registrationExpiry?: Timestamp;
}

const formatCurrency = (value: number) => `€${value.toFixed(2)}`;

const StatCard = ({ icon: Icon, label, value, color, detail }: { icon: React.ElementType, label: string, value: string, color: string, detail?: string }) => (
    <Card className="p-5">
        <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                {detail && <p className="text-xs text-muted-foreground mt-1 truncate">{detail}</p>}
            </div>
        </div>
    </Card>
);

export const Dashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [expensesByVehicle, setExpensesByVehicle] = useState<Record<string, ExpenseRecord[]>>({});
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Form State
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [vin, setVin] = useState('');
    const [vehicleType, setVehicleType] = useState('car');
    const [currentMileage, setCurrentMileage] = useState('');
    const [expiry, setExpiry] = useState('');

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'vehicles'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    useEffect(() => {
        if (!user || vehicles.length === 0) {
            return;
        }

        const unsubscribes = vehicles.map((vehicle) => {
            const q = query(
                collection(db, 'vehicles', vehicle.id, 'expenses'),
                orderBy('date', 'desc')
            );

            return onSnapshot(q, (snapshot) => {
                setExpensesByVehicle((previous) => ({
                    ...previous,
                    [vehicle.id]: snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data()
                    } as ExpenseRecord))
                }));
            });
        });

        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [user, vehicles]);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'reminders'),
            where('userId', '==', user.uid),
            where('completed', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            } as Reminder));

            setReminders(data.sort((a, b) => (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0)));
        });

        return unsubscribe;
    }, [user]);

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await addDoc(collection(db, 'vehicles'), {
                userId: user.uid,
                make: make.trim(),
                model: model.trim(),
                year: parseInt(year),
                plateNumber: plateNumber.trim().toUpperCase(),
                vin: vin.trim().toUpperCase(),
                vehicleType,
                currentMileage: currentMileage ? parseInt(currentMileage) : 0,
                registrationExpiry: expiry ? Timestamp.fromDate(new Date(expiry)) : null,
                createdAt: Timestamp.now()
            });
            setShowAddForm(false);
            setMake('');
            setModel('');
            setYear('');
            setPlateNumber('');
            setVin('');
            setVehicleType('car');
            setCurrentMileage('');
            setExpiry('');
        } catch {
            console.error('Vehicle creation failed');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (!user) return;

        if (confirm('Delete this vehicle and all linked services, expenses, documents, reminders, and private files?')) {
            try {
                setDeleteError('');
                await callR2DocumentFunction(user, 'deleteVehicleCascade', { vehicleId: id });
            } catch {
                setDeleteError('Vehicle deletion failed. Please try again.');
            }
        }
    };

    const allExpenses = vehicles.flatMap((vehicle) => expensesByVehicle[vehicle.id] || []);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const monthlySpend = allExpenses
        .filter((expense) => expense.date?.toDate && expense.date.toDate() >= monthStart)
        .reduce((total, expense) => total + (expense.amount || 0), 0);
    const totalSpend = allExpenses.reduce((total, expense) => total + (expense.amount || 0), 0);
    const linkedSpend = allExpenses
        .filter((expense) => expense.sourceType && expense.sourceType !== 'manual')
        .reduce((total, expense) => total + (expense.amount || 0), 0);
    const dueSoon = reminders.filter((reminder) => {
        const dueDate = reminder.dueDate?.toDate();
        return dueDate && dueDate <= nextThirtyDays;
    });
    const recentExpenses = allExpenses
        .filter((expense) => expense.date?.toDate)
        .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())
        .slice(0, 5);

    const getVehicleName = (vehicleId: string) => {
        const vehicle = vehicles.find((item) => item.id === vehicleId);
        return vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle';
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            Fleet costs, documents, service history, and upcoming reminders.
                        </p>
                    </div>
                    <Button onClick={() => setShowAddForm(!showAddForm)} size="lg" className="shadow-lg shadow-primary/20 w-full sm:w-auto">
                        <Plus className="w-5 h-5 mr-2" />
                        {t('SHTO MJET')}
                    </Button>
                </div>
                {deleteError && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        {deleteError}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard icon={CarIcon} label="Vehicles" value={vehicles.length.toString()} color="bg-blue-600" detail="Registered in your garage" />
                    <StatCard icon={DollarSign} label="This Month" value={formatCurrency(monthlySpend)} color="bg-emerald-600" detail="All logged costs" />
                    <StatCard icon={Receipt} label="Total Tracked" value={formatCurrency(totalSpend)} color="bg-indigo-600" detail={`${formatCurrency(linkedSpend)} from linked records`} />
                    <StatCard icon={Bell} label="Due Soon" value={dueSoon.length.toString()} color="bg-amber-500" detail="Next 30 days" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg">Recent Costs</h2>
                            <Receipt className="w-5 h-5 text-muted-foreground" />
                        </div>
                        {recentExpenses.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6">No expenses logged yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {recentExpenses.map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between gap-3 rounded-lg bg-accent/40 p-3">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{expense.category}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {getVehicleName(expense.vehicleId)}
                                                {expense.sourceType && expense.sourceType !== 'manual' ? ` - linked ${expense.sourceType}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold font-mono">{formatCurrency(expense.amount || 0)}</p>
                                            <p className="text-xs text-muted-foreground">{expense.date?.toDate?.().toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-lg">Upcoming Deadlines</h2>
                            <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        {reminders.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-6">No active reminders.</p>
                        ) : (
                            <div className="space-y-3">
                                {reminders.slice(0, 5).map((reminder) => (
                                    <div key={reminder.id} className="flex items-center justify-between gap-3 rounded-lg bg-accent/40 p-3">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{reminder.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{getVehicleName(reminder.vehicleId)}</p>
                                        </div>
                                        <p className="text-sm font-medium shrink-0">{reminder.dueDate?.toDate?.().toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {showAddForm && (
                    <Card className="max-w-xl mx-auto border-primary/50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center">
                                <CarIcon className="w-6 h-6 mr-2 text-primary" />
                                Add New Vehicle
                            </h2>
                            <form onSubmit={handleAddVehicle} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Make</label>
                                        <Input
                                            placeholder="Mercedes-Benz"
                                            value={make}
                                            onChange={(e) => setMake(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Model</label>
                                        <Input
                                            placeholder="S-Class 350"
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Year</label>
                                        <Input
                                            type="number"
                                            placeholder="2024"
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Plate Number</label>
                                        <Input
                                            placeholder="AB 123 CD"
                                            value={plateNumber}
                                            onChange={(e) => setPlateNumber(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Vehicle Type</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={vehicleType}
                                            onChange={(e) => setVehicleType(e.target.value)}
                                        >
                                            <option value="car">Car</option>
                                            <option value="suv">SUV</option>
                                            <option value="motorcycle">Motorcycle</option>
                                            <option value="truck">Truck</option>
                                            <option value="van">Van</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Current Mileage (km)</label>
                                        <Input
                                            type="number"
                                            placeholder="120000"
                                            value={currentMileage}
                                            onChange={(e) => setCurrentMileage(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">VIN</label>
                                        <Input
                                            placeholder="Vehicle identification number"
                                            value={vin}
                                            onChange={(e) => setVin(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Insurance Expiry</label>
                                        <Input
                                            type="date"
                                            value={expiry}
                                            onChange={(e) => setExpiry(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                                    <Button type="submit" className="flex-1">Save Vehicle</Button>
                                    <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                )}

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                ) : vehicles.length === 0 && !showAddForm ? (
                    <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-muted-foreground/25">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                            <CarIcon className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-medium">No vehicles registered</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Add your first vehicle to start tracking maintenance and expenses.</p>
                        <Button onClick={() => setShowAddForm(true)} variant="outline" className="mt-6">
                            Register Vehicle
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {vehicles.map(vehicle => (
                            <Card 
                                key={vehicle.id} 
                                className="group hover:border-primary/50 transition-all duration-300 overflow-hidden cursor-pointer"
                                onClick={() => navigate(`/vehicle/${vehicle.id}`)}
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                            <CarIcon className="w-6 h-6 text-primary" />
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(vehicle.id, e)}
                                            className="text-muted-foreground hover:text-destructive transition-colors p-2 hover:bg-destructive/10 rounded-lg"
                                            title="Delete Vehicle"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <h3 className="text-xl font-bold mb-1">{vehicle.make} {vehicle.model}</h3>
                                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {vehicle.year}{vehicle.plateNumber ? ` - ${vehicle.plateNumber}` : ''}
                                    </p>

                                    <div className="space-y-3 pt-6 mt-4 border-t border-border/50">
                                        {vehicle.registrationExpiry && (
                                            <div className="flex items-center justify-between text-sm p-2 bg-accent/50 rounded-lg">
                                                <div className="flex items-center text-muted-foreground">
                                                    <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                                                    Insurance
                                                </div>
                                                <span className="font-medium text-foreground">
                                                    {vehicle.registrationExpiry.toDate().toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                        {!vehicle.registrationExpiry && (
                                             <div className="flex items-center justify-between text-sm p-2 bg-accent/50 rounded-lg">
                                                <span className="text-muted-foreground">Status</span>
                                                <span className="font-medium text-emerald-500">Active</span>
                                             </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};


