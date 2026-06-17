import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Bell, Car, ClipboardCheck, DollarSign, FileText, Pencil, Plus, UserRound, Wrench } from 'lucide-react';
import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AppSurface, EmptyState, PageHeader, Panel, StatusPill } from '../components/ui/design-system';
import { DocumentManager } from '../components/DocumentManager';
import { ExpenseTracker } from '../components/ExpenseTracker';
import { ReminderManager } from '../components/ReminderManager';
import { ServiceLog } from '../components/ServiceLog';
import { MaintenanceInsights } from '../components/MaintenanceInsights';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import {
    businessVehicleStatuses,
    canEditFleet,
    canSubmitDriverRecords,
    formatCurrency,
    getVehicleComplianceDeadlines,
    workOrderPriorities,
    workOrderStatuses,
} from '../lib/business';
import type {
    BusinessVehicleStatus,
    Organization,
    OrganizationMember,
    Vehicle,
    VehicleInspection,
    VehicleIssue,
    WorkOrder,
    WorkOrderPriority,
    WorkOrderStatus,
} from '../lib/types';

type BusinessVehicleTab = 'overview' | 'documents' | 'services' | 'expenses' | 'reminders' | 'inspections' | 'issues' | 'workOrders' | 'assignment';

const tabs: { id: BusinessVehicleTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Car },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'services', label: 'Services', icon: Wrench },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
    { id: 'issues', label: 'Issues', icon: AlertTriangle },
    { id: 'workOrders', label: 'Work orders', icon: Wrench },
    { id: 'assignment', label: 'Assignment', icon: UserRound },
];

const inspectionTemplate = [
    'Exterior lights',
    'Tires and pressure',
    'Brakes',
    'Oil / fluids',
    'Windshield and mirrors',
    'Registration document present',
    'Insurance document present',
    'Interior cleanliness',
];

const formatDateInput = (timestamp?: Timestamp | null) => timestamp?.toDate?.().toISOString().slice(0, 10) || '';

