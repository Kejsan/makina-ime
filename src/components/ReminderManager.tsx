import { useState, useEffect } from 'react';
import { Bell, Plus, Calendar, CheckCircle, Trash2, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import type { Reminder } from '../lib/types';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const ReminderManager = () => {
    const { id: vehicleId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    
    // Form state
    const [title, setTitle] = useState('');
    const [type, setType] = useState('other');
    const [date, setDate] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!vehicleId) return;

        const q = query(
            collection(db, 'reminders'),
            where('vehicleId', '==', vehicleId),
            where('completed', '==', false) // Only show active remiders
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Reminder[];
            
            // Sort by due date asc (soonest first)
            setReminders(data.sort((a, b) => 
                (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0)
            ));
            setLoading(false);
        });

        return unsubscribe;
    }, [vehicleId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vehicleId || !user) return;

        setProcessing(true);
        try {
            await addDoc(collection(db, 'reminders'), {
                userId: user.uid,
                vehicleId,
                title,
                type,
                dueDate: Timestamp.fromDate(new Date(date)),
                leadTimeDays: 7, // Default
                recurrence: 'none',
                completed: false,
                createdAt: serverTimestamp()
            });
            setIsAdding(false);
            setTitle('');
            setDate('');
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    const handleComplete = async (id: string) => {
        if (!confirm('Mark this reminder as completed?')) return;
        try {
            await updateDoc(doc(db, 'reminders', id), {
                completed: true
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this reminder?')) return;
        try {
            await deleteDoc(doc(db, 'reminders', id));
        } catch (err) {
            console.error(err);
        }
    };

    const getDaysRemaining = (timestamp: any) => {
        if (!timestamp) return 0;
        const due = timestamp.toDate();
        const now = new Date();
        const diff = due.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Active Reminders</h3>
                <Button onClick={() => setIsAdding(!isAdding)} variant="outline" size="sm">
                    {isAdding ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> Add Reminder</>}
                </Button>
            </div>

            {isAdding && (
                <Card className="p-4 bg-surface/50 border-input">
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                placeholder="Title (e.g., Insurance Renewal)"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                            <div className="flex flex-col space-y-2">
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    <option value="other">General</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="tax">Road Tax</option>
                                    <option value="inspection">Inspection</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" isLoading={processing}>Save Reminder</Button>
                        </div>
                    </form>
                </Card>
            )}

            {loading ? (
                 <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
            ) : reminders.length === 0 ? (
                <div className="text-center py-12 bg-surface/50 rounded-lg border border-border border-dashed">
                    <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No active reminders.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reminders.map((reminder) => {
                        const daysLeft = getDaysRemaining(reminder.dueDate);
                        const isUrgent = daysLeft <= 7;
                        
                        return (
                            <Card key={reminder.id} className={cn("p-4 flex items-center justify-between", isUrgent ? "border-amber-500/50 bg-amber-500/5" : "")}>
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isUrgent ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary")}>
                                        {isUrgent ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{reminder.title}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            <span>{reminder.dueDate?.toDate().toLocaleDateString()}</span>
                                            <span className={cn("ml-2 font-medium", isUrgent ? "text-amber-500" : "")}>
                                                ({daysLeft} days left)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleComplete(reminder.id)}
                                        className="p-2 hover:bg-green-500/10 text-muted-foreground hover:text-green-500 rounded-full transition-colors" 
                                        title="Mark Complete"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(reminder.id)}
                                        className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
