import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Bell, CalendarDays, Filter, Wrench } from 'lucide-react';
import { Layout } from '../components/ui/Layout';
import { AppSurface, EmptyState, PageHeader, Panel, StatusPill } from '../components/ui/design-system';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import type { Reminder, Vehicle } from '../lib/types';

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfDay = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const daysUntil = (date: Date) => Math.ceil((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / (1000 * 60 * 60 * 24));

export const CalendarPage = () => {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [vehicleFilter, setVehicleFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [view, setView] = useState<'list' | 'month'>('list');
    const today = useMemo(() => new Date(), []);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(query(collection(db, 'vehicles'), where('userId', '==', user.uid)), (snapshot) => {
            setVehicles(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Vehicle)));
        });
        return unsubscribe;
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(query(collection(db, 'reminders'), where('userId', '==', user.uid)), (snapshot) => {
            setReminders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Reminder)));
        });
        return unsubscribe;
    }, [user]);

    const vehicleName = (vehicleId: string) => {
        const vehicle = vehicles.find((item) => item.id === vehicleId);
        return vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle';
    };

    const filteredReminders = useMemo(() => reminders
        .filter((reminder) => !reminder.completed && reminder.dueDate?.toDate)
        .filter((reminder) => vehicleFilter === 'all' || reminder.vehicleId === vehicleFilter)
        .filter((reminder) => typeFilter === 'all' || reminder.type === typeFilter)
        .sort((left, right) => left.dueDate.toMillis() - right.dueDate.toMillis()), [reminders, vehicleFilter, typeFilter]);

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

    return (
        <Layout>
            <div className="space-y-6">
                <PageHeader
                    eyebrow="Kalendari"
                    title="Reminder Calendar"
                    description="Track legal deadlines, service care, and custom reminders across every vehicle."
                    actions={
                        <div className="flex rounded-xl border border-border bg-card p-1">
                            {(['list', 'month'] as const).map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setView(item)}
                                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${view === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {item === 'list' ? 'List' : 'Month'}
                                </button>
                            ))}
                        </div>
                    }
                />

                <AppSurface className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Filter className="h-4 w-4 text-primary" />
                            Filters
                        </div>
                        <select className="mi-field md:max-w-xs" value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)}>
                            <option value="all">All vehicles</option>
                            {vehicles.map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model}</option>
                            ))}
                        </select>
                        <select className="mi-field md:max-w-xs" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                            <option value="all">All types</option>
                            <option value="insurance">Insurance</option>
                            <option value="tax">Road tax</option>
                            <option value="inspection">Inspection</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </AppSurface>

                {filteredReminders.length === 0 ? (
                    <EmptyState icon={CalendarDays} title="No reminders found" description="Create reminders from a vehicle profile or document expiry to populate the calendar." />
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
                                            {due.toLocaleDateString()} · {reminder.leadTimeDays} day lead · {reminder.recurrence}
                                        </p>
                                    </div>
                                    <StatusPill tone={tone}>{daysLeft < 0 ? 'Expired' : `${daysLeft} days`}</StatusPill>
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
        </Layout>
    );
};
