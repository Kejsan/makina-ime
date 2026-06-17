import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { AlertTriangle, Bell, CheckCircle2, Gauge, Info, Settings, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { buildMaintenanceInsights, getLatestServiceSnapshot } from '../lib/maintenance';
import type { MaintenanceInsight, ServiceRecord, Vehicle, WorkspaceOwnerType } from '../lib/types';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AppSurface, Panel, StatusPill } from './ui/design-system';

const statusTone = {
    ok: 'emerald',
    due_soon: 'amber',
    overdue: 'rose',
    setup_needed: 'blue',
} as const;

const statusIcon = {
    ok: CheckCircle2,
    due_soon: Bell,
    overdue: AlertTriangle,
    setup_needed: Settings,
};

const statusLabel = {
    ok: 'Looks good',
    due_soon: 'Due soon',
    overdue: 'Overdue',
    setup_needed: 'Setup needed',
};

const formatDate = (date?: Date | null) => date ? date.toLocaleDateString() : '-';

const insightDueDate = (insight: MaintenanceInsight) => {
    if (insight.dueDate) return insight.dueDate;
    if (insight.status === 'overdue' || insight.status === 'due_soon') return new Date();
    return null;
};

export const MaintenanceInsights = ({
    vehicle,
    ownerType = 'personal',
    ownerId,
    organizationId,
    editable = true,
    canCreateWorkOrder = false,
    onMessage,
}: {
    vehicle: Vehicle;
    ownerType?: WorkspaceOwnerType;
    ownerId?: string;
    organizationId?: string;
    editable?: boolean;
    canCreateWorkOrder?: boolean;
    onMessage?: (message: string) => void;
}) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [services, setServices] = useState<ServiceRecord[]>([]);
    const [loadError, setLoadError] = useState('');
    const [isEditingMileage, setIsEditingMileage] = useState(false);
    const [mileageValue, setMileageValue] = useState(vehicle.currentMileage ? String(vehicle.currentMileage) : '');
    const [savingMileage, setSavingMileage] = useState(false);
    const [actionId, setActionId] = useState('');

    useEffect(() => {
        setMileageValue(vehicle.currentMileage ? String(vehicle.currentMileage) : '');
    }, [vehicle.currentMileage]);

    useEffect(() => {
        if (!vehicle.id) return;
        const q = query(collection(db, 'vehicles', vehicle.id, 'services'), orderBy('date', 'desc'));
        return onSnapshot(q, (snapshot) => {
            setServices(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, vehicleId: vehicle.id, ...snapshotDoc.data() } as ServiceRecord)));
            setLoadError('');
        }, (error) => {
            console.error('Maintenance service listener failed', error);
            setLoadError(t('Maintenance history could not be loaded.'));
        });
    }, [t, vehicle.id]);

    const insights = useMemo(() => buildMaintenanceInsights(vehicle, services), [services, vehicle]);
    const latestService = useMemo(() => getLatestServiceSnapshot(services), [services]);
    const overdueCount = insights.filter((insight) => insight.status === 'overdue').length;
    const dueSoonCount = insights.filter((insight) => insight.status === 'due_soon').length;
    const setupCount = insights.filter((insight) => insight.status === 'setup_needed').length;

    const saveMileage = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !editable) return;
        setSavingMileage(true);
        try {
            await updateDoc(doc(db, 'vehicles', vehicle.id), {
                currentMileage: Number(mileageValue || 0),
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
            });
            setIsEditingMileage(false);
            onMessage?.(t('Mileage updated.'));
        } catch {
            onMessage?.(t('Mileage update failed. Please try again.'));
        } finally {
            setSavingMileage(false);
        }
    };

    const createReminder = async (insight: MaintenanceInsight) => {
        if (!user) return;
        const dueDate = insightDueDate(insight);
        if (!dueDate) return;
        setActionId(`reminder-${insight.id}`);
        try {
            await addDoc(collection(db, 'reminders'), {
                userId: user.uid,
                ownerType,
                ownerId: ownerId || user.uid,
                organizationId: organizationId || null,
                vehicleId: vehicle.id,
                type: 'maintenance',
                title: t(insight.titleKey),
                dueDate: Timestamp.fromDate(dueDate),
                leadTimeDays: insight.status === 'overdue' ? 0 : 14,
                recurrence: 'none',
                completed: false,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
            });
            onMessage?.(t('Maintenance reminder created.'));
        } catch {
            onMessage?.(t('Maintenance reminder could not be created.'));
        } finally {
            setActionId('');
        }
    };

    const createWorkOrder = async (insight: MaintenanceInsight) => {
        if (!user || !organizationId || !canCreateWorkOrder) return;
        const dueDate = insightDueDate(insight);
        setActionId(`work-order-${insight.id}`);
        try {
            await addDoc(collection(db, 'vehicles', vehicle.id, 'workOrders'), {
                vehicleId: vehicle.id,
                organizationId,
                title: t(insight.titleKey),
                type: 'maintenance',
                status: 'open',
                priority: insight.status === 'overdue' ? 'high' : insight.status === 'due_soon' ? 'medium' : 'low',
                dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
                cost: 0,
                mileage: insight.dueMileage || null,
                notes: t(insight.detailKey),
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
            });
            onMessage?.(t('Work order created from maintenance insight.'));
        } catch {
            onMessage?.(t('Work order could not be created.'));
        } finally {
            setActionId('');
        }
    };

    return (
        <div className="space-y-5">
            <AppSurface className="p-5">
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-xl border border-primary/25 bg-primary/10 p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="mi-label text-primary">{t('Current odometer')}</p>
                                <div className="mt-3 flex items-end gap-2">
                                    <span className="font-mono text-4xl font-extrabold tracking-tight text-foreground">
                                        {(vehicle.currentMileage || 0).toLocaleString()}
                                    </span>
                                    <span className="pb-1 text-sm font-bold text-muted-foreground">{t('km')}</span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {t('Used for maintenance suggestions, oil changes, tire rotation, brake checks, and service planning.')}
                                </p>
                            </div>
                            <Gauge className="h-8 w-8 shrink-0 text-primary" />
                        </div>

                        {editable && (
                            <div className="mt-4">
                                {isEditingMileage ? (
                                    <form onSubmit={saveMileage} className="flex flex-col gap-2 sm:flex-row">
                                        <Input
                                            type="number"
                                            min="0"
                                            value={mileageValue}
                                            onChange={(event) => setMileageValue(event.target.value)}
                                            className="h-10"
                                        />
                                        <Button type="submit" size="sm" isLoading={savingMileage}>{t('Save km')}</Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingMileage(false)}>{t('Cancel')}</Button>
                                    </form>
                                ) : (
                                    <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingMileage(true)}>
                                        <Gauge className="mr-2 h-4 w-4" />
                                        {t('Update km')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Panel className="p-4">
                            <p className="mi-label">{t('Latest service')}</p>
                            <p className="mt-2 break-words text-sm font-semibold">{latestService?.description || t('No service records yet')}</p>
                            <p className="mt-2 font-mono text-xs text-muted-foreground">
                                {latestService?.mileage ? `${latestService.mileage.toLocaleString()} ${t('km')}` : '-'} · {formatDate(latestService?.date)}
                            </p>
                        </Panel>
                        <Panel className="p-4">
                            <p className="mi-label">{t('Care status')}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <StatusPill tone={overdueCount > 0 ? 'rose' : 'emerald'}>{overdueCount} {t('Overdue')}</StatusPill>
                                <StatusPill tone={dueSoonCount > 0 ? 'amber' : 'emerald'}>{dueSoonCount} {t('Due soon')}</StatusPill>
                                <StatusPill tone={setupCount > 0 ? 'blue' : 'emerald'}>{setupCount} {t('Needs setup')}</StatusPill>
                            </div>
                        </Panel>
                    </div>
                </div>
            </AppSurface>

            <AppSurface className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                            <Wrench className="h-5 w-5 text-primary" />
                            {t('Care insights')}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('Suggestions use service history and configurable defaults. Always verify exact intervals in the owner manual.')}
                        </p>
                    </div>
                </div>

                {loadError && (
                    <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                        {loadError}
                    </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                    {insights.map((insight) => {
                        const Icon = statusIcon[insight.status];
                        const dueDate = insightDueDate(insight);
                        const canCreateReminder = Boolean(dueDate);

                        return (
                            <Panel key={insight.id} className={cn('flex flex-col gap-4 p-4', insight.status === 'overdue' && 'border-rose-500/40 bg-rose-500/5')}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-bold">{t(insight.titleKey)}</h3>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(insight.detailKey)}</p>
                                    </div>
                                    <StatusPill tone={statusTone[insight.status]}>
                                        <Icon className="h-3.5 w-3.5" />
                                        {t(statusLabel[insight.status])}
                                    </StatusPill>
                                </div>

                                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                    <span>{t('Due km')}: <strong className="font-mono text-foreground">{insight.dueMileage ? `${insight.dueMileage.toLocaleString()} ${t('km')}` : '-'}</strong></span>
                                    <span>{t('Due date')}: <strong className="font-mono text-foreground">{formatDate(insight.dueDate)}</strong></span>
                                    <span>{t('Remaining')}: <strong className="font-mono text-foreground">{insight.remainingKm !== undefined ? `${insight.remainingKm.toLocaleString()} ${t('km')}` : '-'}</strong></span>
                                    <span>{t('Confidence')}: <strong className="text-foreground">{t(insight.confidence)}</strong></span>
                                </div>

                                {insight.status === 'setup_needed' && (
                                    <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs leading-5 text-muted-foreground">
                                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                                        <span>{t('Add the latest completed service or custom interval to make this insight actionable.')}</span>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!canCreateReminder || actionId.length > 0}
                                        isLoading={actionId === `reminder-${insight.id}`}
                                        onClick={() => createReminder(insight)}
                                    >
                                        <Bell className="mr-2 h-4 w-4" />
                                        {t(insight.actionKey)}
                                    </Button>
                                    {canCreateWorkOrder && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={!canCreateReminder || actionId.length > 0}
                                            isLoading={actionId === `work-order-${insight.id}`}
                                            onClick={() => createWorkOrder(insight)}
                                        >
                                            <Wrench className="mr-2 h-4 w-4" />
                                            {t('Create work order')}
                                        </Button>
                                    )}
                                </div>
                            </Panel>
                        );
                    })}
                </div>
            </AppSurface>
        </div>
    );
};
