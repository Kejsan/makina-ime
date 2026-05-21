import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
    AlertTriangle,
    BarChart3,
    Building2,
    Car,
    ClipboardCheck,
    CreditCard,
    Download,
    FileUp,
    Filter,
    Plus,
    ShieldCheck,
    UserPlus,
    Users,
    Wrench,
} from 'lucide-react';
import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    where,
} from 'firebase/firestore';
import { Layout } from '../components/ui/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AppSurface, EmptyState, MetricCard, PageHeader, Panel, StatusPill } from '../components/ui/design-system';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import {
    businessVehicleStatuses,
    canEditFleet,
    canManageMembers,
    csvEscape,
    downloadTextFile,
    formatCurrency,
    getVehicleComplianceDeadlines,
    getVehicleComplianceState,
    organizationRoles,
    parseSimpleCsv,
} from '../lib/business';
import type {
    BusinessVendor,
    ExpenseRecord,
    Organization,
    OrganizationMember,
    OrganizationRole,
    Vehicle,
    VehicleIssue,
    WorkOrder,
} from '../lib/types';

const statusTone = (status?: string) => {
    if (status === 'out_of_service' || status === 'needs_attention') return 'rose';
    if (status === 'in_service' || status === 'reserved') return 'amber';
    if (status === 'sold' || status === 'archived') return 'slate';
    return 'emerald';
};

const complianceTone = (state: string) => {
    if (state === 'expired' || state === 'attention') return 'rose';
    if (state === 'due_soon') return 'amber';
    return 'emerald';
};

