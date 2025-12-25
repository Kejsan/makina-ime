import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Car as CarIcon, AlertCircle, Trash2 } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
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

export const Dashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
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

    const handleDelete = async (id: string) => {
        if (confirm('A jeni i sigurt që doni të fshini këtë mjet?')) {
            await deleteDoc(doc(db, 'vehicles', id));
        }
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-text to-muted bg-clip-text text-transparent">
                            {t('Mirëseerdhët, Zotëri')}
                        </h1>
                        <p className="text-muted mt-1">
                            {t('Filloni udhëtimin tuaj me AutoAdmin duke regjistruar mjetin tuaj të parë për menaxhim inteligjent.')}
                        </p>
                    </div>
                    <Button onClick={() => setShowAddForm(!showAddForm)}>
                        <Plus className="w-5 h-5 mr-2" />
                        {t('SHTO MJETIN E PARË')}
                    </Button>
                </div>

                {showAddForm && (
                    <Card className="max-w-xl mx-auto border-primary/50">
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <CarIcon className="w-6 h-6 mr-2 text-primary" />
                            Regjistro Mjetin e Ri
                        </h2>
                        <form onSubmit={handleAddVehicle} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Marka (Make)"
                                    placeholder="Mercedes-Benz"
                                    value={make}
                                    onChange={(e) => setMake(e.target.value)}
                                    required
                                />
                                <Input
                                    label="Modeli"
                                    placeholder="S-Class 350"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    label="Viti i Prodhimit"
                                    placeholder="2024"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    required
                                />
                                <Input
                                    type="date"
                                    label="Skadenca e Siguracionit"
                                    value={expiry}
                                    onChange={(e) => setExpiry(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" className="flex-1">Ruaj Mjetin</Button>
                                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Anulo</Button>
                            </div>
                        </form>
                    </Card>
                )}

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                ) : vehicles.length === 0 && !showAddForm ? (
                    <div className="text-center py-20 bg-surface/30 rounded-3xl border border-dashed border-border">
                        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
                            <CarIcon className="w-10 h-10 text-muted" />
                        </div>
                        <h3 className="text-xl font-medium text-text">Nuk keni asnjë mjet të regjistruar</h3>
                        <p className="text-muted mt-2 max-w-sm mx-auto">Shtoni mjetin tuaj të parë për të aktivizuar rikujtuesit e zgjuar dhe menaxhimin e mirëmbajtjes.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {vehicles.map(vehicle => (
                            <Card key={vehicle.id} className="group hover:border-primary/50 transition-all duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-background rounded-lg group-hover:bg-primary/10 transition-colors">
                                        <CarIcon className="w-6 h-6 text-primary" />
                                    </div>
                                    <button
                                        onClick={() => handleDelete(vehicle.id)}
                                        className="text-muted hover:text-red-500 transition-colors"
                                        title="Fshi mjetin"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <h3 className="text-xl font-bold mb-1">{vehicle.make} {vehicle.model}</h3>
                                <p className="text-muted text-sm mb-6">{vehicle.year}</p>

                                <div className="space-y-3 pt-6 border-t border-border">
                                    <div className="flex items-center text-sm text-yellow-500">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        <span>Insurance Alert</span>
                                    </div>
                                    {vehicle.registrationExpiry && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted">Skadon më:</span>
                                            <span className="font-medium">
                                                {vehicle.registrationExpiry.toDate().toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};