export const BusinessVehicleDetails = () => {
    const { orgId, id } = useParams<{ orgId: string; id: string }>();
    const { user } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [member, setMember] = useState<OrganizationMember | null>(null);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [inspections, setInspections] = useState<VehicleInspection[]>([]);
    const [issues, setIssues] = useState<VehicleIssue[]>([]);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [activeTab, setActiveTab] = useState<BusinessVehicleTab>('overview');
    const [quickAddToken, setQuickAddToken] = useState(0);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!orgId) return;
        return onSnapshot(doc(db, 'organizations', orgId), (snapshot) => {
            setOrganization(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Organization) : null);
        }, (error) => {
            console.error('Business vehicle organization listener failed', error);
            setMessage('Business workspace could not be loaded. Please check your workspace permissions.');
        });
    }, [orgId]);

    useEffect(() => {
        if (!orgId || !user) return;
        return onSnapshot(doc(db, 'organizationMembers', `${orgId}_${user.uid}`), (snapshot) => {
            setMember(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as OrganizationMember) : null);
            setLoading(false);
        }, (error) => {
            console.error('Business vehicle member listener failed', error);
            setMessage('Your business membership could not be loaded. Please check your workspace permissions.');
            setLoading(false);
        });
    }, [orgId, user]);

    useEffect(() => {
        if (!id) return;
        return onSnapshot(doc(db, 'vehicles', id), (snapshot) => {
            setVehicle(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Vehicle) : null);
        }, (error) => {
            console.error('Business vehicle listener failed', error);
            setMessage('Vehicle details could not be loaded. Please check your workspace permissions.');
        });
    }, [id]);

    useEffect(() => {
        if (!id || !member) return;
        const unsubscribes = [
            onSnapshot(collection(db, 'vehicles', id, 'inspections'), (snapshot) => {
                setInspections(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as VehicleInspection)));
            }, (error) => {
                console.error('Vehicle inspections listener failed', error);
                setMessage('Inspections could not be loaded. Please check your workspace permissions.');
            }),
            onSnapshot(collection(db, 'vehicles', id, 'issues'), (snapshot) => {
                setIssues(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as VehicleIssue)));
            }, (error) => {
                console.error('Vehicle issues listener failed', error);
                setMessage('Issues could not be loaded. Please check your workspace permissions.');
            }),
            onSnapshot(collection(db, 'vehicles', id, 'workOrders'), (snapshot) => {
                setWorkOrders(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as WorkOrder)));
            }, (error) => {
                console.error('Vehicle work orders listener failed', error);
                setMessage('Work orders could not be loaded. Please check your workspace permissions.');
            }),
        ];
        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [id, member]);

    useEffect(() => {
        const handleQuickAdd = () => {
            if (activeTab === 'overview' || activeTab === 'assignment') setActiveTab('expenses');
            setQuickAddToken((current) => current + 1);
        };

        window.addEventListener('makina-ime:quick-add', handleQuickAdd);
        return () => window.removeEventListener('makina-ime:quick-add', handleQuickAdd);
    }, [activeTab]);

    const editable = canEditFleet(member);
    const canSubmit = canSubmitDriverRecords(member);
    const currency = organization?.defaultCurrency || 'EUR';
    const openIssues = issues.filter((issue) => issue.status !== 'resolved');
    const latestInspection = useMemo(() => inspections.sort((left, right) => (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0))[0], [inspections]);

    if (!loading && !member) return <Navigate to="/business" replace />;
    if (!vehicle) {
        return (
            <Layout>
                <div className="flex h-[50vh] items-center justify-center">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
            </Layout>
        );
    }

    if (vehicle.ownerType !== 'organization' || vehicle.ownerId !== orgId) return <Navigate to={`/business/${orgId}`} replace />;

    return (
        <Layout>
            <div className="space-y-6">
                <Link to={`/business/${orgId}`}>
                    <Button variant="ghost" className="pl-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to business fleet
                    </Button>
                </Link>

                <PageHeader
                    eyebrow={organization?.name || 'Business vehicle'}
                    title={`${vehicle.make} ${vehicle.model}`}
                    description="Shared vehicle workspace for documents, service history, costs, inspections, issues, work orders, and assignment status."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <StatusPill tone="blue">{vehicle.plateNumber || 'No plate'}</StatusPill>
                            <StatusPill tone={vehicle.businessStatus === 'out_of_service' || vehicle.businessStatus === 'needs_attention' ? 'rose' : 'emerald'}>{vehicle.businessStatus || 'active'}</StatusPill>
                            {openIssues.length > 0 && <StatusPill tone="rose">{openIssues.length} issue{openIssues.length === 1 ? '' : 's'}</StatusPill>}
                        </div>
                    }
                />

                {message && <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{message}</div>}

                <div className="sticky top-16 z-20 -mx-4 border-y border-border/80 bg-background/95 px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
                    <div className="flex gap-2 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                        : 'border border-border bg-card/60 text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="space-y-5">
                        <MaintenanceInsights
                            vehicle={vehicle}
                            ownerType="organization"
                            ownerId={orgId}
                            organizationId={orgId}
                            editable={editable}
                            canCreateWorkOrder={editable}
                            onMessage={setMessage}
                        />

                        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                            <AppSurface className="p-6">
                                <h2 className="mb-5 text-lg font-bold">Business status</h2>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {[
                                        ['Make', vehicle.make],
                                        ['Model', vehicle.model],
                                        ['Year', vehicle.year],
                                        ['Plate', vehicle.plateNumber || 'N/A'],
                                        ['VIN', vehicle.vin || 'N/A'],
                                        ['Type', vehicle.vehicleType || 'N/A'],
                                        ['Assigned driver', vehicle.assignedDriverName || 'Unassigned'],
                                        ['Department', vehicle.department || 'N/A'],
                                        ['Latest inspection', latestInspection ? latestInspection.status : 'No inspection'],
                                    ].map(([label, value]) => (
                                        <Panel key={label} className="p-4">
                                            <p className="mi-label">{label}</p>
                                            <p className="mt-2 break-words font-semibold">{value}</p>
                                        </Panel>
                                    ))}
                                </div>
                            </AppSurface>

                            <AppSurface className="p-6">
                                <h2 className="mb-5 text-lg font-bold">Compliance dates</h2>
                                <div className="space-y-3">
                                    {getVehicleComplianceDeadlines(vehicle).length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No document dates have been added.</p>
                                    ) : (
                                        getVehicleComplianceDeadlines(vehicle).map((deadline) => (
                                            <Panel key={deadline.key} className="flex items-center justify-between gap-3 p-4">
                                                <span className="text-sm text-muted-foreground">{deadline.label}</span>
                                                <StatusPill tone={deadline.daysRemaining < 0 ? 'rose' : deadline.daysRemaining <= 30 ? 'amber' : 'emerald'}>
                                                    {deadline.daysRemaining < 0 ? 'Expired' : `${deadline.daysRemaining}d`}
                                                </StatusPill>
                                            </Panel>
                                        ))
                                    )}
                                </div>
                            </AppSurface>
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && <DocumentManager quickAddToken={quickAddToken} />}
                {activeTab === 'services' && <ServiceLog vehicleId={id!} quickAddToken={quickAddToken} vehicleCurrentMileage={vehicle.currentMileage || 0} />}
                {activeTab === 'expenses' && <ExpenseTracker vehicleId={id!} quickAddToken={quickAddToken} />}
                {activeTab === 'reminders' && <ReminderManager ownerType="organization" ownerId={orgId} organizationId={orgId} quickAddToken={quickAddToken} />}
                {activeTab === 'inspections' && <InspectionPanel orgId={orgId!} vehicleId={id!} member={member} vehicle={vehicle} inspections={inspections} canSubmit={canSubmit} />}
                {activeTab === 'issues' && <IssuesPanel orgId={orgId!} vehicleId={id!} issues={issues} editable={editable} />}
                {activeTab === 'workOrders' && <WorkOrdersPanel orgId={orgId!} vehicleId={id!} workOrders={workOrders} editable={editable} currency={currency} />}
                {activeTab === 'assignment' && <AssignmentPanel vehicle={vehicle} editable={editable} onSaved={() => setMessage('Assignment updated.')} />}
            </div>
        </Layout>
    );
};