export const BusinessDashboard = () => {
    const { orgId } = useParams<{ orgId: string }>();
    const { user } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [member, setMember] = useState<OrganizationMember | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [expensesByVehicle, setExpensesByVehicle] = useState<Record<string, ExpenseRecord[]>>({});
    const [issuesByVehicle, setIssuesByVehicle] = useState<Record<string, VehicleIssue[]>>({});
    const [workOrdersByVehicle, setWorkOrdersByVehicle] = useState<Record<string, WorkOrder[]>>({});
    const [vendors, setVendors] = useState<BusinessVendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isVendorOpen, setIsVendorOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [vehicleForm, setVehicleForm] = useState({
        make: '',
        model: '',
        year: '',
        plateNumber: '',
        vin: '',
        vehicleType: 'car',
        businessStatus: 'active',
        assignedDriverName: '',
        department: '',
        currentMileage: '',
        registrationExpiry: '',
        tplInsuranceExpiry: '',
        technicalInspectionExpiry: '',
        roadTaxExpiry: '',
        tintedGlassCertificateExpiry: '',
    });
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<OrganizationRole>('manager');
    const [vendorForm, setVendorForm] = useState({
        name: '',
        category: 'workshop',
        phone: '',
        email: '',
        notes: '',
    });

    useEffect(() => {
        if (!orgId) return;
        return onSnapshot(doc(db, 'organizations', orgId), (snapshot) => {
            setOrganization(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Organization) : null);
        }, (error) => {
            console.error('Business organization listener failed', error);
            setMessage('Business workspace could not be loaded. Please check your workspace permissions.');
        });
    }, [orgId]);

    useEffect(() => {
        if (!orgId || !user) return;
        return onSnapshot(doc(db, 'organizationMembers', `${orgId}_${user.uid}`), (snapshot) => {
            setMember(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as OrganizationMember) : null);
            setLoading(false);
        }, (error) => {
            console.error('Business member listener failed', error);
            setMessage('Your business membership could not be loaded. Please check your workspace permissions.');
            setLoading(false);
        });
    }, [orgId, user]);

    useEffect(() => {
        if (!orgId || !member) return;
        const q = query(collection(db, 'organizationMembers'), where('organizationId', '==', orgId), where('status', '==', 'active'));
        return onSnapshot(q, (snapshot) => {
            setMembers(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as OrganizationMember)));
        }, (error) => {
            console.error('Business members listener failed', error);
            setMessage('Team members could not be loaded. Please check your workspace permissions.');
        });
    }, [orgId, member]);

    useEffect(() => {
        if (!orgId || !member) return;
        const q = query(collection(db, 'vehicles'), where('ownerType', '==', 'organization'), where('ownerId', '==', orgId));
        return onSnapshot(q, (snapshot) => {
            setVehicles(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as Vehicle)));
        }, (error) => {
            console.error('Business vehicles listener failed', error);
            setMessage('Fleet vehicles could not be loaded. Please check your workspace permissions.');
        });
    }, [orgId, member]);

    useEffect(() => {
        if (!orgId || !member) return;
        const q = query(collection(db, 'organizations', orgId, 'vendors'));
        return onSnapshot(q, (snapshot) => {
            setVendors(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as BusinessVendor)));
        }, (error) => {
            console.error('Business vendors listener failed', error);
            setMessage('Vendors could not be loaded. Please check your workspace permissions.');
        });
    }, [orgId, member]);

    useEffect(() => {
        if (!member || vehicles.length === 0) {
            return;
        }

        const unsubscribes = vehicles.flatMap((vehicle) => [
            onSnapshot(collection(db, 'vehicles', vehicle.id, 'expenses'), (snapshot) => {
                setExpensesByVehicle((previous) => ({
                    ...previous,
                    [vehicle.id]: snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, vehicleId: vehicle.id, ...snapshotDoc.data() } as ExpenseRecord)),
                }));
            }, (error) => {
                console.error('Fleet expense listener failed', error);
                setMessage('Fleet expenses could not be loaded. Please check your workspace permissions.');
            }),
            onSnapshot(collection(db, 'vehicles', vehicle.id, 'issues'), (snapshot) => {
                setIssuesByVehicle((previous) => ({
                    ...previous,
                    [vehicle.id]: snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as VehicleIssue)),
                }));
            }, (error) => {
                console.error('Fleet issue listener failed', error);
            }),
            onSnapshot(collection(db, 'vehicles', vehicle.id, 'workOrders'), (snapshot) => {
                setWorkOrdersByVehicle((previous) => ({
                    ...previous,
                    [vehicle.id]: snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as WorkOrder)),
                }));
            }, (error) => {
                console.error('Fleet work order listener failed', error);
            }),
        ]);

        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [member, vehicles]);

    const editable = canEditFleet(member);
    const canInvite = canManageMembers(member);
    const currency = organization?.defaultCurrency || 'EUR';

    const allExpenses = useMemo(() => vehicles.flatMap((vehicle) => expensesByVehicle[vehicle.id] || []), [vehicles, expensesByVehicle]);
    const openIssues = useMemo(() => vehicles.flatMap((vehicle) => (issuesByVehicle[vehicle.id] || []).filter((issue) => issue.status !== 'resolved')), [vehicles, issuesByVehicle]);
    const openWorkOrders = useMemo(() => vehicles.flatMap((vehicle) => (workOrdersByVehicle[vehicle.id] || []).filter((workOrder) => !['completed', 'cancelled'].includes(workOrder.status))), [vehicles, workOrdersByVehicle]);
    const totalSpend = useMemo(() => allExpenses.reduce((total, expense) => total + (expense.amount || 0), 0), [allExpenses]);
    const monthlySpend = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return allExpenses
            .filter((expense) => expense.date?.toDate && expense.date.toDate() >= monthStart)
            .reduce((total, expense) => total + (expense.amount || 0), 0);
    }, [allExpenses]);

    const unavailableCount = vehicles.filter((vehicle) => ['in_service', 'needs_attention', 'out_of_service'].includes(vehicle.businessStatus || '')).length;
    const complianceStates = vehicles.map(getVehicleComplianceState);
    const healthyCount = complianceStates.filter((state) => state === 'healthy').length;
    const complianceScore = vehicles.length === 0 ? 100 : Math.round((healthyCount / vehicles.length) * 100);
    const upcomingDeadlines = vehicles
        .flatMap((vehicle) => getVehicleComplianceDeadlines(vehicle).map((deadline) => ({
            ...deadline,
            vehicleName: `${vehicle.make} ${vehicle.model}`,
            plateNumber: vehicle.plateNumber || 'No plate',
        })))
        .sort((left, right) => left.daysRemaining - right.daysRemaining)
        .slice(0, 8);

    const filteredVehicles = vehicles.filter((vehicle) => filter === 'all' || vehicle.businessStatus === filter);

    const createVehicle = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!orgId || !user || !editable) return;

        await addDoc(collection(db, 'vehicles'), {
            userId: user.uid,
            ownerType: 'organization',
            ownerId: orgId,
            organizationId: orgId,
            make: vehicleForm.make.trim(),
            model: vehicleForm.model.trim(),
            year: parseInt(vehicleForm.year),
            plateNumber: vehicleForm.plateNumber.trim().toUpperCase(),
            vin: vehicleForm.vin.trim().toUpperCase(),
            vehicleType: vehicleForm.vehicleType,
            businessStatus: vehicleForm.businessStatus,
            assignedDriverName: vehicleForm.assignedDriverName.trim() || null,
            department: vehicleForm.department.trim() || null,
            currentMileage: vehicleForm.currentMileage ? parseInt(vehicleForm.currentMileage) : 0,
            registrationExpiry: vehicleForm.registrationExpiry ? Timestamp.fromDate(new Date(vehicleForm.registrationExpiry)) : null,
            tplInsuranceExpiry: vehicleForm.tplInsuranceExpiry ? Timestamp.fromDate(new Date(vehicleForm.tplInsuranceExpiry)) : null,
            technicalInspectionExpiry: vehicleForm.technicalInspectionExpiry ? Timestamp.fromDate(new Date(vehicleForm.technicalInspectionExpiry)) : null,
            roadTaxExpiry: vehicleForm.roadTaxExpiry ? Timestamp.fromDate(new Date(vehicleForm.roadTaxExpiry)) : null,
            tintedGlassCertificateExpiry: vehicleForm.tintedGlassCertificateExpiry ? Timestamp.fromDate(new Date(vehicleForm.tintedGlassCertificateExpiry)) : null,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        });

        setVehicleForm({
            make: '',
            model: '',
            year: '',
            plateNumber: '',
            vin: '',
            vehicleType: 'car',
            businessStatus: 'active',
            assignedDriverName: '',
            department: '',
            currentMileage: '',
            registrationExpiry: '',
            tplInsuranceExpiry: '',
            technicalInspectionExpiry: '',
            roadTaxExpiry: '',
            tintedGlassCertificateExpiry: '',
        });
        setIsVehicleModalOpen(false);
    };

    const sendInvite = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!orgId || !user || !organization || !canInvite) return;

        const email = inviteEmail.trim().toLowerCase();
        await setDoc(doc(db, 'organizationInvites', `${orgId}_${email.replace(/\//g, '_')}`), {
            organizationId: orgId,
            organizationName: organization.name,
            email,
            role: inviteRole,
            status: 'pending',
            createdAt: serverTimestamp(),
            createdBy: user.uid,
        });
        setInviteEmail('');
        setInviteRole('manager');
        setIsInviteOpen(false);
        setMessage('Invitation created. The user can accept it from Business workspaces after signing in with that email.');
    };

    const createVendor = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!orgId || !user || !editable) return;

        await addDoc(collection(db, 'organizations', orgId, 'vendors'), {
            organizationId: orgId,
            name: vendorForm.name.trim(),
            category: vendorForm.category,
            phone: vendorForm.phone.trim() || null,
            email: vendorForm.email.trim() || null,
            notes: vendorForm.notes.trim() || null,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
        });
        setVendorForm({ name: '', category: 'workshop', phone: '', email: '', notes: '' });
        setIsVendorOpen(false);
    };

    const exportVehiclesCsv = () => {
        const headers = ['make', 'model', 'year', 'plateNumber', 'vin', 'vehicleType', 'businessStatus', 'assignedDriverName', 'department', 'currentMileage'];
        const rows = vehicles.map((vehicle) => headers.map((header) => csvEscape((vehicle as unknown as Record<string, unknown>)[header])).join(','));
        downloadTextFile(`${organization?.name || 'business'}-vehicles.csv`, [headers.join(','), ...rows].join('\n'));
    };

    const importVehiclesCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !orgId || !user || !editable) return;

        const text = await file.text();
        const rows = parseSimpleCsv(text);
        if (rows.length < 2) return;

        const headers = rows[0].map((header) => header.trim());
        const required = ['make', 'model', 'year'];
        if (!required.every((field) => headers.includes(field))) {
            setMessage('CSV import failed. Required headers: make, model, year.');
            return;
        }

        let imported = 0;
        for (const row of rows.slice(1)) {
            const record = Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));
            const year = Number(record.year);
            if (!record.make || !record.model || !Number.isInteger(year)) continue;

            await addDoc(collection(db, 'vehicles'), {
                userId: user.uid,
                ownerType: 'organization',
                ownerId: orgId,
                organizationId: orgId,
                make: record.make,
                model: record.model,
                year,
                plateNumber: String(record.plateNumber || '').toUpperCase(),
                vin: String(record.vin || '').toUpperCase(),
                vehicleType: record.vehicleType || 'car',
                businessStatus: businessVehicleStatuses.some((status) => status.value === record.businessStatus) ? record.businessStatus : 'active',
                assignedDriverName: record.assignedDriverName || null,
                department: record.department || null,
                currentMileage: record.currentMileage ? Number(record.currentMileage) : 0,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
            });
            imported += 1;
        }

        setMessage(`Imported ${imported} vehicle${imported === 1 ? '' : 's'}.`);
    };

    const exportBusinessJson = async () => {
        if (!orgId) return;
        const vehicleRecords = await Promise.all(vehicles.map(async (vehicle) => {
            const [services, expenses, documents, inspections, issues, workOrders] = await Promise.all([
                getDocs(collection(db, 'vehicles', vehicle.id, 'services')),
                getDocs(collection(db, 'vehicles', vehicle.id, 'expenses')),
                getDocs(collection(db, 'vehicles', vehicle.id, 'documents')),
                getDocs(collection(db, 'vehicles', vehicle.id, 'inspections')),
                getDocs(collection(db, 'vehicles', vehicle.id, 'issues')),
                getDocs(collection(db, 'vehicles', vehicle.id, 'workOrders')),
            ]);
            return {
                ...vehicle,
                services: services.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })),
                expenses: expenses.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })),
                documents: documents.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data(), privateFileExport: 'metadata-only' })),
                inspections: inspections.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })),
                issues: issues.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })),
                workOrders: workOrders.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() })),
            };
        }));

        downloadTextFile(`${organization?.name || 'business'}-export.json`, JSON.stringify({
            organization,
            members,
            vendors,
            vehicles: vehicleRecords,
            exportedAt: new Date().toISOString(),
        }, null, 2), 'application/json;charset=utf-8');
    };

    if (!loading && !member) return <Navigate to="/business" replace />;

    return (
        <Layout>
            <div className="space-y-7">
                <PageHeader
                    eyebrow="Business fleet"
                    title={organization?.name || 'Business workspace'}
                    description="Fleet compliance, vehicle readiness, service status, vendors, and operational records for shared teams."
                    actions={
                        <>
                            <Link to="/business">
                                <Button variant="outline" className="h-11 rounded-xl">
                                    <Building2 className="mr-2 h-4 w-4" />
                                    Workspaces
                                </Button>
                            </Link>
                            {editable && (
                                <Button onClick={() => setIsVehicleModalOpen(true)} className="h-11 rounded-xl">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add vehicle
                                </Button>
                            )}
                        </>
                    }
                />

                {message && (
                    <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">{message}</div>
                )}

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    <MetricCard icon={Car} label="Vehicles" value={vehicles.length.toString()} detail={`${unavailableCount} unavailable`} tone="blue" />
                    <MetricCard icon={ShieldCheck} label="Compliance" value={`${complianceScore}%`} detail="Healthy records" tone={complianceScore < 75 ? 'amber' : 'emerald'} />
                    <MetricCard icon={AlertTriangle} label="Open issues" value={openIssues.length.toString()} detail={`${openWorkOrders.length} work orders`} tone={openIssues.length ? 'rose' : 'emerald'} />
                    <MetricCard icon={Wrench} label="This month" value={formatCurrency(monthlySpend, currency)} detail="Logged fleet spend" tone="indigo" />
                    <MetricCard icon={CreditCard} label="Total Expenses" value={formatCurrency(totalSpend, currency)} detail="All logged costs" tone="emerald" />
                    <MetricCard icon={Users} label="Team" value={members.length.toString()} detail={`Your role: ${member?.role || '-'}`} tone="blue" />
                </section>

                <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
                    <section className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Fleet register</h2>
                                <p className="text-xs text-muted-foreground">Track readiness, assignments, document state, and cost per vehicle.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <select className="mi-field h-10 min-w-44" value={filter} onChange={(event) => setFilter(event.target.value)}>
                                    <option value="all">All statuses</option>
                                    {businessVehicleStatuses.map((status) => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
                                </select>
                                <Button variant="outline" size="sm" onClick={exportVehiclesCsv}>
                                    <Download className="mr-2 h-4 w-4" />
                                    CSV
                                </Button>
                                {editable && (
                                    <label>
                                        <input type="file" accept=".csv" className="hidden" onChange={importVehiclesCsv} />
                                        <span className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-border bg-transparent px-3 text-sm font-semibold text-foreground hover:bg-accent">
                                            <FileUp className="mr-2 h-4 w-4" />
                                            Import
                                        </span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {filteredVehicles.length === 0 ? (
                            <EmptyState icon={Car} title="No vehicles in this view" description="Add vehicles manually or import a CSV with make, model, and year columns." />
                        ) : (
                            <AppSurface className="overflow-hidden p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                                            <tr>
                                                <th className="px-5 py-4">Vehicle</th>
                                                <th className="px-5 py-4">Status</th>
                                                <th className="px-5 py-4">Compliance</th>
                                                <th className="px-5 py-4">Assigned</th>
                                                <th className="px-5 py-4 text-right">Spend</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {filteredVehicles.map((vehicle) => {
                                                const state = getVehicleComplianceState(vehicle);
                                                const spend = (expensesByVehicle[vehicle.id] || []).reduce((total, expense) => total + (expense.amount || 0), 0);
                                                return (
                                                    <tr key={vehicle.id} className="hover:bg-accent/35">
                                                        <td className="px-5 py-4">
                                                            <Link to={`/business/${orgId}/vehicle/${vehicle.id}`} className="font-bold hover:text-primary">
                                                                {vehicle.make} {vehicle.model}
                                                            </Link>
                                                            <p className="mt-1 font-mono text-xs text-muted-foreground">{vehicle.plateNumber || 'No plate'} · {vehicle.year}</p>
                                                        </td>
                                                        <td className="px-5 py-4"><StatusPill tone={statusTone(vehicle.businessStatus)}>{vehicle.businessStatus || 'active'}</StatusPill></td>
                                                        <td className="px-5 py-4"><StatusPill tone={complianceTone(state)}>{state.replace('_', ' ')}</StatusPill></td>
                                                        <td className="px-5 py-4 text-muted-foreground">{vehicle.assignedDriverName || vehicle.department || '-'}</td>
                                                        <td className="px-5 py-4 text-right font-mono font-bold">{formatCurrency(spend, currency)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </AppSurface>
                        )}
                    </section>

                    <aside className="space-y-4">
                        <AppSurface className="p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-bold">Upcoming compliance</h2>
                                <ClipboardCheck className="h-5 w-5 text-primary" />
                            </div>
                            {upcomingDeadlines.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No legal dates have been added yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingDeadlines.map((deadline) => (
                                        <Panel key={`${deadline.vehicleId}-${deadline.key}`} className="p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold">{deadline.vehicleName}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">{deadline.label} · {deadline.plateNumber}</p>
                                                </div>
                                                <StatusPill tone={deadline.daysRemaining < 0 ? 'rose' : deadline.daysRemaining <= 30 ? 'amber' : 'emerald'}>
                                                    {deadline.daysRemaining < 0 ? 'Expired' : `${deadline.daysRemaining}d`}
                                                </StatusPill>
                                            </div>
                                        </Panel>
                                    ))}
                                </div>
                            )}
                        </AppSurface>

                        <AppSurface className="p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-bold">Team & vendors</h2>
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {canInvite && <Button variant="outline" onClick={() => setIsInviteOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Invite</Button>}
                                {editable && <Button variant="outline" onClick={() => setIsVendorOpen(true)}><Plus className="mr-2 h-4 w-4" />Vendor</Button>}
                                <Button variant="outline" onClick={exportBusinessJson} className="col-span-2"><Download className="mr-2 h-4 w-4" />Export JSON</Button>
                            </div>
                            <div className="mt-4 space-y-2">
                                {vendors.slice(0, 4).map((vendor) => (
                                    <Panel key={vendor.id} className="p-3">
                                        <p className="font-semibold">{vendor.name}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{vendor.category.replace('_', ' ')}</p>
                                    </Panel>
                                ))}
                                {vendors.length === 0 && <p className="text-sm text-muted-foreground">Add workshops, insurers, inspection centers, tire shops, and parts suppliers.</p>}
                            </div>
                        </AppSurface>

                        <AppSurface className="p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-bold">Reports</h2>
                                <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="grid gap-3 text-sm">
                                <Panel className="flex justify-between p-3"><span>Maintenance spend</span><strong>{formatCurrency(allExpenses.filter((expense) => expense.category === 'Maintenance').reduce((total, expense) => total + (expense.amount || 0), 0), currency)}</strong></Panel>
                                <Panel className="flex justify-between p-3"><span>Avg cost / vehicle</span><strong>{formatCurrency(vehicles.length ? allExpenses.reduce((total, expense) => total + (expense.amount || 0), 0) / vehicles.length : 0, currency)}</strong></Panel>
                                <Panel className="flex justify-between p-3"><span>Unavailable vehicles</span><strong>{unavailableCount}</strong></Panel>
                            </div>
                        </AppSurface>
                    </aside>
                </div>
            </div>

            {isVehicleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <AppSurface className="max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6">
                        <h2 className="mb-5 text-xl font-bold">Add business vehicle</h2>
                        <form onSubmit={createVehicle} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input label="Make" value={vehicleForm.make} onChange={(event) => setVehicleForm({ ...vehicleForm, make: event.target.value })} required />
                                <Input label="Model" value={vehicleForm.model} onChange={(event) => setVehicleForm({ ...vehicleForm, model: event.target.value })} required />
                                <Input label="Year" type="number" value={vehicleForm.year} onChange={(event) => setVehicleForm({ ...vehicleForm, year: event.target.value })} required />
                                <Input label="Plate number" value={vehicleForm.plateNumber} onChange={(event) => setVehicleForm({ ...vehicleForm, plateNumber: event.target.value })} />
                                <Input label="VIN" value={vehicleForm.vin} onChange={(event) => setVehicleForm({ ...vehicleForm, vin: event.target.value })} />
                                <div className="space-y-2">
                                    <label className="mi-label">Business status</label>
                                    <select className="mi-field" value={vehicleForm.businessStatus} onChange={(event) => setVehicleForm({ ...vehicleForm, businessStatus: event.target.value })}>
                                        {businessVehicleStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                                    </select>
                                </div>
                                <Input label="Assigned driver" value={vehicleForm.assignedDriverName} onChange={(event) => setVehicleForm({ ...vehicleForm, assignedDriverName: event.target.value })} />
                                <Input label="Department" value={vehicleForm.department} onChange={(event) => setVehicleForm({ ...vehicleForm, department: event.target.value })} />
                                <Input label="Current mileage" type="number" value={vehicleForm.currentMileage} onChange={(event) => setVehicleForm({ ...vehicleForm, currentMileage: event.target.value })} />
                                <Input label="Registration expiry" type="date" value={vehicleForm.registrationExpiry} onChange={(event) => setVehicleForm({ ...vehicleForm, registrationExpiry: event.target.value })} />
                                <Input label="TPL insurance expiry" type="date" value={vehicleForm.tplInsuranceExpiry} onChange={(event) => setVehicleForm({ ...vehicleForm, tplInsuranceExpiry: event.target.value })} />
                                <Input label="Technical inspection expiry" type="date" value={vehicleForm.technicalInspectionExpiry} onChange={(event) => setVehicleForm({ ...vehicleForm, technicalInspectionExpiry: event.target.value })} />
                                <Input label="Road tax expiry" type="date" value={vehicleForm.roadTaxExpiry} onChange={(event) => setVehicleForm({ ...vehicleForm, roadTaxExpiry: event.target.value })} />
                                <Input label="Tinted-glass expiry" type="date" value={vehicleForm.tintedGlassCertificateExpiry} onChange={(event) => setVehicleForm({ ...vehicleForm, tintedGlassCertificateExpiry: event.target.value })} />
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button type="submit" className="h-11 flex-1">Save vehicle</Button>
                                <Button type="button" variant="outline" className="h-11" onClick={() => setIsVehicleModalOpen(false)}>Cancel</Button>
                            </div>
                        </form>
                    </AppSurface>
                </div>
            )}

            {isInviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <AppSurface className="w-full max-w-md p-6">
                        <h2 className="mb-5 text-xl font-bold">Invite team member</h2>
                        <form onSubmit={sendInvite} className="space-y-4">
                            <Input label="Email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
                            <div className="space-y-2">
                                <label className="mi-label">Role</label>
                                <select className="mi-field" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as OrganizationRole)}>
                                    {organizationRoles.filter((role) => role.value !== 'owner').map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button type="submit" className="h-11 flex-1">Create invite</Button>
                                <Button type="button" variant="outline" className="h-11" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                            </div>
                        </form>
                    </AppSurface>
                </div>
            )}

            {isVendorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <AppSurface className="w-full max-w-lg p-6">
                        <h2 className="mb-5 text-xl font-bold">Add vendor</h2>
                        <form onSubmit={createVendor} className="space-y-4">
                            <Input label="Vendor name" value={vendorForm.name} onChange={(event) => setVendorForm({ ...vendorForm, name: event.target.value })} required />
                            <div className="space-y-2">
                                <label className="mi-label">Category</label>
                                <select className="mi-field" value={vendorForm.category} onChange={(event) => setVendorForm({ ...vendorForm, category: event.target.value })}>
                                    <option value="workshop">Workshop</option>
                                    <option value="insurer">Insurer</option>
                                    <option value="inspection_center">Inspection center</option>
                                    <option value="tire_shop">Tire shop</option>
                                    <option value="cleaning">Cleaning / detailing</option>
                                    <option value="parts">Parts supplier</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <Input label="Phone" value={vendorForm.phone} onChange={(event) => setVendorForm({ ...vendorForm, phone: event.target.value })} />
                            <Input label="Email" type="email" value={vendorForm.email} onChange={(event) => setVendorForm({ ...vendorForm, email: event.target.value })} />
                            <Input label="Notes" value={vendorForm.notes} onChange={(event) => setVendorForm({ ...vendorForm, notes: event.target.value })} />
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button type="submit" className="h-11 flex-1">Save vendor</Button>
                                <Button type="button" variant="outline" className="h-11" onClick={() => setIsVendorOpen(false)}>Cancel</Button>
                            </div>
                        </form>
                    </AppSurface>
                </div>
            )}
        </Layout>
    );
};
