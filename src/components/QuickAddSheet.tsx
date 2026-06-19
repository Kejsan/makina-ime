import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    Building2,
    Car,
    ClipboardCheck,
    DollarSign,
    FileText,
    Fuel,
    Gauge,
    UserRoundPlus,
    Wrench,
    X,
    Bell,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import type { QuickAddAction, QuickAddActionId, Vehicle } from '../lib/types';
import { Modal } from './ui/Modal';

const personalActions: QuickAddAction[] = [
    { id: 'vehicle', label: 'Vehicle', group: 'vehicle', requiresVehicle: false, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'mileage', label: 'Mileage update', group: 'vehicle', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'expense', label: 'Expense', group: 'vehicle', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'service', label: 'Service', group: 'maintenance', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'document', label: 'Document', group: 'maintenance', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'reminder', label: 'Reminder / task', group: 'maintenance', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
];

const businessActions: QuickAddAction[] = [
    { id: 'vehicle', label: 'Vehicle', group: 'vehicle', requiresVehicle: false, minimumCapability: 'canEditAllRecords' },
    { id: 'mileage', label: 'Mileage update', group: 'vehicle', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'expense', label: 'Expense', group: 'vehicle', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'fuel', label: 'Fuel log', group: 'vehicle', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'service', label: 'Service', group: 'maintenance', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'document', label: 'Document', group: 'maintenance', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'reminder', label: 'Reminder', group: 'maintenance', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'inspection', label: 'Inspection', group: 'maintenance', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'issue', label: 'Issue', group: 'maintenance', requiresVehicle: true, minimumCapability: 'canCreateOperationalRecords' },
    { id: 'workOrder', label: 'Work order', group: 'business', requiresVehicle: true, minimumCapability: 'canEditAllRecords' },
    { id: 'driver', label: 'Driver', group: 'business', requiresVehicle: false, minimumCapability: 'canEditAllRecords' },
    { id: 'vendor', label: 'Vendor', group: 'business', requiresVehicle: false, minimumCapability: 'canEditAllRecords' },
];

const icons: Record<QuickAddActionId, typeof Car> = {
    vehicle: Car,
    mileage: Gauge,
    expense: DollarSign,
    fuel: Fuel,
    service: Wrench,
    document: FileText,
    reminder: Bell,
    inspection: ClipboardCheck,
    issue: AlertTriangle,
    workOrder: Wrench,
    driver: UserRoundPlus,
    vendor: Building2,
};

const groupLabels = {
    vehicle: 'Vehicle records',
    maintenance: 'Maintenance',
    business: 'Business operations',
};

export const QuickAddSheet = () => {
    const { user } = useAuth();
    const { workspaceType, organizationId, capabilities } = useWorkspace();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [pendingAction, setPendingAction] = useState<QuickAddAction | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const open = searchParams.get('add') === 'choose';
    const routeVehicleId = location.pathname.match(/\/vehicles\/([^/]+)/)?.[1] || '';

    useEffect(() => {
        if (!open || !user) return;
        const vehiclesQuery = workspaceType === 'business' && organizationId
            ? query(collection(db, 'vehicles'), where('ownerType', '==', 'organization'), where('ownerId', '==', organizationId))
            : query(collection(db, 'vehicles'), where('userId', '==', user.uid));
        return onSnapshot(vehiclesQuery, (snapshot) => {
            const next = snapshot.docs
                .map((item) => ({ id: item.id, ...item.data() }) as Vehicle)
                .filter((vehicle) => workspaceType === 'business' ? vehicle.ownerType === 'organization' : vehicle.ownerType !== 'organization');
            setVehicles(next);
            if (!selectedVehicleId && next.length === 1) setSelectedVehicleId(next[0].id);
        });
    }, [open, organizationId, selectedVehicleId, user, workspaceType]);

    const actions = workspaceType === 'business' ? businessActions : personalActions;
    const visibleActions = useMemo(() => actions.filter((action) => capabilities[action.minimumCapability]), [actions, capabilities]);

    const close = () => {
        setPendingAction(null);
        setSelectedVehicleId('');
        navigate(-1);
    };

    const execute = (action: QuickAddAction, vehicleId = routeVehicleId || selectedVehicleId) => {
        if (action.requiresVehicle && !vehicleId) {
            setPendingAction(action);
            return;
        }
        const params = new URLSearchParams();
        params.set('add', action.id);
        if (vehicleId) params.set('vehicle', vehicleId);
        if (action.requiresVehicle) {
            const path = workspaceType === 'business'
                ? `/business/${organizationId}/vehicles/${vehicleId}`
                : `/personal/vehicles/${vehicleId}`;
            navigate(`${path}?${params.toString()}`, { replace: true });
            return;
        }
        const path = workspaceType === 'business' ? (organizationId ? `/business/${organizationId}` : '/business') : '/personal';
        navigate(`${path}?${params.toString()}`, { replace: true });
    };

    if (!open) return null;

    return (
        <Modal onClose={close} titleId="quick-add-title" className="mt-auto max-w-lg rounded-b-none p-0 sm:my-auto sm:rounded-2xl">
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border sm:hidden" />
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div>
                    <p className="mi-label text-primary">{workspaceType === 'business' ? 'Business workspace' : 'Personal garage'}</p>
                    <h2 id="quick-add-title" className="mt-1 text-xl font-bold">{pendingAction ? `Choose vehicle for ${pendingAction.label}` : 'What would you like to add?'}</h2>
                </div>
                <button type="button" onClick={close} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent" aria-label="Close">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {pendingAction ? (
                <div className="space-y-4 p-5">
                    {vehicles.length === 0 ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                            Add a vehicle before creating this record.
                        </div>
                    ) : (
                        <>
                            <label className="space-y-2">
                                <span className="mi-label">Vehicle</span>
                                <select className="mi-field" value={selectedVehicleId} onChange={(event) => setSelectedVehicleId(event.target.value)}>
                                    <option value="">Choose a vehicle</option>
                                    {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.plateNumber || vehicle.year}</option>)}
                                </select>
                            </label>
                            <button type="button" disabled={!selectedVehicleId} onClick={() => execute(pendingAction)} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
                                Continue
                            </button>
                        </>
                    )}
                    <button type="button" onClick={() => setPendingAction(null)} className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold">Back to actions</button>
                </div>
            ) : (
                <div className="max-h-[min(68dvh,36rem)] overflow-y-auto p-5">
                    {(['vehicle', 'maintenance', 'business'] as const).map((group) => {
                        const grouped = visibleActions.filter((action) => action.group === group);
                        if (grouped.length === 0) return null;
                        return (
                            <section key={group} className="mb-5 last:mb-0">
                                <h3 className="mi-label mb-2">{groupLabels[group]}</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {grouped.map((action) => {
                                        const Icon = icons[action.id];
                                        const unavailable = action.requiresVehicle && !routeVehicleId && vehicles.length === 0;
                                        return (
                                            <button key={action.id} type="button" onClick={() => unavailable ? setPendingAction(action) : execute(action)} className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-background/60 p-3 text-left hover:border-primary/40 hover:bg-accent">
                                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                                                <span className="text-sm font-semibold">{action.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
};
