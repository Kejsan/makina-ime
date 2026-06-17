import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Wrench, Calendar, Trash2, Plus, Gauge, Pencil } from 'lucide-react';
import type { ServiceRecord } from '../lib/types';
import { moneyValue } from '../lib/expenses';

export const ServiceLog = ({
    vehicleId,
    quickAddToken = 0,
    vehicleCurrentMileage = 0,
}: {
    vehicleId: string;
    quickAddToken?: number;
    vehicleCurrentMileage?: number;
}) => {
    const { user } = useAuth();
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [formError, setFormError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
    
    // Form
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [cost, setCost] = useState('');
    const [mileage, setMileage] = useState('');

    const resetForm = () => {
        setEditingService(null);
        setDescription('');
        setDate('');
        setCost('');
        setMileage('');
        setFormError('');
    };

    const formatDateInput = (serviceDate?: Timestamp) => {
        const dateValue = serviceDate?.toDate?.();
        return dateValue ? dateValue.toISOString().slice(0, 10) : '';
    };

    const openCreateForm = () => {
        if (showForm && !editingService) {
            setShowForm(false);
            resetForm();
            return;
        }

        resetForm();
        setShowForm(true);
    };

    const openEditForm = (service: ServiceRecord) => {
        setEditingService(service);
        setDescription(service.description || '');
        setDate(formatDateInput(service.date));
        setCost(String(moneyValue(service.cost)));
        setMileage(service.mileage ? String(service.mileage) : '');
        setFormError('');
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        resetForm();
    };

    useEffect(() => {
        const q = query(
            collection(db, 'vehicles', vehicleId, 'services'),
            orderBy('date', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord)));
            setLoadError('');
            setLoading(false);
        }, (error) => {
            console.error('Service listener failed', error);
            setLoadError('Services could not be loaded. Please check your account permissions and try again.');
            setLoading(false);
        });
        return unsubscribe;
    }, [vehicleId]);

    useEffect(() => {
        if (quickAddToken > 0) openCreateForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quickAddToken]);

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        try {
            setFormError('');
            const serviceRef = editingService
                ? doc(db, 'vehicles', vehicleId, 'services', editingService.id)
                : doc(collection(db, 'vehicles', vehicleId, 'services'));
            const shouldCreateLinkedExpense = !editingService || !editingService.expenseId;
            const expenseRef = shouldCreateLinkedExpense
                ? doc(collection(db, 'vehicles', vehicleId, 'expenses'))
                : doc(db, 'vehicles', vehicleId, 'expenses', editingService.expenseId!);
            const serviceDate = Timestamp.fromDate(new Date(date));
            const serviceCost = moneyValue(cost);
            const serviceMileage = parseInt(mileage || '0', 10) || 0;
            const batch = writeBatch(db);
            const servicePayload = {
                userId: editingService?.userId || user.uid,
                vehicleId,
                description: description.trim(),
                date: serviceDate,
                cost: serviceCost,
                mileage: serviceMileage,
                expenseId: editingService?.expenseId || expenseRef.id,
                updatedAt: Timestamp.now(),
            };

            if (editingService) {
                batch.update(serviceRef, servicePayload);
            } else {
                batch.set(serviceRef, {
                    ...servicePayload,
                    createdAt: Timestamp.now()
                });
            }

            const expenseCreatePayload = {
                userId: user.uid,
                vehicleId,
                category: 'Maintenance',
                amount: serviceCost,
                date: serviceDate,
                notes: `Service: ${description.trim()}`,
                sourceType: 'service',
                sourceId: serviceRef.id,
                sourceLabel: description.trim(),
            };
            const expenseUpdatePayload = {
                category: 'Maintenance',
                amount: serviceCost,
                date: serviceDate,
                notes: `Service: ${description.trim()}`,
                sourceLabel: description.trim(),
                updatedAt: Timestamp.now(),
            };

            if (shouldCreateLinkedExpense) {
                batch.set(expenseRef, {
                    ...expenseCreatePayload,
                    createdAt: Timestamp.now()
                });
            } else {
                batch.update(expenseRef, expenseUpdatePayload);
            }

            if (serviceMileage > (vehicleCurrentMileage || 0) && confirm('Update the vehicle odometer to this service mileage?')) {
                batch.update(doc(db, 'vehicles', vehicleId), {
                    currentMileage: serviceMileage,
                    updatedAt: Timestamp.now(),
                    updatedBy: user.uid,
                });
            }

            await batch.commit();
            closeForm();
        } catch (error) {
            console.error('Service record save failed', error);
            setFormError(editingService ? 'Service update failed. Please try again.' : 'Service record creation failed. Please try again.');
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
                <Button onClick={openCreateForm} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                </Button>
            </div>

            {loadError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                    {loadError}
                </div>
            )}

            {showForm && (
                <Card className="p-6 border-primary/20 animate-in fade-in slide-in-from-top-2 bg-surface/50 backdrop-blur-sm">
                    <form onSubmit={handleSaveService} className="space-y-4">
                        <h4 className="font-bold">{editingService ? 'Edit Service' : 'Add Service'}</h4>
                        {formError && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                                {formError}
                            </div>
                        )}
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
                            <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
                            <Button type="submit">{editingService ? 'Update Record' : 'Save Record'}</Button>
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
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex min-w-0 items-start gap-4">
                                    <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                        <Wrench className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="break-words font-bold text-lg">{service.description}</h4>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
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
                                <div className="flex shrink-0 items-center justify-end gap-3">
                                    <span className="font-bold text-xl font-mono">€{moneyValue(service.cost).toFixed(2)}</span>
                                    <button
                                        onClick={() => openEditForm(service)}
                                        className="text-muted-foreground hover:text-primary transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-primary/10 rounded-lg"
                                        title="Edit Record"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
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
