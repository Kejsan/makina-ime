import { Timestamp } from 'firebase/firestore';
import type {
    BusinessVehicleStatus,
    OrganizationMember,
    OrganizationRole,
    Vehicle,
    WorkOrderPriority,
    WorkOrderStatus,
} from './types';

export const businessVehicleStatuses: { value: BusinessVehicleStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'in_service', label: 'In service' },
    { value: 'needs_attention', label: 'Needs attention' },
    { value: 'out_of_service', label: 'Out of service' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'sold', label: 'Sold' },
    { value: 'archived', label: 'Archived' },
];

export const organizationRoles: { value: OrganizationRole; label: string }[] = [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'driver', label: 'Driver' },
    { value: 'viewer', label: 'Viewer' },
];

export const workOrderStatuses: { value: WorkOrderStatus; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'waiting_parts', label: 'Waiting parts' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

export const workOrderPriorities: { value: WorkOrderPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
];

const roleRank: Record<OrganizationRole, number> = {
    viewer: 0,
    driver: 1,
    manager: 2,
    admin: 3,
    owner: 4,
};

export const hasBusinessRole = (member: OrganizationMember | null | undefined, minimumRole: OrganizationRole) => {
    if (!member || member.status !== 'active') return false;
    return roleRank[member.role] >= roleRank[minimumRole];
};

export const canEditFleet = (member: OrganizationMember | null | undefined) => hasBusinessRole(member, 'manager');
export const canManageMembers = (member: OrganizationMember | null | undefined) => hasBusinessRole(member, 'admin');
export const canSubmitDriverRecords = (member: OrganizationMember | null | undefined) => Boolean(member && roleRank[member.role] >= roleRank.driver);

export const dateFromTimestamp = (value?: Timestamp | null) => value?.toDate?.() || null;

export const daysUntil = (date: Date) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

export const getVehicleComplianceDeadlines = (vehicle: Vehicle) => {
    const entries = [
        ['registration', 'Registration', vehicle.registrationExpiry],
        ['insurance', 'TPL insurance', vehicle.tplInsuranceExpiry],
        ['inspection', 'Technical inspection', vehicle.technicalInspectionExpiry],
        ['tax', 'Road tax', vehicle.roadTaxExpiry],
        ['tinted_glass', 'Tinted glass certificate', vehicle.tintedGlassCertificateExpiry],
    ] as const;

    return entries.flatMap(([key, label, timestamp]) => {
        const date = dateFromTimestamp(timestamp);
        if (!date) return [];
        return [{ key, label, date, daysRemaining: daysUntil(date), vehicleId: vehicle.id }];
    });
};

export const getVehicleComplianceState = (vehicle: Vehicle) => {
    const deadlines = getVehicleComplianceDeadlines(vehicle);
    if (deadlines.some((deadline) => deadline.daysRemaining < 0)) return 'expired';
    if (deadlines.some((deadline) => deadline.daysRemaining <= 30)) return 'due_soon';
    if (vehicle.businessStatus === 'needs_attention' || vehicle.businessStatus === 'out_of_service') return 'attention';
    return 'healthy';
};

export const formatCurrency = (value: number, currency = 'EUR') => {
    const symbol = currency === 'ALL' ? 'ALL' : 'EUR';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: symbol,
        maximumFractionDigits: currency === 'ALL' ? 0 : 2,
    }).format(Number.isFinite(value) ? value : 0);
};

export const downloadTextFile = (fileName: string, content: string, type = 'text/csv;charset=utf-8') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};

export const csvEscape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
};

export const parseSimpleCsv = (raw: string) => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < raw.length; i += 1) {
        const char = raw[i];
        const next = raw[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            cell += '"';
            i += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(cell.trim());
            cell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i += 1;
            row.push(cell.trim());
            if (row.some(Boolean)) rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += char;
        }
    }

    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
};
