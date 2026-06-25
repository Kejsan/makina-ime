import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    addDoc,
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    limit,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { Archive, ClipboardCheck, Fuel, Plus, UserRound, Wrench, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { syncMileageTriggeredMaintenanceReminders } from '../lib/maintenanceReminders';
import { displayDistanceToStoredKm, distanceUnit, formatDistance, storedKmToDisplayDistance } from '../lib/units';
import type { AuditEvent, FuelLog, InspectionTemplate, MaintenanceProgram, MeasurementSystem, OrganizationDriver, ServiceRecord, Vehicle } from '../lib/types';
import { parseInteger, parseMoney, VEHICLE_LIMITS } from '../lib/validation';
import { AppSurface, EmptyState, MetricCard, Panel, StatusPill } from './ui/design-system';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';

export const BusinessOperations = ({
    organizationId,
    vehicles,
    canEdit,
    requestedAction,
}: {
    organizationId: string;
    vehicles: Vehicle[];
    canEdit: boolean;
    requestedAction?: string | null;
}) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [drivers, setDrivers] = useState<OrganizationDriver[]>([]);
    const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
    const [programs, setPrograms] = useState<MaintenanceProgram[]>([]);
    const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
    const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
    const [modal, setModalState] = useState<'driver' | 'fuel' | 'program' | 'template' | null>(() => requestedAction === 'driver' || requestedAction === 'fuel' ? requestedAction : null);
    const [editingDriver, setEditingDriver] = useState<OrganizationDriver | null>(null);
    const [editingProgram, setEditingProgram] = useState<MaintenanceProgram | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<InspectionTemplate | null>(null);
    const [error, setError] = useState('');
    const [driverForm, setDriverForm] = useState({ displayName: '', employeeId: '', email: '', phone: '', department: '' });
    const [fuelForm, setFuelForm] = useState({ vehicleId: vehicles[0]?.id || '', date: new Date().toISOString().slice(0, 10), quantity: '', unitPrice: '', mileage: '', fuelType: 'Diesel', notes: '' });
    const [programForm, setProgramForm] = useState({ name: '', intervalKm: '', intervalMonths: '' });
    const [templateForm, setTemplateForm] = useState({ name: '', recurrenceDays: '', items: 'Exterior lights\nTires and pressure\nBrakes\nOil and fluids' });
    const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('metric');

    const setModal = (value: 'driver' | 'fuel' | 'program' | 'template' | null) => {
        if (value === null) {
            setEditingDriver(null);
            setEditingProgram(null);
            setEditingTemplate(null);
            setError('');
        }
        setModalState(value);
    };

    useEffect(() => {
        if (!user) return;
        return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
            const system = snapshot.data()?.measurementSystem;
            setMeasurementSystem(system === 'imperial' ? 'imperial' : 'metric');
        });
    }, [user]);

    useEffect(() => onSnapshot(query(collection(db, 'organizations', organizationId, 'drivers'), where('organizationId', '==', organizationId)), (snapshot) => {
        setDrivers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OrganizationDriver).filter((item) => !item.archivedAt));
    }), [organizationId]);

    useEffect(() => onSnapshot(collection(db, 'organizations', organizationId, 'maintenancePrograms'), (snapshot) => {
        setPrograms(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as MaintenanceProgram).filter((item) => !item.archivedAt));
    }), [organizationId]);

    useEffect(() => onSnapshot(collection(db, 'organizations', organizationId, 'inspectionTemplates'), (snapshot) => {
        setTemplates(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as InspectionTemplate).filter((item) => !item.archivedAt));
    }), [organizationId]);

    useEffect(() => onSnapshot(query(collection(db, 'organizations', organizationId, 'auditEvents'), orderBy('createdAt', 'desc'), limit(30)), (snapshot) => {
        setAuditEvents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AuditEvent));
    }), [organizationId]);

    useEffect(() => {
        const unsubscribes = vehicles.map((vehicle) => onSnapshot(collection(db, 'vehicles', vehicle.id, 'fuelLogs'), (snapshot) => {
            const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as FuelLog).filter((item) => !item.archivedAt);
            setFuelLogs((current) => [...current.filter((item) => item.vehicleId !== vehicle.id), ...next]);
        }));
        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    }, [vehicles]);

    const fuelCost = useMemo(() => fuelLogs.reduce((total, item) => total + Number(item.totalCost || 0), 0), [fuelLogs]);
    const fuelQuantity = useMemo(() => fuelLogs.reduce((total, item) => total + Number(item.quantity || 0), 0), [fuelLogs]);

    const createDriver = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !canEdit || !driverForm.displayName.trim()) return;
        const payload = {
            organizationId,
            displayName: driverForm.displayName.trim(),
            employeeId: driverForm.employeeId.trim() || null,
            email: driverForm.email.trim().toLowerCase() || null,
            phone: driverForm.phone.trim() || null,
            department: driverForm.department.trim() || null,
            linkedUserId: null,
            status: 'active',
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        };
        if (editingDriver) await updateDoc(doc(db, 'organizations', organizationId, 'drivers', editingDriver.id), payload);
        else await addDoc(collection(db, 'organizations', organizationId, 'drivers'), { ...payload, createdAt: serverTimestamp(), createdBy: user.uid });
        setDriverForm({ displayName: '', employeeId: '', email: '', phone: '', department: '' });
        setEditingDriver(null);
        setModal(null);
    };

    const createFuelLog = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !fuelForm.vehicleId) return;
        const quantity = parseMoney(fuelForm.quantity, { required: true, min: 0.01 });
        const unitPrice = parseMoney(fuelForm.unitPrice, { required: true });
        const mileage = parseInteger(fuelForm.mileage, { required: true, max: VEHICLE_LIMITS.maxMileage });
        if (quantity.error || unitPrice.error || mileage.error || quantity.value === null || unitPrice.value === null || mileage.value === null) {
            setError(quantity.error || unitPrice.error || mileage.error || 'Check the fuel values.');
            return;
        }
        const storedMileage = displayDistanceToStoredKm(mileage.value, measurementSystem);
        if (storedMileage > VEHICLE_LIMITS.maxMileage) {
            setError(t('Mileage is too high.'));
            return;
        }
        const totalCost = Math.round(quantity.value * unitPrice.value * 100) / 100;
        const vehicleRef = doc(db, 'vehicles', fuelForm.vehicleId);
        const selectedVehicle = vehicles.find((vehicle) => vehicle.id === fuelForm.vehicleId);
        const fuelRef = doc(collection(vehicleRef, 'fuelLogs'));
        const expenseRef = doc(collection(vehicleRef, 'expenses'));
        const odometerRef = doc(collection(vehicleRef, 'odometerLogs'));
        const date = Timestamp.fromDate(new Date(fuelForm.date));
        const batch = writeBatch(db);
        batch.set(fuelRef, {
            organizationId,
            vehicleId: fuelForm.vehicleId,
            date,
            quantity: quantity.value,
            unitPrice: unitPrice.value,
            totalCost,
            mileage: storedMileage,
            fuelType: fuelForm.fuelType,
            notes: fuelForm.notes.trim() || null,
            expenseId: expenseRef.id,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        });
        batch.set(expenseRef, {
            userId: user.uid,
            organizationId,
            createdBy: user.uid,
            vehicleId: fuelForm.vehicleId,
            category: 'Fuel',
            amount: totalCost,
            date,
            notes: fuelForm.notes.trim() || `${quantity.value} units ${fuelForm.fuelType}`,
            sourceType: 'fuel',
            sourceId: fuelRef.id,
            sourceLabel: `${quantity.value} units ${fuelForm.fuelType}`,
            createdAt: serverTimestamp(),
        });
        batch.set(odometerRef, {
            organizationId,
            vehicleId: fuelForm.vehicleId,
            mileage: storedMileage,
            recordedAt: date,
            sourceType: 'fuel',
            sourceId: fuelRef.id,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        });
        batch.update(vehicleRef, { currentMileage: storedMileage, updatedAt: serverTimestamp(), updatedBy: user.uid });
        await batch.commit();
        if (selectedVehicle) {
            try {
                const servicesSnapshot = await getDocs(query(collection(db, 'vehicles', fuelForm.vehicleId, 'services'), orderBy('date', 'desc')));
                await syncMileageTriggeredMaintenanceReminders({
                    userId: user.uid,
                    vehicle: { ...selectedVehicle, currentMileage: storedMileage },
                    services: servicesSnapshot.docs.map((item) => ({ id: item.id, vehicleId: fuelForm.vehicleId, ...item.data() }) as ServiceRecord),
                    ownerType: 'organization',
                    ownerId: organizationId,
                    organizationId,
                    t,
                });
            } catch (reminderError) {
                console.warn('Maintenance reminders could not be synced after fuel mileage update', reminderError);
            }
        }
        setError('');
        setFuelForm({ vehicleId: vehicles[0]?.id || '', date: new Date().toISOString().slice(0, 10), quantity: '', unitPrice: '', mileage: '', fuelType: 'Diesel', notes: '' });
        setModal(null);
    };

    const createProgram = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !programForm.name.trim()) return;
        const km = programForm.intervalKm ? parseInteger(programForm.intervalKm, { min: 1, max: VEHICLE_LIMITS.maxMileage }) : { value: null };
        const months = programForm.intervalMonths ? parseInteger(programForm.intervalMonths, { min: 1, max: 240 }) : { value: null };
        if ('error' in km && km.error || 'error' in months && months.error) { setError(('error' in km && km.error) || ('error' in months && months.error) || 'Invalid interval.'); return; }
        const intervalKm = km.value ? displayDistanceToStoredKm(km.value, measurementSystem) : null;
        const payload = {
            organizationId,
            name: programForm.name.trim(),
            vehicleIds: editingProgram?.vehicleIds || [],
            intervalKm,
            intervalMonths: months.value,
            active: true,
            updatedAt: serverTimestamp(), updatedBy: user.uid,
        };
        if (editingProgram) await updateDoc(doc(db, 'organizations', organizationId, 'maintenancePrograms', editingProgram.id), payload);
        else await addDoc(collection(db, 'organizations', organizationId, 'maintenancePrograms'), { ...payload, createdAt: serverTimestamp(), createdBy: user.uid });
        setProgramForm({ name: '', intervalKm: '', intervalMonths: '' }); setEditingProgram(null); setModal(null); setError('');
    };

    const createTemplate = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || !templateForm.name.trim()) return;
        const recurrence = templateForm.recurrenceDays ? parseInteger(templateForm.recurrenceDays, { min: 1, max: 3650 }) : { value: null };
        if ('error' in recurrence && recurrence.error) { setError(recurrence.error); return; }
        const items = templateForm.items.split('\n').map((label) => label.trim()).filter(Boolean).slice(0, 50).map((label, index) => ({ id: `item-${index}`, label, required: true }));
        const payload = {
            organizationId, name: templateForm.name.trim(), recurrenceDays: recurrence.value, items, active: true,
            updatedAt: serverTimestamp(), updatedBy: user.uid,
        };
        if (editingTemplate) await updateDoc(doc(db, 'organizations', organizationId, 'inspectionTemplates', editingTemplate.id), payload);
        else await addDoc(collection(db, 'organizations', organizationId, 'inspectionTemplates'), { ...payload, createdAt: serverTimestamp(), createdBy: user.uid });
        setTemplateForm({ name: '', recurrenceDays: '', items: 'Exterior lights\nTires and pressure\nBrakes\nOil and fluids' }); setEditingTemplate(null); setModal(null); setError('');
    };

    const archive = async (path: string, id: string) => {
        if (!user || !confirm('Archive this record?')) return;
        await updateDoc(doc(db, path, id), { archivedAt: serverTimestamp(), archivedBy: user.uid, updatedAt: serverTimestamp(), updatedBy: user.uid });
    };

    const editDriver = (driver: OrganizationDriver) => {
        setEditingDriver(driver);
        setDriverForm({ displayName: driver.displayName, employeeId: driver.employeeId || '', email: driver.email || '', phone: driver.phone || '', department: driver.department || '' });
        setModal('driver');
    };

    const editProgram = (program: MaintenanceProgram) => {
        setEditingProgram(program);
        setProgramForm({ name: program.name, intervalKm: program.intervalKm == null ? '' : String(storedKmToDisplayDistance(program.intervalKm, measurementSystem)), intervalMonths: program.intervalMonths == null ? '' : String(program.intervalMonths) });
        setModal('program');
    };

    const editTemplate = (template: InspectionTemplate) => {
        setEditingTemplate(template);
        setTemplateForm({ name: template.name, recurrenceDays: template.recurrenceDays == null ? '' : String(template.recurrenceDays), items: template.items.map((item) => item.label).join('\n') });
        setModal('template');
    };

    return (
        <section id="business-operations" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold">Fleet operations</h2><p className="text-sm text-muted-foreground">Drivers, fuel, preventive maintenance, and repeatable inspections.</p></div>{canEdit && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setModal('driver')}><UserRound className="mr-2 h-4 w-4" />Driver</Button><Button variant="outline" onClick={() => setModal('fuel')}><Fuel className="mr-2 h-4 w-4" />Fuel</Button></div>}</div>
            <div className="grid gap-3 sm:grid-cols-3"><MetricCard icon={UserRound} label="Active drivers" value={drivers.filter((item) => item.status === 'active').length.toString()} tone="blue" /><MetricCard icon={Fuel} label="Fuel spend" value={`€${fuelCost.toFixed(2)}`} detail={`${fuelQuantity.toFixed(2)} units`} tone="emerald" /><MetricCard icon={Wrench} label="Maintenance programs" value={programs.filter((item) => item.active).length.toString()} tone="amber" /></div>
            <div className="grid gap-5 lg:grid-cols-2">
                <AppSurface className="p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Driver directory</h3>{canEdit && <Button size="sm" variant="ghost" onClick={() => setModal('driver')}><Plus className="h-4 w-4" /></Button>}</div>{drivers.length === 0 ? <EmptyState icon={UserRound} title="No drivers" description="Add drivers independently from login memberships." /> : <div className="space-y-2">{drivers.map((driver) => <Panel key={driver.id} role={canEdit ? 'button' : undefined} tabIndex={canEdit ? 0 : undefined} onClick={() => canEdit && editDriver(driver)} onKeyDown={(event) => { if (canEdit && (event.key === 'Enter' || event.key === ' ')) editDriver(driver); }} className="flex cursor-pointer items-center justify-between p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><div><p className="font-semibold">{driver.displayName}</p><p className="text-xs text-muted-foreground">{driver.department || driver.employeeId || 'No department'}</p></div><div className="flex items-center gap-2"><StatusPill tone={driver.status === 'active' ? 'emerald' : 'slate'}>{driver.status}</StatusPill>{canEdit && <button onClick={(event) => { event.stopPropagation(); void archive(`organizations/${organizationId}/drivers`, driver.id); }} className="p-2" aria-label="Archive driver"><Archive className="h-4 w-4" /></button>}</div></Panel>)}</div>}</AppSurface>
                <AppSurface className="p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Preventive maintenance</h3>{canEdit && <Button size="sm" variant="ghost" onClick={() => setModal('program')}><Plus className="h-4 w-4" /></Button>}</div>{programs.length === 0 ? <EmptyState icon={Wrench} title="No programs" description="Create date- or mileage-based maintenance intervals." /> : <div className="space-y-2">{programs.map((program) => <Panel key={program.id} role={canEdit ? 'button' : undefined} tabIndex={canEdit ? 0 : undefined} onClick={() => canEdit && editProgram(program)} className="flex cursor-pointer items-center justify-between p-3"><div><p className="font-semibold">{program.name}</p><p className="mt-1 text-xs text-muted-foreground">{program.intervalKm ? formatDistance(program.intervalKm, measurementSystem) : ''}{program.intervalKm && program.intervalMonths ? ' or ' : ''}{program.intervalMonths ? `${program.intervalMonths} months` : ''}</p></div>{canEdit && <button onClick={(event) => { event.stopPropagation(); void archive(`organizations/${organizationId}/maintenancePrograms`, program.id); }} className="p-2" aria-label="Archive maintenance program"><Archive className="h-4 w-4" /></button>}</Panel>)}</div>}</AppSurface>
                <AppSurface className="p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Recent fuel logs</h3>{canEdit && <Button size="sm" variant="ghost" onClick={() => setModal('fuel')}><Plus className="h-4 w-4" /></Button>}</div>{fuelLogs.length === 0 ? <EmptyState icon={Fuel} title="No fuel logs" description="Record fuel quantity, price, cost, and odometer together." /> : <div className="space-y-2">{fuelLogs.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).slice(0, 8).map((log) => <Panel key={log.id} className="flex justify-between p-3"><div><p className="font-semibold">{vehicles.find((vehicle) => vehicle.id === log.vehicleId)?.plateNumber || 'Vehicle'}</p><p className="text-xs text-muted-foreground">{log.quantity} × €{log.unitPrice.toFixed(2)} · {formatDistance(log.mileage, measurementSystem)}</p></div><strong>€{log.totalCost.toFixed(2)}</strong></Panel>)}</div>}</AppSurface>
                <AppSurface className="p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Inspection templates</h3>{canEdit && <Button size="sm" variant="ghost" onClick={() => setModal('template')}><Plus className="h-4 w-4" /></Button>}</div>{templates.length === 0 ? <EmptyState icon={ClipboardCheck} title="No templates" description="Standardize recurring readiness checks." /> : <div className="space-y-2">{templates.map((template) => <Panel key={template.id} role={canEdit ? 'button' : undefined} tabIndex={canEdit ? 0 : undefined} onClick={() => canEdit && editTemplate(template)} className="flex cursor-pointer items-center justify-between p-3"><div><p className="font-semibold">{template.name}</p><p className="text-xs text-muted-foreground">{template.items.length} checks{template.recurrenceDays ? ` · every ${template.recurrenceDays} days` : ''}</p></div>{canEdit && <button onClick={(event) => { event.stopPropagation(); void archive(`organizations/${organizationId}/inspectionTemplates`, template.id); }} className="p-2" aria-label="Archive inspection template"><Archive className="h-4 w-4" /></button>}</Panel>)}</div>}</AppSurface>
            </div>
            <AppSurface className="p-5"><h3 className="mb-4 font-bold">Recent activity</h3>{auditEvents.length === 0 ? <p className="text-sm text-muted-foreground">Audited business changes will appear here after the audit function is deployed.</p> : <div className="divide-y divide-border/60">{auditEvents.map((event) => <div key={event.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold"><span className="capitalize">{event.action}</span> {event.recordType}</p><p className="text-xs text-muted-foreground">{event.changedFields.slice(0, 6).join(', ') || 'Record created'}</p></div><p className="text-xs text-muted-foreground">{event.createdAt?.toDate?.().toLocaleString() || 'Just now'} · {event.actorId.slice(0, 8)}</p></div>)}</div>}</AppSurface>

            {modal === 'driver' && (
                <Modal onClose={() => setModal(null)} titleId="driver-form-title" className="max-w-lg">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <h2 id="driver-form-title" className="text-xl font-bold">{editingDriver ? 'Edit driver' : 'Add driver'}</h2>
                        <button type="button" onClick={() => setModal(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={createDriver} className="space-y-4">
                        <Input label="Name" value={driverForm.displayName} onChange={(event) => setDriverForm({ ...driverForm, displayName: event.target.value })} required />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label="Employee ID" value={driverForm.employeeId} onChange={(event) => setDriverForm({ ...driverForm, employeeId: event.target.value })} />
                            <Input label="Department" value={driverForm.department} onChange={(event) => setDriverForm({ ...driverForm, department: event.target.value })} />
                            <Input label="Email" type="email" value={driverForm.email} onChange={(event) => setDriverForm({ ...driverForm, email: event.target.value })} />
                            <Input label="Phone" value={driverForm.phone} onChange={(event) => setDriverForm({ ...driverForm, phone: event.target.value })} />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="submit" className="h-11 flex-1">Save driver</Button>
                            <Button type="button" variant="outline" className="h-11" onClick={() => setModal(null)}>Cancel</Button>
                        </div>
                    </form>
                </Modal>
            )}
            {modal === 'fuel' && (
                <Modal onClose={() => setModal(null)} titleId="fuel-form-title" className="max-w-lg">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <h2 id="fuel-form-title" className="text-xl font-bold">Add fuel log</h2>
                        <button type="button" onClick={() => setModal(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={createFuelLog} className="space-y-4">
                        <label className="block space-y-2">
                            <span className="mi-label">Vehicle</span>
                            <select className="mi-field" value={fuelForm.vehicleId} onChange={(event) => setFuelForm({ ...fuelForm, vehicleId: event.target.value })}>
                                <option value="">Choose vehicle</option>
                                {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.plateNumber}</option>)}
                            </select>
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label="Date" type="date" value={fuelForm.date} onChange={(event) => setFuelForm({ ...fuelForm, date: event.target.value })} />
                            <Input label="Quantity" inputMode="decimal" value={fuelForm.quantity} onChange={(event) => setFuelForm({ ...fuelForm, quantity: event.target.value })} />
                            <Input label="Unit price" inputMode="decimal" value={fuelForm.unitPrice} onChange={(event) => setFuelForm({ ...fuelForm, unitPrice: event.target.value })} />
                            <Input label={`${t('Odometer reading')} (${t(distanceUnit(measurementSystem))})`} inputMode="numeric" value={fuelForm.mileage} onChange={(event) => setFuelForm({ ...fuelForm, mileage: event.target.value })} />
                            <Input label="Fuel type" value={fuelForm.fuelType} onChange={(event) => setFuelForm({ ...fuelForm, fuelType: event.target.value })} />
                            <Input label="Notes" value={fuelForm.notes} onChange={(event) => setFuelForm({ ...fuelForm, notes: event.target.value })} />
                        </div>
                        {error && <p className="text-sm text-rose-400">{error}</p>}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="submit" className="h-11 flex-1">Save fuel log</Button>
                            <Button type="button" variant="outline" className="h-11" onClick={() => setModal(null)}>Cancel</Button>
                        </div>
                    </form>
                </Modal>
            )}
            {modal === 'program' && (
                <Modal onClose={() => setModal(null)} titleId="program-form-title" className="max-w-lg">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <h2 id="program-form-title" className="text-xl font-bold">{editingProgram ? 'Edit maintenance program' : 'Add maintenance program'}</h2>
                        <button type="button" onClick={() => setModal(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={createProgram} className="space-y-4">
                        <Input label="Program name" value={programForm.name} onChange={(event) => setProgramForm({ ...programForm, name: event.target.value })} required />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label={`Interval (${t(distanceUnit(measurementSystem))})`} inputMode="numeric" value={programForm.intervalKm} onChange={(event) => setProgramForm({ ...programForm, intervalKm: event.target.value })} />
                            <Input label="Interval (months)" inputMode="numeric" value={programForm.intervalMonths} onChange={(event) => setProgramForm({ ...programForm, intervalMonths: event.target.value })} />
                        </div>
                        {error && <p className="text-sm text-rose-400">{error}</p>}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="submit" className="h-11 flex-1">Save program</Button>
                            <Button type="button" variant="outline" className="h-11" onClick={() => setModal(null)}>Cancel</Button>
                        </div>
                    </form>
                </Modal>
            )}
            {modal === 'template' && (
                <Modal onClose={() => setModal(null)} titleId="template-form-title" className="max-w-lg">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <h2 id="template-form-title" className="text-xl font-bold">{editingTemplate ? 'Edit inspection template' : 'Add inspection template'}</h2>
                        <button type="button" onClick={() => setModal(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <form onSubmit={createTemplate} className="space-y-4">
                        <Input label="Template name" value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} required />
                        <Input label="Repeat every (days)" inputMode="numeric" value={templateForm.recurrenceDays} onChange={(event) => setTemplateForm({ ...templateForm, recurrenceDays: event.target.value })} />
                        <label className="block space-y-2">
                            <span className="mi-label">Checklist items, one per line</span>
                            <textarea className="mi-field h-36 py-3" value={templateForm.items} onChange={(event) => setTemplateForm({ ...templateForm, items: event.target.value })} />
                        </label>
                        {error && <p className="text-sm text-rose-400">{error}</p>}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="submit" className="h-11 flex-1">Save template</Button>
                            <Button type="button" variant="outline" className="h-11" onClick={() => setModal(null)}>Cancel</Button>
                        </div>
                    </form>
                </Modal>
            )}
        </section>
    );
};
