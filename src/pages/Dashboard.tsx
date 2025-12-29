import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Car as CarIcon, AlertCircle, Trash2, Calendar, Wrench, DollarSign } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Layout } from '../components/ui/Layout';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    registrationExpiry?: Timestamp;
}

const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => (
    <Card className="p-6">
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            </div>
        </div>
    </Card>
);

export const Dashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // Form State
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
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

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await addDoc(collection(db, 'vehicles'), {
                userId: user.uid,
                make,
                model,
                year: parseInt(year),
                registrationExpiry: expiry ? Timestamp.fromDate(new Date(expiry)) : null,
                createdAt: Timestamp.now()
            });
            setShowAddForm(false);
            setMake('');
            setModel('');
            setYear('');
            setExpiry('');
        } catch (error) {
            console.error("Error adding vehicle: ", error);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (confirm('A jeni i sigurt që doni të fshini këtë mjet?')) {
            await deleteDoc(doc(db, 'vehicles', id));
        }
    };

    const activeVehicles = vehicles.length;
    const monthlySpend = "€0"; // Placeholder

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            Overview of your fleet status and upcoming alerts.
                        </p>
                    </div>
                    <Button onClick={() => setShowAddForm(!showAddForm)} size="lg" className="shadow-lg shadow-primary/20">
                        <Plus className="w-5 h-5 mr-2" />
                        {t('SHTO MJET')}
                    </Button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon={CarIcon} label="Total Vehicles" value={activeVehicles.toString()} color="bg-blue-600" />
                    <StatCard icon={Wrench} label="Pending Services" value="0" color="bg-amber-500" />
                    <StatCard icon={DollarSign} label="Monthly Expenses" value={monthlySpend} color="bg-emerald-600" />
                </div>

                {showAddForm && (
                    <Card className="max-w-xl mx-auto border-primary/50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-6 flex items-center">
                                <CarIcon className="w-6 h-6 mr-2 text-primary" />
                                Add New Vehicle
                            </h2>
                            <form onSubmit={handleAddVehicle} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
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
                                <div className="grid grid-cols-2 gap-4">
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
                                        <label className="text-sm font-medium">Insurance Expiry</label>
                                        <Input
                                            type="date"
                                            value={expiry}
                                            onChange={(e) => setExpiry(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-4">
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
                                        {vehicle.year}
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


