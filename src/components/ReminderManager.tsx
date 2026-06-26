import { useMemo, useState, useEffect } from 'react';
import { Bell, Plus, Calendar, CheckCircle, Trash2, Clock, AlertTriangle, Loader2, Pencil } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AppSurface, EmptyState, StatusPill } from './ui/design-system';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import type { Reminder, Vehicle } from '../lib/types';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { getVehicleComplianceDeadlines } from '../lib/business';
import { isValidDateInput, parseInteger } from '../lib/validation';

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

type ReminderListItem = Reminder & {
    source?: 'manual' | 'vehicle';
};

export const ReminderManager = ({
    ownerType = 'personal',
    ownerId,
    organizationId,
    quickAddToken = 0,
    canEditAll = true,
}: {
    ownerType?: 'personal' | 'organization';
    ownerId?: string;
    organizationId?: string;
    quickAddToken?: number;
    canEditAll?: boolean;
}) => {
    const { id: vehicleId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    
    // Form state
    const [title, setTitle] = useState('');
    const [type, setType] = useState('other');
    const [date, setDate] = useState('');
    const [leadTimeDays, setLeadTimeDays] = useState('14');
    const [recurrence, setRecurrence] = useState<'none' | 'yearly' | 'monthly' | 'biennial'>('none');
    const [processing, setProcessing] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const resetForm = () => {
        setEditingReminder(null);
        setTitle('');
        setDate('');
        setType('other');
        setLeadTimeDays('14');
        setRecurrence('none');
        setFormErrors({});
    };

    const openCreateForm = () => {
        if (isAdding && !editingReminder) {
            setIsAdding(false);
            resetForm();
            return;
        }

        resetForm();
        setIsAdding(true);
    };

    const openEditForm = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setTitle(reminder.title || '');
        setType(reminder.type || 'other');
        setDate(reminder.dueDate?.toDate?.().toISOString().slice(0, 10) || '');
        setLeadTimeDays(String(reminder.leadTimeDays ?? 14));
        setRecurrence(reminder.recurrence || 'none');
        setIsAdding(true);
    };

    useEffect(() => {
        if (!vehicleId || !user) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const constraints = ownerType === 'organization' && ownerId
            ? [
                where('ownerType', '==', 'organization'),
                where('ownerId', '==', ownerId),
                where('vehicleId', '==', vehicleId),
                where('completed', '==', false),
            ]
            : [
                where('userId', '==', user.uid),
                where('vehicleId', '==', vehicleId),
                where('completed', '==', false),
            ];

        const q = query(collection(db, 'reminders'), ...constraints);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Reminder[];
            
            // Sort by due date asc (soonest first)
            setReminders(data.filter((reminder) => !reminder.archivedAt).sort((a, b) =>
                (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0)
            ));
            setLoadError('');
            setLoading(false);
        }, (error) => {
            console.error('Reminder listener failed', error);
            setLoadError('Reminders could not be loaded. Please check your account permissions and try again.');
            setLoading(false);
        });

        return unsubscribe;
    }, [ownerId, ownerType, user, vehicleId]);

    useEffect(() => {
        if (quickAddToken > 0) openCreateForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quickAddToken]);

    useEffect(() => {
        if (!vehicleId) return;
        const unsubscribe = onSnapshot(doc(db, 'vehicles', vehicleId), (snapshot) => {
            setVehicle(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Vehicle) : null);
        }, (error) => {
            console.error('Reminder vehicle listener failed', error);
        });
        return unsubscribe;
    }, [vehicleId]);

    const vehicleDeadlineItems = useMemo<ReminderListItem[]>(() => {
        if (!vehicle) return [];
        return getVehicleComplianceDeadlines(vehicle).map((deadline) => ({
            id: `vehicle-${deadline.key}`,
            userId: user?.uid || '',
            vehicleId: vehicle.id,
            ownerType,
            ownerId: ownerId || user?.uid,
            organizationId,
            type: deadline.key === 'insurance' ? 'insurance' : deadline.key === 'tax' ? 'tax' : 'inspection',
            title: deadline.label,
            dueDate: Timestamp.fromDate(deadline.date),
            leadTimeDays: 30,
            recurrence: deadline.key === 'inspection' ? 'biennial' : 'yearly',
            completed: false,
            createdAt: Timestamp.fromDate(deadline.date),
            source: 'vehicle',
        }));
    }, [organizationId, ownerId, ownerType, user?.uid, vehicle]);

    const allReminderItems = useMemo<ReminderListItem[]>(() => {
        const explicitReminders = reminders.map((reminder) => ({ ...reminder, source: 'manual' as const }));
        const explicitKeys = new Set(explicitReminders.map((reminder) => `${reminder.type}-${reminder.dueDate?.seconds || ''}-${reminder.title}`));
        const derived = vehicleDeadlineItems.filter((item) => !explicitKeys.has(`${item.type}-${item.dueDate?.seconds || ''}-${item.title}`));
        return [...explicitReminders, ...derived].sort((a, b) => (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0));
    }, [reminders, vehicleDeadlineItems]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vehicleId || !user) return;

        const leadTime = parseInteger(leadTimeDays || '14', { min: 0, max: 365, required: true });
        const nextErrors: Record<string, string> = {};
        if (!title.trim()) nextErrors.title = 'Title is required.';
        else if (title.trim().length > 120) nextErrors.title = 'Title must be 120 characters or fewer.';
        if (!isValidDateInput(date)) nextErrors.date = 'Enter a valid due date.';
        if (leadTime.error) nextErrors.leadTimeDays = leadTime.error;
        setFormErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0 || leadTime.value === null) return;

        setProcessing(true);
        try {
            const payload = {
                title: title.trim(),
                type,
                dueDate: Timestamp.fromDate(new Date(date)),
                leadTimeDays: leadTime.value,
                recurrence,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
            };

            if (editingReminder) {
                await updateDoc(doc(db, 'reminders', editingReminder.id), payload);
            } else {
                await addDoc(collection(db, 'reminders'), {
                    userId: user.uid,
                    ownerType,
                    ownerId: ownerId || user.uid,
                    organizationId: organizationId || null,
                    createdBy: user.uid,
                    vehicleId,
                    ...payload,
                    completed: false,
                    createdAt: serverTimestamp()
                });
            }

            setIsAdding(false);
            resetForm();
        } catch {
            console.error('Reminder save failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleComplete = async (id: string) => {
        if (!confirm('Mark this reminder as completed?')) return;
        if (!user) return;
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'reminders', id), {
                completed: true,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
            });

            const notificationsSnapshot = await getDocs(query(
                collection(db, 'users', user.uid, 'notifications'),
                where('reminderId', '==', id),
                where('read', '==', false)
            ));
            notificationsSnapshot.docs.forEach((notificationDoc) => {
                batch.update(notificationDoc.ref, {
                    read: true,
                    readAt: serverTimestamp(),
                });
            });

            await batch.commit();
        } catch {
            console.error('Reminder completion failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(ownerType === 'organization' ? 'Archive this reminder?' : 'Delete this reminder?')) return;
        try {
            if (ownerType === 'organization') await updateDoc(doc(db, 'reminders', id), { archivedAt: serverTimestamp(), archivedBy: user?.uid || null, updatedAt: serverTimestamp(), updatedBy: user?.uid || null });
            else await deleteDoc(doc(db, 'reminders', id));
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
                <Button onClick={openCreateForm} variant="outline" size="sm">
                    {isAdding ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> Add Reminder</>}
                </Button>
            </div>

            {isAdding && (
                <AppSurface className="p-4">
                    <form onSubmit={handleSave} className="space-y-4">
                        <h4 className="font-bold">{editingReminder ? 'Edit Reminder' : 'Add Reminder'}</h4>
                        {!editingReminder && (
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
                        )}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input
                                placeholder="Title (e.g., Insurance Renewal)"
                                value={title}
                                maxLength={120}
                                error={formErrors.title}
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
                                error={formErrors.date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                            <Input
                                label="Lead time (days)"
                                type="text"
                                inputMode="numeric"
                                maxLength={3}
                                min="0"
                                max="365"
                                value={leadTimeDays}
                                error={formErrors.leadTimeDays}
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
                            <Button type="submit" isLoading={processing}>{editingReminder ? 'Update Reminder' : 'Save Reminder'}</Button>
                        </div>
                    </form>
                </AppSurface>
            )}

            {loading ? (
                 <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
            ) : loadError ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                    {loadError}
                </div>
            ) : allReminderItems.length === 0 ? (
                <EmptyState icon={Bell} title="No active reminders" description="Use a legal or maintenance template to create your first reminder." />
            ) : (
                <div className="space-y-3">
                    {allReminderItems.map((reminder) => {
                        const daysLeft = getDaysRemaining(reminder.dueDate);
                        const isUrgent = daysLeft <= 7;
                        const canEditReminder = canEditAll || reminder.createdBy === user?.uid || reminder.userId === user?.uid;
                        
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
                                            {reminder.source === 'vehicle' && <StatusPill tone="emerald">Vehicle date</StatusPill>}
                                        </div>
                                    </div>
                                </div>
                                {reminder.source !== 'vehicle' && canEditReminder && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditForm(reminder)}
                                            className="p-2 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
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
                                )}
                            </AppSurface>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