const InspectionPanel = ({
    orgId,
    vehicleId,
    member,
    vehicle,
    inspections,
    canSubmit,
}: {
    orgId: string;
    vehicleId: string;
    member: OrganizationMember | null;
    vehicle: Vehicle;
    inspections: VehicleInspection[];
    canSubmit: boolean;
}) => {
    const { user } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [mileage, setMileage] = useState(vehicle.currentMileage ? String(vehicle.currentMileage) : '');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState(inspectionTemplate.map((label, index) => ({ id: `item-${index}`, label, passed: true, notes: '' })));

    const submitInspection = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !member) return;

        const failedItems = items.filter((item) => !item.passed);
        const inspectionRef = doc(collection(db, 'vehicles', vehicleId, 'inspections'));
        const batch = writeBatch(db);
        const issueIds: string[] = [];

        failedItems.forEach((item) => {
            const issueRef = doc(collection(db, 'vehicles', vehicleId, 'issues'));
            const workOrderRef = doc(collection(db, 'vehicles', vehicleId, 'workOrders'));
            issueIds.push(issueRef.id);
            batch.set(issueRef, {
                vehicleId,
                organizationId: orgId,
                title: item.label,
                description: item.notes || `Failed inspection item on ${vehicle.make} ${vehicle.model}`,
                status: 'open',
                priority: 'medium',
                sourceType: 'inspection',
                sourceId: inspectionRef.id,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
            });
            batch.set(workOrderRef, {
                vehicleId,
                organizationId: orgId,
                title: `Fix: ${item.label}`,
                type: 'inspection_failure',
                status: 'open',
                priority: 'medium',
                dueDate: null,
                cost: 0,
                notes: item.notes || null,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
            });
        });

        batch.set(inspectionRef, {
            vehicleId,
            organizationId: orgId,
            templateName: 'Daily readiness',
            status: failedItems.length > 0 ? 'failed' : 'passed',
            mileage: mileage ? Number(mileage) : null,
            inspectedBy: user.uid,
            inspectedByEmail: user.email || null,
            inspectedAt: serverTimestamp(),
            items,
            notes: notes.trim() || null,
            issueIds,
            createdAt: serverTimestamp(),
        });

        const inspectionMileage = mileage ? Number(mileage) : 0;
        const vehicleUpdates: Record<string, unknown> = {};
        if (failedItems.length > 0) {
            Object.assign(vehicleUpdates, {
                businessStatus: 'needs_attention',
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
            });
        }
        if (inspectionMileage > (vehicle.currentMileage || 0) && confirm('Update the vehicle odometer to this inspection mileage?')) {
            Object.assign(vehicleUpdates, {
                currentMileage: inspectionMileage,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
            });
        }
        if (Object.keys(vehicleUpdates).length > 0) {
            batch.update(doc(db, 'vehicles', vehicleId), vehicleUpdates);
        }

        await batch.commit();
        setIsAdding(false);
        setNotes('');
        setItems(inspectionTemplate.map((label, index) => ({ id: `item-${index}`, label, passed: true, notes: '' })));
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Inspection checklists</h2>
                {canSubmit && <Button variant="outline" onClick={() => setIsAdding(!isAdding)}><Plus className="mr-2 h-4 w-4" />New inspection</Button>}
            </div>

            {isAdding && (
                <AppSurface className="p-5">
                    <form onSubmit={submitInspection} className="space-y-4">
                        <Input label="Mileage" type="number" value={mileage} onChange={(event) => setMileage(event.target.value)} />
                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <Panel key={item.id} className="grid gap-3 p-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                                    <p className="font-semibold">{item.label}</p>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={item.passed} onChange={(event) => {
                                            const next = [...items];
                                            next[index] = { ...item, passed: event.target.checked };
                                            setItems(next);
                                        }} className="h-4 w-4 accent-primary" />
                                        Pass
                                    </label>
                                    <Input placeholder="Notes if failed" value={item.notes} onChange={(event) => {
                                        const next = [...items];
                                        next[index] = { ...item, notes: event.target.value };
                                        setItems(next);
                                    }} />
                                </Panel>
                            ))}
                        </div>
                        <Input label="Inspection notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="submit" className="h-11 flex-1">Submit inspection</Button>
                            <Button type="button" variant="outline" className="h-11" onClick={() => setIsAdding(false)}>Cancel</Button>
                        </div>
                    </form>
                </AppSurface>
            )}

            {inspections.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="No inspections yet" description="Drivers or managers can submit readiness checks. Failed items create issues and work orders." />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {inspections.map((inspection) => (
                        <AppSurface key={inspection.id} className="p-5">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-bold">{inspection.templateName}</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">{inspection.inspectedAt?.toDate?.().toLocaleString() || 'Just now'}</p>
                                </div>
                                <StatusPill tone={inspection.status === 'passed' ? 'emerald' : 'rose'}>{inspection.status}</StatusPill>
                            </div>
                            <p className="text-sm text-muted-foreground">{inspection.items.filter((item) => !item.passed).length} failed item(s)</p>
                        </AppSurface>
                    ))}
                </div>
            )}
        </div>
    );
};

