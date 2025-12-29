import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { DollarSign, Calendar, Trash2, Plus, Tag } from 'lucide-react';

export const ExpenseTracker = ({ vehicleId }: { vehicleId: string }) => {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    // Form
    const [category, setCategory] = useState('Fuel');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');

    const categories = ['Fuel', 'Insurance', 'Tax', 'Parking', 'Tolls', 'Cleaning', 'Other'];

    useEffect(() => {
        const q = query(
            collection(db, 'vehicles', vehicleId, 'expenses'),
            orderBy('date', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, [vehicleId]);

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'vehicles', vehicleId, 'expenses'), {
                category,
                amount: parseFloat(amount),
                date: Timestamp.fromDate(new Date(date)),
                notes,
                createdAt: Timestamp.now()
            });
            setShowForm(false);
            setAmount('');
            setDate('');
            setNotes('');
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this expense?')) {
            await deleteDoc(doc(db, 'vehicles', vehicleId, 'expenses', id));
        }
    };

    const totalStats = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

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
                <Button onClick={() => setShowForm(!showForm)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Expense
                </Button>
            </div>

            {showForm && (
                <Card className="p-6 border-primary/20 animate-in fade-in slide-in-from-top-2 bg-surface/50 backdrop-blur-sm">
                    <form onSubmit={handleAddExpense} className="space-y-4">
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
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button type="submit">Save Expense</Button>
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
                                                    • {expense.notes}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-lg font-mono">€{expense.amount.toFixed(2)}</span>
                                    <button 
                                        onClick={() => handleDelete(expense.id)} 
                                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg"
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
