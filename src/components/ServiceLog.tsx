import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Wrench, Calendar, Trash2, Plus, Gauge } from 'lucide-react';
import type { ServiceRecord } from '../lib/types';

export const ServiceLog = ({ vehicleId }: { vehicleId: string }) => {
    const { user } = useAuth();
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Form
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [cost, setCost] = useState('');
    const [mileage, setMileage] = useState('');

    useEffect(() => {
        const q = query(
            collection(db, 'vehicles', vehicleId, 'services'),
            orderBy('date', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
            setLoading(false);
        });
        return unsubscribe;
    }, [vehicleId]);

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        try {
            const serviceRef = doc(collection(db, 'vehicles', vehicleId, 'services'));
            const expenseRef = doc(collection(db, 'vehicles', vehicleId, 'expenses'));
            const serviceDate = Timestamp.fromDate(new Date(date));
            const serviceCost = parseFloat(cost);
            const serviceMileage = parseInt(mileage);
            const batch = writeBatch(db);

            batch.set(serviceRef, {
                userId: user.uid,
                vehicleId,
                description,
                date: serviceDate,
                cost: serviceCost,
                mileage: serviceMileage,
                expenseId: expenseRef.id,
                createdAt: Timestamp.now()
            });

            batch.set(expenseRef, {
                userId: user.uid,
                vehicleId,
                category: 'Maintenance',
                amount: serviceCost,
                date: serviceDate,
                notes: `Service: ${description}`,
                sourceType: 'service',
                sourceId: serviceRef.id,
                sourceLabel: description,
                createdAt: Timestamp.now()
            });

            await batch.commit();
            setShowForm(false);
            setDescription('');
            setDate('');
            setCost('');
            setMileage('');
        } catch {
            console.error('Service record creation failed');
        }
    };

     const handleDelete = async (service: ServiceRecord) => {
        if (confirm('Delete this service record?')) {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'vehicles', vehicleId, 'services', service.id));
            if (service.expenseId) {
                batch.delete(doc(db, 'vehicles', vehicleId, 'expenses', service.expenseId));
            }
            await batch.commit();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Service History</h3>
                <Button onClick={() => setShowForm(!showForm)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                </Button>
            </div>

            {showForm && (
                <Card className="p-6 border-primary/20 animate-in fade-in slide-in-from-top-2 bg-surface/50 backdrop-blur-sm">
                    <form onSubmit={handleAddService} className="space-y-4">
                        <Input 
                            label="Description" 
                            placeholder="Oil Change, Brake Pads..." 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            required 
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input 
                                type="date" 
                                label="Date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                required 
                            />
                            <Input 
                                type="number" 
                                label="Cost (€)" 
                                placeholder="0.00" 
                                value={cost} 
                                onChange={e => setCost(e.target.value)} 
                                required 
                            />
                            <Input 
                                type="number" 
                                label="Mileage (km)" 
                                placeholder="120000" 
                                value={mileage} 
                                onChange={e => setMileage(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button type="submit">Save Record</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="space-y-4">
                {loading ? (
                     <div className="flex justify-center p-8">
                        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                ) : services.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                        No service records found.
                    </div>
                ) : (
                    services.map(service => (
                        <Card key={service.id} className="p-5 hover:border-primary/30 transition-all duration-300 group">
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                        <Wrench className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{service.description}</h4>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {service.date?.toDate().toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Gauge className="w-3.5 h-3.5" />
                                                {service.mileage.toLocaleString()} km
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="font-bold text-xl font-mono">€{service.cost.toFixed(2)}</span>
                                    <button 
                                        onClick={() => handleDelete(service)} 
                                        className="text-muted-foreground hover:text-destructive transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg"
                                        title="Delete Record"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};