const IssuesPanel = ({ orgId, vehicleId, issues, editable }: { orgId: string; vehicleId: string; issues: VehicleIssue[]; editable: boolean }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState<WorkOrderPriority>('medium');

    const createIssue = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !editable) return;
        await addDoc(collection(db, 'vehicles', vehicleId, 'issues'), {
            vehicleId,
            organizationId: orgId,
            title: title.trim(),
            status: 'open',
            priority,
            sourceType: 'manual',
            createdAt: serverTimestamp(),
            createdBy: user.uid,
        });
        setTitle('');
        setPriority('medium');
    };

    const resolveIssue = async (issueId: string) => {
        if (!user || !editable) return;
        await updateDoc(doc(db, 'vehicles', vehicleId, 'issues', issueId), {
            status: 'resolved',
            resolvedAt: serverTimestamp(),
        });
    };

    return (
        <div className="space-y-5">
            {editable && (
                <AppSurface className="p-5">
                    <form onSubmit={createIssue} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                        <Input placeholder="Issue title" value={title} onChange={(event) => setTitle(event.target.value)} required />
                        <select className="mi-field" value={priority} onChange={(event) => setPriority(event.target.value as WorkOrderPriority)}>
                            {workOrderPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                        <Button type="submit">Add issue</Button>
                    </form>
                </AppSurface>
            )}
            {issues.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No issues" description="Inspection failures and manually reported problems appear here." />
            ) : (
                <div className="space-y-3">
                    {issues.map((issue) => (
                        <AppSurface key={issue.id} className="flex items-center justify-between gap-3 p-4">
                            <div>
                                <h3 className="font-bold">{issue.title}</h3>
                                <p className="mt-1 text-xs text-muted-foreground">{issue.sourceType} · {issue.priority}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <StatusPill tone={issue.status === 'resolved' ? 'emerald' : 'rose'}>{issue.status}</StatusPill>
                                {editable && issue.status !== 'resolved' && <Button size="sm" variant="outline" onClick={() => resolveIssue(issue.id)}>Resolve</Button>}
                            </div>
                        </AppSurface>
                    ))}
                </div>
            )}
        </div>
    );
};

