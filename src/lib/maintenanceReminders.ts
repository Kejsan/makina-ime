import { addDoc, collection, getDocs, query, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db } from './firebase';
import { buildMaintenanceInsights } from './maintenance';
import type { Reminder, ServiceRecord, Vehicle, WorkspaceOwnerType } from './types';

type SyncMaintenanceReminderOptions = {
    userId: string;
    vehicle: Vehicle;
    services: ServiceRecord[];
    ownerType: WorkspaceOwnerType;
    ownerId: string;
    organizationId?: string | null;
    t: (key: string) => string;
};

const dueDateForInsight = (status: string, dueDate?: Date) => {
    if (status === 'overdue') return new Date();
    if (dueDate) return dueDate;
    if (status === 'due_soon') return new Date();
    return null;
};

export const syncMileageTriggeredMaintenanceReminders = async ({
    userId,
    vehicle,
    services,
    ownerType,
    ownerId,
    organizationId,
    t,
}: SyncMaintenanceReminderOptions) => {
    const actionableInsights = buildMaintenanceInsights(vehicle, services)
        .filter((insight) => insight.status === 'due_soon' || insight.status === 'overdue');
    if (actionableInsights.length === 0) return;

    const remindersQuery = ownerType === 'organization'
        ? query(
            collection(db, 'reminders'),
            where('ownerType', '==', 'organization'),
            where('ownerId', '==', ownerId),
            where('vehicleId', '==', vehicle.id),
            where('completed', '==', false)
        )
        : query(
            collection(db, 'reminders'),
            where('userId', '==', userId),
            where('vehicleId', '==', vehicle.id),
            where('completed', '==', false)
        );

    const existingSnapshot = await getDocs(remindersQuery);
    const existingReminders = existingSnapshot.docs.map((item) => item.data() as Reminder & { sourceType?: string; sourceId?: string });

    await Promise.all(actionableInsights.map(async (insight) => {
        const dueDate = dueDateForInsight(insight.status, insight.dueDate);
        if (!dueDate) return;

        const alreadyExists = existingReminders.some((reminder) => (
            reminder.sourceType === 'maintenance_insight'
            && reminder.sourceId === insight.id
        ));
        if (alreadyExists) return;

        await addDoc(collection(db, 'reminders'), {
            userId,
            ownerType,
            ownerId,
            organizationId: organizationId || null,
            vehicleId: vehicle.id,
            type: 'maintenance',
            title: t(insight.titleKey),
            dueDate: Timestamp.fromDate(dueDate),
            leadTimeDays: insight.status === 'overdue' || !insight.dueDate ? 0 : 14,
            recurrence: 'none',
            completed: false,
            sourceType: 'maintenance_insight',
            sourceId: insight.id,
            sourceBasis: insight.basis,
            dueMileage: insight.dueMileage || null,
            currentMileage: vehicle.currentMileage || 0,
            createdAt: serverTimestamp(),
            createdBy: userId,
            updatedAt: serverTimestamp(),
            updatedBy: userId,
        });
    }));
};
