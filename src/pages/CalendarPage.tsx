import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { addDoc, collection, onSnapshot, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Bell, CalendarDays, Filter, Plus, Wrench, X } from 'lucide-react';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AppSurface, EmptyState, PageHeader, Panel, StatusPill } from '../components/ui/design-system';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import type { Reminder, Vehicle } from '../lib/types';
import { getVehicleComplianceDeadlines } from '../lib/business';

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfDay = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const daysUntil = (date: Date) => Math.ceil((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / (1000 * 60 * 60 * 24));

type CalendarReminder = Reminder & {
    source?: 'manual' | 'vehicle';
};

export const CalendarPage = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [vehicleFilter, setVehicleFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [view, setView] = useState<'list' | 'month'>('list');
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [customReminder, setCustomReminder] = useState({
        vehicleId: '',
        title: '',
        type: 'other',
        dueDate: '',
        leadTimeDays: '14',
        recurrence: 'none' as Reminder['recurrence'],
    });
    const today = useMemo(() => new Date(), []);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(query(collection(db, 'vehicles'), where('userId', '==', user.uid)), (snapshot) => {
            setVehicles(snapshot.docs
                .map((item) => ({ id: item.id, ...item.data() } as Vehicle))
                .filter((vehicle) => vehicle.ownerType !== 'organization'));
            setLoadError('');
        }, (error) => {
            console.error('Calendar vehicles listener failed', error);
            setLoadError('Calendar data could not be loaded. Please check your account permissions and try again.');
        });
        return unsubscribe;
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(query(collection(db, 'reminders'), where('userId', '==', user.uid)), (snapshot) => {
            setReminders(snapshot.docs
                .map((item) => ({ id: item.id, ...item.data() } as Reminder))
                .filter((reminder) => reminder.ownerType !== 'organization'));
            setLoadError('');
        }, (error) => {
            console.error('Calendar reminders listener failed', error);
            setLoadError('Calendar data could not be loaded. Please check your account permissions and try again.');
        });
        return unsubscribe;
    }, [user]);

    const vehicleName = (vehicleId: string) => {
        const vehicle = vehicles.find((item) => item.id === vehicleId);
        return vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle';
    };

    const calendarReminders = useMemo<CalendarReminder[]>(() => {
        const explicitReminders = reminders.map((reminder) => ({ ...reminder, source: 'manual' as const }));
        const explicitKeys = new Set(explicitReminders.map((reminder) => `${reminder.vehicleId}-${reminder.type}-${reminder.dueDate?.seconds || ''}-${reminder.title}`));
        const vehicleDeadlines = vehicles.flatMap((vehicle) => getVehicleComplianceDeadlines(vehicle).map((deadline) => ({
            id: `vehicle-${vehicle.id}-${deadline.key}`,
            userId: user?.uid || '',
            vehicleId: vehicle.id,
            ownerType: 'personal' as const,
            ownerId: user?.uid,
            type: deadline.key === 'insurance' ? 'insurance' : deadline.key === 'tax' ? 'tax' : 'inspection',
            title: deadline.label,
            dueDate: Timestamp.fromDate(deadline.date),
            leadTimeDays: 30,
            recurrence: deadline.key === 'inspection' ? 'biennial' as const : 'yearly' as const,
            completed: false,
            createdAt: Timestamp.fromDate(deadline.date),
            source: 'vehicle' as const,
        }))).filter((item) => !explicitKeys.has(`${item.vehicleId}-${item.type}-${item.dueDate.seconds}-${item.title}`));

        return [...explicitReminders, ...vehicleDeadlines];
    }, [reminders, user?.uid, vehicles]);

    const filteredReminders = useMemo(() => calendarReminders
        .filter((reminder) => !reminder.completed && reminder.dueDate?.toDate)
        .filter((reminder) => vehicleFilter === 'all' || reminder.vehicleId === vehicleFilter)
        .filter((reminder) => typeFilter === 'all' || reminder.type === typeFilter)
        .sort((left, right) => left.dueDate.toMillis() - right.dueDate.toMillis()), [calendarReminders, vehicleFilter, typeFilter]);

    const monthDays = useMemo(() => {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const leading = first.getDay() === 0 ? 6 : first.getDay() - 1;
        const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
        for (let day = 1; day <= last.getDate(); day += 1) {
            cells.push(new Date(today.getFullYear(), today.getMonth(), day));
        }
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [today]);

    const remindersForDay = (date: Date) => filteredReminders.filter((reminder) => {
        const due = reminder.dueDate.toDate();
        return due.getFullYear() === date.getFullYear() && due.getMonth() === date.getMonth() && due.getDate() === date.getDate();
    });

    const saveCustomReminder = async (event: FormEvent) => {
        event.preventDefault();
        if (!user || !customReminder.vehicleId) return;
        setSaving(true);

        try {
            await addDoc(collection(db, 'reminders'), {
                userId: user.uid,
                ownerType: 'personal',
                ownerId: user.uid,
                vehicleId: customReminder.vehicleId,
                title: customReminder.title.trim(),
                type: customReminder.type,
                dueDate: Timestamp.fromDate(new Date(customReminder.dueDate)),
                leadTimeDays: parseInt(customReminder.leadTimeDays || '14'),
                recurrence: customReminder.recurrence,
                completed: false,
                createdAt: serverTimestamp(),
            });
            setIsCustomOpen(false);
            setCustomReminder({
                vehicleId: '',
                title: '',
                type: 'other',
                dueDate: '',
                leadTimeDays: '14',
                recurrence: 'none',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <PageHeader
                    eyebrow={t('Calendar')}
                    title={t('Reminder Calendar')}
                    description={t('Track legal deadlines, service care, and custom reminders across every vehicle.')}
                    actions={
                        <>
                            <Button type="button" onClick={() => setIsCustomOpen(true)} className="h-10">
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add Custom Reminder')}
                            </Button>
                            <div className="flex rounded-xl border border-border bg-card p-1">
                                {(['list', 'month'] as const).map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setView(item)}
                                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {item === 'list' ? t('List') : t('Month')}
                                    </button>
                                ))}
                            </div>
                        </>
                    }
                />

                <AppSurface className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Filter className="h-4 w-4 text-primary" />
                            {t('Filters')}
                        </div>
                        <select className="mi-field md:max-w-xs" value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)}>
                            <option value="all">{t('All vehicles')}</option>
                            {vehicles.map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model}</option>
                            ))}
                        </select>
                        <select className="mi-field md:max-w-xs" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                            <option value="all">{t('All types')}</option>
                            <option value="insurance">{t('Insurance')}</option>
                            <option value="tax">{t('Road tax')}</option>
                            <option value="inspection">{t('Inspection')}</option>
                            <option value="maintenance">{t('Maintenance')}</option>
                            <option value="document">{t('Document')}</option>
                            <option value="other">{t('Other')}</option>
                        </select>
                    </div>
                </AppSurface>

                {loadError && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                        {loadError}
                    </div>
                )}

                {filteredReminders.length === 0 ? (
                    <EmptyState icon={CalendarDays} title={t('No reminders found')} description={t('Create reminders from a vehicle profile or document expiry to populate the calendar.')} />
                ) : view === 'list' ? (
                    <div className="space-y-3">
                        {filteredReminders.map((reminder) => {
                            const due = reminder.dueDate.toDate();
                            const daysLeft = daysUntil(due);
                            const tone = daysLeft < 0 ? 'rose' : daysLeft <= reminder.leadTimeDays ? 'amber' : 'emerald';
                            const Icon = reminder.type === 'maintenance' ? Wrench : reminder.type === 'insurance' ? Bell : CalendarDays;

                            return (
                                <AppSurface key={reminder.id} className="flex items-start justify-between gap-4 p-4">
                                    <div className="min-w-0">
                                        <p className="mi-label">{vehicleName(reminder.vehicleId)}</p>
                                        <h2 className="mt-1 flex items-center gap-2 font-bold">
                                            <Icon className="h-4 w-4 text-primary" />
                                            {reminder.title}
                                        </h2>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {due.toLocaleDateString()} · {reminder.leadTimeDays} {t('day lead')} · {reminder.recurrence}
                                            {reminder.source === 'vehicle' ? ` · ${t('Vehicle date')}` : ''}
                                        </p>
                                    </div>
                                    <StatusPill tone={tone}>{daysLeft < 0 ? t('Expired') : `${daysLeft} ${t('days')}`}</StatusPill>
                                </AppSurface>
                            );
                        })}
                    </div>
                ) : (
                    <AppSurface className="overflow-hidden p-0">
                        <div className="border-b border-border p-4">
                            <h2 className="font-bold">{monthLabels[today.getMonth()]} {today.getFullYear()}</h2>
                        </div>
                        <div className="grid grid-cols-7 border-b border-border text-center text-xs font-bold uppercase text-muted-foreground">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="p-2">{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7">
                            {monthDays.map((date, index) => {
                                const items = date ? remindersForDay(date) : [];
                                return (
                                    <Panel key={date?.toISOString() || `blank-${index}`} className="min-h-28 rounded-none border-0 border-b border-r border-border/60 p-2">
                                        {date && (
                                            <>
                                                <p className="text-xs font-bold">{date.getDate()}</p>
                                                <div className="mt-2 space-y-1">
                                                    {items.slice(0, 2).map((item) => (
                                                        <div key={item.id} className="truncate rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                                                            {item.title}
                                                        </div>
                                                    ))}
                                                    {items.length > 2 && <p className="text-[10px] text-muted-foreground">+{items.length - 2} more</p>}
                                                </div>
                                            </>
                                        )}
                                    </Panel>
                                );
                            })}
                        </div>
                    </AppSurface>
                )}
            </div>

            {isCustomOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <AppSurface className="w-full max-w-lg p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="mi-label text-primary">{t('Reminders')}</p>
                                <h2 className="mt-1 text-xl font-bold">{t('Add Custom Reminder')}</h2>
                                <p className="mt-1 text-sm text-muted-foreground">{t('Create a reminder for service, document, or any other vehicle task.')}</p>
                            </div>
                            <button type="button" onClick={() => setIsCustomOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={saveCustomReminder} className="space-y-4">
                            <div className="space-y-2">
                                <label className="mi-label">{t('Vehicle')}</label>
                                <select className="mi-field" required value={customReminder.vehicleId} onChange={(event) => setCustomReminder({ ...customReminder, vehicleId: event.target.value })}>
                                    <option value="">{t('Select vehicle')}</option>
                                    {vehicles.map((vehicle) => (
                                        <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model}</option>
                                    ))}
                                </select>
                            </div>
                            <Input label={t('Title')} required value={customReminder.title} onChange={(event) => setCustomReminder({ ...customReminder, title: event.target.value })} placeholder={t('e.g. Renew parking permit')} />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="mi-label">{t('Type')}</label>
                                    <select className="mi-field" value={customReminder.type} onChange={(event) => setCustomReminder({ ...customReminder, type: event.target.value })}>
                                        <option value="maintenance">{t('Maintenance')}</option>
                                        <option value="document">{t('Document')}</option>
                                        <option value="insurance">{t('Insurance')}</option>
                                        <option value="tax">{t('Road tax')}</option>
                                        <option value="inspection">{t('Inspection')}</option>
                                        <option value="other">{t('Other')}</option>
                                    </select>
                                </div>
                                <Input label={t('Due Date')} type="date" required value={customReminder.dueDate} onChange={(event) => setCustomReminder({ ...customReminder, dueDate: event.target.value })} />
                                <Input label={t('Lead time days')} type="number" min="0" max="365" value={customReminder.leadTimeDays} onChange={(event) => setCustomReminder({ ...customReminder, leadTimeDays: event.target.value })} />
                                <div className="space-y-2">
                                    <label className="mi-label">{t('Recurrence')}</label>
                                    <select className="mi-field" value={customReminder.recurrence} onChange={(event) => setCustomReminder({ ...customReminder, recurrence: event.target.value as Reminder['recurrence'] })}>
                                        <option value="none">{t('None')}</option>
                                        <option value="monthly">{t('Monthly')}</option>
                                        <option value="yearly">{t('Yearly')}</option>
                                        <option value="biennial">{t('Every 2 years')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button type="submit" className="h-11 flex-1" isLoading={saving}>{t('Save Reminder')}</Button>
                                <Button type="button" variant="outline" className="h-11" onClick={() => setIsCustomOpen(false)}>{t('Cancel')}</Button>
                            </div>
                        </form>
                    </AppSurface>
                </div>
            )}
        </Layout>
    );
};
