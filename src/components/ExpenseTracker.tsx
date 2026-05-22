import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { DollarSign, Calendar, Trash2, Plus, Tag, Pencil } from 'lucide-react';
import type { ExpenseRecord } from '../lib/types';
import { expenseAmount, sumExpenses } from '../lib/expenses';

export const ExpenseTracker = ({ vehicleId }: { vehicleId: string }) => {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [formError, setFormError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
    
    // Form
    const [category, setCategory] = useState('Fuel');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');

    const categories = ['Fuel', 'Insurance', 'Tax', 'Parking', 'Tolls', 'Cleaning', 'Maintenance', 'Document', 'Other'];

    const canEditExpense = (expense: ExpenseRecord) => !expense.sourceType || expense.sourceType === 'manual';

    const formatDateInput = (expenseDate?: Timestamp) => {
        const dateValue = expenseDate?.toDate?.();
        if (!dateValue) return '';
        return dateValue.toISOString().slice(0, 10);
    };

    const resetForm = () => {
        setEditingExpense(null);
        setCategory('Fuel');
        setAmount('');
        setDate('');
        setNotes('');
        setFormError('');
    };

    const openCreateForm = () => {
        if (showForm && !editingExpense) {
            setShowForm(false);
            resetForm();
            return;
        }

        resetForm();
        setShowForm(true);
    };

    const openEditForm = (expense: ExpenseRecord) => {
        if (!canEditExpense(expense)) {
            setFormError('Linked expenses must be edited from the related service or document.');
            return;
        }

        setEditingExpense(expense);
        setCategory(expense.category || 'Fuel');
        setAmount(String(expense.amount || ''));
        setDate(formatDateInput(expense.date));
        setNotes(expense.notes || '');
        setFormError('');
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        resetForm();
    };

    useEffect(() => {
        const q = query(
            collection(db, 'vehicles', vehicleId, 'expenses'),
            orderBy('date', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setExpenses(snapshot.docs.map(snapshotDoc => ({ id: snapshotDoc.id, vehicleId, ...snapshotDoc.data() } as ExpenseRecord)));
            setLoading(false);
            setLoadError('');
        }, (error) => {
            console.error('Expense listener failed', error);
            setLoadError('Expenses could not be loaded. Please check your account permissions and try again.');
            setLoading(false);
        });
        return unsubscribe;
    }, [vehicleId]);

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setFormError('');
            const payload = {
                category,
                amount: parseFloat(amount),
                date: Timestamp.fromDate(new Date(date)),
                notes: notes.trim(),
            };

            if (editingExpense) {
                if (!canEditExpense(editingExpense)) {
                    setFormError('Linked expenses must be edited from the related service or document.');
                    return;
                }

                await updateDoc(doc(db, 'vehicles', vehicleId, 'expenses', editingExpense.id), {
                    ...payload,
                    updatedAt: Timestamp.now(),
                });
            } else {
                await addDoc(collection(db, 'vehicles', vehicleId, 'expenses'), {
                    userId: user.uid,
                    vehicleId,
                    ...payload,
                    sourceType: 'manual',
                    createdAt: Timestamp.now()
                });
            }

            closeForm();
        } catch {
            setFormError(editingExpense ? 'Expense update failed. Please try again.' : 'Expense creation failed. Please try again.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this expense?')) {
            await deleteDoc(doc(db, 'vehicles', vehicleId, 'expenses', id));
        }
    };

    const handleDeleteClick = async (expense: ExpenseRecord) => {
        if (expense.sourceType && expense.sourceType !== 'manual') {
            alert('This expense is linked to another record. Delete the related service or document instead.');
            return;
        }

        await handleDelete(expense.id);
    };

    const totalStats = sumExpenses(expenses);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm text-emerald-500/80">Total Expenses</p>
                            <h3 className="text-2xl font-bold text-emerald-500">€{totalStats.toFixed(2)}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Expense Log</h3>
                <Button onClick={openCreateForm} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                </Button>
            </div>

            {loadError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                    {loadError}
                </div>
            )}

            {showForm && (
                <Card className="p-6 border-primary/20 animate-in fade-in slide-in-from-top-2 bg-surface/50 backdrop-blur-sm">
                    <form onSubmit={handleSaveExpense} className="space-y-4">
                        <h4 className="font-bold">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h4>
                        {formError && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                                {formError}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Category</label>
                                <select 
                                    className="flex h-10 w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <Input 
                                type="number" 
                                label="Amount (€)" 
                                placeholder="0.00" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                type="date" 
                                label="Date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                required 
                            />
                            <Input 
                                label="Notes (Optional)" 
                                placeholder="Details..." 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
                            <Button type="submit">{editingExpense ? 'Update Expense' : 'Save Expense'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center p-8">
                         <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
                        No expenses recorded.
                    </div>
                ) : (
                    expenses.map(expense => (
                        <Card key={expense.id} className="p-4 hover:border-primary/30 transition-all duration-300 group">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-surface rounded-xl border border-border">
                                        <Tag className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{expense.category}</h4>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {expense.date?.toDate().toLocaleDateString()}
                                            </span>
                                            {expense.notes && (
                                                <span className="truncate max-w-[150px] opacity-75">
                                                    - {expense.notes}
                                                </span>
                                            )}
                                            {expense.sourceType && expense.sourceType !== 'manual' && (
                                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                                                    linked {expense.sourceType}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-lg font-mono">€{expenseAmount(expense).toFixed(2)}</span>
                                    {canEditExpense(expense) && (
                                        <button
                                            onClick={() => openEditForm(expense)}
                                            className="text-muted-foreground hover:text-primary transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-primary/10 rounded-lg"
                                            title="Edit Expense"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDeleteClick(expense)} 
                                        className="text-muted-foreground hover:text-destructive transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg"
                                        title="Delete Expense"
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