const WorkOrdersPanel = ({ orgId, vehicleId, workOrders, editable, currency }: { orgId: string; vehicleId: string; workOrders: WorkOrder[]; editable: boolean; currency: string }) => {
    const { user } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState({
        title: '',
        type: 'maintenance',
        priority: 'medium',
        status: 'open',
        dueDate: '',
        cost: '',
        notes: '',
    });

    const createWorkOrder = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !editable) return;
        await addDoc(collection(db, 'vehicles', vehicleId, 'workOrders'), {
            vehicleId,
            organizationId: orgId,
            title: form.title.trim(),
            type: form.type,
            priority: form.priority,
            status: form.status,
            dueDate: form.dueDate ? Timestamp.fromDate(new Date(form.dueDate)) : null,
            cost: form.cost ? Number(form.cost) : 0,
            notes: form.notes.trim() || null,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        });
        setForm({ title: '', type: 'maintenance', priority: 'medium', status: 'open', dueDate: '', cost: '', notes: '' });
        setIsAdding(false);
    };

    const updateStatus = async (workOrder: WorkOrder, status: WorkOrderStatus) => {
        if (!user || !editable) return;
        await updateDoc(doc(db, 'vehicles', vehicleId, 'workOrders', workOrder.id), {
            status,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        });
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Work orders</h2>
                {editable && <Button variant="outline" onClick={() => setIsAdding(!isAdding)}><Plus className="mr-2 h-4 w-4" />New work order</Button>}
            </div>
            {isAdding && (
                <AppSurface className="p-5">
                    <form onSubmit={createWorkOrder} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Input label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
                            <select className="mi-field" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                                <option value="maintenance">Maintenance</option>
                                <option value="repair">Repair</option>
                                <option value="inspection_failure">Inspection failure</option>
                                <option value="document_renewal">Document renewal</option>
                                <option value="body_reconditioning">Body / reconditioning</option>
                                <option value="other">Other</option>
                            </select>
                            <select className="mi-field" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                                {workOrderPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                            <select className="mi-field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                                {workOrderStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                            <Input label="Due date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
                            <Input label="Cost" type="number" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} />
                        </div>
                        <Input label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
                        <Button type="submit">Save work order</Button>
                    </form>
                </AppSurface>
            )}
            {workOrders.length === 0 ? (
                <EmptyState icon={Wrench} title="No work orders" description="Track maintenance, repairs, document renewals, and inspection failures." />
            ) : (
                <div className="space-y-3">
                    {workOrders.map((workOrder) => (
                        <AppSurface key={workOrder.id} className="p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 className="font-bold">{workOrder.title}</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">{workOrder.type} · {workOrder.priority} · {formatCurrency(workOrder.cost || 0, currency)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusPill tone={workOrder.status === 'completed' ? 'emerald' : workOrder.priority === 'critical' ? 'rose' : 'amber'}>{workOrder.status}</StatusPill>
                                    {editable && (
                                        <select className="mi-field h-9 w-40" value={workOrder.status} onChange={(event) => updateStatus(workOrder, event.target.value as WorkOrderStatus)}>
                                            {workOrderStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </AppSurface>
                    ))}
                </div>
            )}
        </div>
    );
};

const AssignmentPanel = ({ vehicle, editable, onSaved }: { vehicle: Vehicle; editable: boolean; onSaved: () => void }) => {
    const { user } = useAuth();
    const [form, setForm] = useState({
        businessStatus: (vehicle.businessStatus || 'active') as BusinessVehicleStatus,
        assignedDriverName: vehicle.assignedDriverName || '',
        department: vehicle.department || '',
        location: vehicle.location || '',
        currentMileage: vehicle.currentMileage ? String(vehicle.currentMileage) : '',
        registrationExpiry: formatDateInput(vehicle.registrationExpiry),
        tplInsuranceExpiry: formatDateInput(vehicle.tplInsuranceExpiry),
        technicalInspectionExpiry: formatDateInput(vehicle.technicalInspectionExpiry),
        roadTaxExpiry: formatDateInput(vehicle.roadTaxExpiry),
    });

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !editable) return;
        await updateDoc(doc(db, 'vehicles', vehicle.id), {
            businessStatus: form.businessStatus,
            assignedDriverName: form.assignedDriverName.trim() || null,
            department: form.department.trim() || null,
            location: form.location.trim() || null,
            currentMileage: form.currentMileage ? Number(form.currentMileage) : 0,
            registrationExpiry: form.registrationExpiry ? Timestamp.fromDate(new Date(form.registrationExpiry)) : null,
            tplInsuranceExpiry: form.tplInsuranceExpiry ? Timestamp.fromDate(new Date(form.tplInsuranceExpiry)) : null,
            technicalInspectionExpiry: form.technicalInspectionExpiry ? Timestamp.fromDate(new Date(form.technicalInspectionExpiry)) : null,
            roadTaxExpiry: form.roadTaxExpiry ? Timestamp.fromDate(new Date(form.roadTaxExpiry)) : null,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        });
        onSaved();
    };

    return (
        <AppSurface className="p-6">
            <form onSubmit={save} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="mi-label">Lifecycle status</label>
                        <select className="mi-field" value={form.businessStatus} onChange={(event) => setForm({ ...form, businessStatus: event.target.value as BusinessVehicleStatus })} disabled={!editable}>
                            {businessVehicleStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                    </div>
                    <Input label="Assigned driver" value={form.assignedDriverName} onChange={(event) => setForm({ ...form, assignedDriverName: event.target.value })} disabled={!editable} />
                    <Input label="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} disabled={!editable} />
                    <Input label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} disabled={!editable} />
                    <Input label="Current mileage" type="number" value={form.currentMileage} onChange={(event) => setForm({ ...form, currentMileage: event.target.value })} disabled={!editable} />
                    <Input label="Registration expiry" type="date" value={form.registrationExpiry} onChange={(event) => setForm({ ...form, registrationExpiry: event.target.value })} disabled={!editable} />
                    <Input label="TPL insurance expiry" type="date" value={form.tplInsuranceExpiry} onChange={(event) => setForm({ ...form, tplInsuranceExpiry: event.target.value })} disabled={!editable} />
                    <Input label="Technical inspection expiry" type="date" value={form.technicalInspectionExpiry} onChange={(event) => setForm({ ...form, technicalInspectionExpiry: event.target.value })} disabled={!editable} />
                    <Input label="Road tax expiry" type="date" value={form.roadTaxExpiry} onChange={(event) => setForm({ ...form, roadTaxExpiry: event.target.value })} disabled={!editable} />
                </div>
                {editable && <Button type="submit"><Pencil className="mr-2 h-4 w-4" />Save assignment</Button>}
            </form>
        </AppSurface>
    );
};
