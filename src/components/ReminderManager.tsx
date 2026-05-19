import { useState, useEffect } from 'react';
import { Bell, Plus, Calendar, CheckCircle, Trash2, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AppSurface, EmptyState, StatusPill } from './ui/design-system';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import type { Reminder } from '../lib/types';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const reminderTemplates = [
    { label: 'TPL insurance renewal', title: 'TPL insurance renewal', type: 'insurance', leadTimeDays: 30, recurrence: 'yearly' },
    { label: 'Road tax renewal', title: 'Road tax renewal', type: 'tax', leadTimeDays: 30, recurrence: 'yearly' },
    { label: 'Technical inspection', title: 'Technical inspection', type: 'inspection', leadTimeDays: 30, recurrence: 'yearly' },
    { label: 'Tinted-glass certificate', title: 'Tinted-glass certificate renewal', type: 'inspection', leadTimeDays: 30, recurrence: 'yearly' },
    { label: 'Oil and filters', title: 'Oil and filters service', type: 'maintenance', leadTimeDays: 14, recurrence: 'none' },
    { label: 'Timing belt', title: 'Timing belt service', type: 'maintenance', leadTimeDays: 30, recurrence: 'none' },
    { label: 'Tires check', title: 'Tires check / replacement', type: 'maintenance', leadTimeDays: 14, recurrence: 'none' },
    { label: 'Brake service', title: 'Brake service', type: 'maintenance', leadTimeDays: 14, recurrence: 'none' },
] as const;

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
    const [leadTimeDays, setLeadTimeDays] = useState('14');
    const [recurrence, setRecurrence] = useState<'none' | 'yearly' | 'monthly' | 'biennial'>('none');
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
                leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : 14,
                recurrence,
                completed: false,
                createdAt: serverTimestamp()
            });
            setIsAdding(false);
            setTitle('');
            setDate('');
            setType('other');
            setLeadTimeDays('14');
            setRecurrence('none');
        } catch {
            console.error('Reminder creation failed');
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
        } catch {
            console.error('Reminder completion failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this reminder?')) return;
        try {
            await deleteDoc(doc(db, 'reminders', id));
        } catch {
            console.error('Reminder deletion failed');
        }
    };

    const getDaysRemaining = (timestamp?: Timestamp) => {
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
                <AppSurface className="p-4">
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {reminderTemplates.map((template) => (
                                <button
                                    key={template.label}
                                    type="button"
                                    onClick={() => {
                                        setTitle(template.title);
                                        setType(template.type);
                                        setLeadTimeDays(String(template.leadTimeDays));
                                        setRecurrence(template.recurrence);
                                    }}
                                    className="shrink-0 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                >
                                    {template.label}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                placeholder="Title (e.g., Insurance Renewal)"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                            <div className="space-y-2">
                                <label className="mi-label">Reminder type</label>
                                <select 
                                    className="mi-field"
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
                                label="Due date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                            <Input
                                label="Lead time (days)"
                                type="number"
                                min="0"
                                max="365"
                                value={leadTimeDays}
                                onChange={(e) => setLeadTimeDays(e.target.value)}
                            />
                            <div className="space-y-2">
                                <label className="mi-label">Recurrence</label>
                                <select className="mi-field" value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}>
                                    <option value="none">None</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                    <option value="biennial">Every 2 years</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" isLoading={processing}>Save Reminder</Button>
                        </div>
                    </form>
                </AppSurface>
            )}

            {loading ? (
                 <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
            ) : reminders.length === 0 ? (
                <EmptyState icon={Bell} title="No active reminders" description="Use a legal or maintenance template to create your first reminder." />
            ) : (
                <div className="space-y-3">
                    {reminders.map((reminder) => {
                        const daysLeft = getDaysRemaining(reminder.dueDate);
                        const isUrgent = daysLeft <= 7;
                        
                        return (
                            <AppSurface key={reminder.id} className={cn("p-4 flex items-center justify-between", isUrgent ? "border-amber-500/50 bg-amber-500/5" : "")}>
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
                                            <StatusPill tone="slate">{reminder.leadTimeDays || 0}d lead</StatusPill>
                                            <StatusPill tone="blue">{reminder.recurrence || 'none'}</StatusPill>
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
                            </AppSurface>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
