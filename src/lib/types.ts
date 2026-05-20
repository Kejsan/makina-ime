import { Timestamp } from 'firebase/firestore';

export type WorkspaceOwnerType = 'personal' | 'organization';
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'driver' | 'viewer';
export type OrganizationMemberStatus = 'active' | 'invited' | 'suspended';
export type BusinessVehicleStatus = 'active' | 'in_service' | 'needs_attention' | 'out_of_service' | 'reserved' | 'sold' | 'archived';
export type WorkOrderStatus = 'open' | 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    userId: string;
    ownerType?: WorkspaceOwnerType;
    ownerId?: string;
    organizationId?: string;
    plateNumber?: string;
    vin?: string;
    vehicleType?: string;
    businessStatus?: BusinessVehicleStatus;
    assignedDriverId?: string | null;
    assignedDriverName?: string | null;
    department?: string | null;
    location?: string | null;
    notes?: string | null;
    currentMileage?: number;
    registrationExpiry?: Timestamp | null;
    engineCapacity?: number;
    estimatedValue?: number;
    isLuxury?: boolean;
    technicalInspectionExpiry?: Timestamp | null;
    tplInsuranceExpiry?: Timestamp | null;
    roadTaxExpiry?: Timestamp | null;
    tintedGlassCertificateExpiry?: Timestamp | null;
    createdAt: Timestamp;
    createdBy?: string;
    updatedAt?: Timestamp;
    updatedBy?: string;
}

export interface ServiceRecord {
    id: string;
    date: Timestamp;
    description: string;
    cost: number;
    mileage: number;
    vehicleId: string;
    userId?: string;
    expenseId?: string;
    organizationId?: string;
    createdBy?: string;
}

export interface ExpenseRecord {
    id: string;
    category: string; // 'fuel' | 'insurance' | 'tax' | 'maintenance' | 'other'
    amount: number;
    date: Timestamp;
    notes?: string;
    vehicleId: string;
    userId?: string;
    sourceType?: 'manual' | 'service' | 'document';
    sourceId?: string;
    sourceLabel?: string;
    organizationId?: string;
    createdBy?: string;
}

export interface Document {
    id: string;
    name: string;
    url?: string;
    type: string; // 'insurance' | 'inspection' | 'tax' | 'other'
    uploadedAt: Timestamp;
    issueDate?: string | null;
    expiryDate?: string | null;
    vehicleId: string;
    path: string; // Private R2 object key
    storageProvider?: 'r2';
    size?: number;
    contentType?: string;
    cost?: number;
    expenseId?: string;
    userId?: string;
    plateNumber?: string | null;
    vin?: string | null;
    referenceNumber?: string | null;
    ocrAssisted?: boolean;
    organizationId?: string;
    createdBy?: string;
}

export interface Reminder {
    id: string;
    userId: string;
    vehicleId: string;
    ownerType?: WorkspaceOwnerType;
    ownerId?: string;
    organizationId?: string;
    type: string; // 'tax' | 'insurance' | 'inspection' | 'maintenance' | 'other'
    title: string;
    dueDate: Timestamp;
    leadTimeDays: number;
    recurrence: 'none' | 'yearly' | 'monthly' | 'biennial';
    completed: boolean;
    createdAt: Timestamp;
    createdBy?: string;
}

export interface UserPreferences {
    language: 'sq' | 'en' | 'it' | 'de' | 'es';
    timezone: string;
    defaultReminderLeadTimeDays: number;
    browserNotificationsEnabled: boolean;
    emailReminderEnabled: boolean;
    updatedAt?: Timestamp;
}

export interface AppNotification {
    id: string;
    userId: string;
    reminderId?: string;
    title: string;
    body: string;
    type: string; // 'tax' | 'insurance' | 'inspection' | 'maintenance' | 'other'
    read: boolean;
    createdAt: Timestamp;
}

export interface Organization {
    id: string;
    name: string;
    businessType: 'mixed_fleet' | 'taxi' | 'rental' | 'dealer' | 'service' | 'other';
    country?: string;
    city?: string;
    defaultCurrency: 'EUR' | 'ALL';
    createdBy: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface OrganizationMember {
    id: string;
    organizationId: string;
    userId: string;
    email: string;
    displayName?: string | null;
    role: OrganizationRole;
    status: OrganizationMemberStatus;
    createdAt: Timestamp;
    createdBy: string;
    updatedAt?: Timestamp;
}

export interface OrganizationInvite {
    id: string;
    organizationId: string;
    organizationName: string;
    email: string;
    role: OrganizationRole;
    status: 'pending' | 'accepted' | 'revoked';
    createdAt: Timestamp;
    createdBy: string;
    acceptedAt?: Timestamp;
    acceptedBy?: string;
}

export interface InspectionItem {
    id: string;
    label: string;
    passed: boolean;
    notes?: string;
}

export interface VehicleInspection {
    id: string;
    vehicleId: string;
    organizationId: string;
    templateName: string;
    status: 'passed' | 'failed';
    mileage?: number;
    inspectedBy: string;
    inspectedByEmail?: string | null;
    inspectedAt: Timestamp;
    items: InspectionItem[];
    notes?: string;
    issueIds?: string[];
    createdAt: Timestamp;
}

export interface VehicleIssue {
    id: string;
    vehicleId: string;
    organizationId: string;
    title: string;
    description?: string;
    status: 'open' | 'resolved';
    priority: WorkOrderPriority;
    sourceType: 'inspection' | 'manual';
    sourceId?: string;
    createdAt: Timestamp;
    createdBy: string;
    resolvedAt?: Timestamp;
}

export interface WorkOrder {
    id: string;
    vehicleId: string;
    organizationId: string;
    title: string;
    type: 'maintenance' | 'repair' | 'inspection_failure' | 'document_renewal' | 'body_reconditioning' | 'other';
    status: WorkOrderStatus;
    priority: WorkOrderPriority;
    assignedTo?: string | null;
    vendorId?: string | null;
    dueDate?: Timestamp | null;
    downtimeStart?: Timestamp | null;
    downtimeEnd?: Timestamp | null;
    cost?: number;
    mileage?: number;
    notes?: string;
    expenseId?: string | null;
    createdAt: Timestamp;
    createdBy: string;
    updatedAt?: Timestamp;
    updatedBy?: string;
}

export interface BusinessVendor {
    id: string;
    organizationId: string;
    name: string;
    category: 'workshop' | 'insurer' | 'inspection_center' | 'tire_shop' | 'cleaning' | 'parts' | 'other';
    contactName?: string;
    phone?: string;
    email?: string;
    notes?: string;
    createdAt: Timestamp;
    createdBy: string;
}
