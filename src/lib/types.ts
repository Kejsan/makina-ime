import { Timestamp } from 'firebase/firestore';

export type WorkspaceOwnerType = 'personal' | 'organization';
export type WorkspaceType = 'personal' | 'business';
export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'driver' | 'viewer';
export type OrganizationMemberStatus = 'active' | 'invited' | 'suspended';
export type BusinessVehicleStatus = 'active' | 'in_service' | 'needs_attention' | 'out_of_service' | 'reserved' | 'sold' | 'archived';
export type WorkOrderStatus = 'open' | 'scheduled' | 'in_progress' | 'waiting_parts' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceRuleCategory = 'oil' | 'tires' | 'brakes' | 'filters' | 'fluids' | 'timing_belt';
export type MaintenanceInsightStatus = 'ok' | 'due_soon' | 'overdue' | 'setup_needed';
export type MaintenanceInsightBasis = 'mileage' | 'date' | 'mileage_and_date' | 'service_history';

export interface WorkspaceCapabilities {
    canView: boolean;
    canCreateOperationalRecords: boolean;
    canEditOwnRecords: boolean;
    canEditAllRecords: boolean;
    canManageMembers: boolean;
    canManageOrganization: boolean;
}

export type QuickAddActionId =
    | 'vehicle'
    | 'expense'
    | 'fuel'
    | 'service'
    | 'document'
    | 'reminder'
    | 'mileage'
    | 'inspection'
    | 'issue'
    | 'workOrder'
    | 'driver'
    | 'vendor';

export interface QuickAddAction {
    id: QuickAddActionId;
    label: string;
    group: 'vehicle' | 'maintenance' | 'business';
    requiresVehicle: boolean;
    minimumCapability: keyof WorkspaceCapabilities;
}

export interface RecordDetailDescriptor {
    recordType: string;
    recordId: string;
    vehicleId?: string;
    organizationId?: string;
}

export interface AuditableRecord {
    createdAt?: Timestamp;
    createdBy?: string;
    updatedAt?: Timestamp;
    updatedBy?: string;
    archivedAt?: Timestamp | null;
    archivedBy?: string | null;
}

export interface AuditEvent {
    id: string;
    organizationId: string;
    actorId: string;
    action: 'create' | 'update' | 'archive' | 'restore' | 'delete';
    recordType: string;
    recordId: string;
    vehicleId?: string | null;
    changedFields: string[];
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    createdAt: Timestamp;
}

export interface VehicleMaintenanceProfile {
    severeUsage?: boolean;
    oilIntervalKm?: number;
    oilIntervalMonths?: number;
    tireRotationIntervalKm?: number;
    brakeInspectionIntervalKm?: number;
    filterIntervalKm?: number;
    coolantIntervalMonths?: number;
    timingBeltKnown?: boolean;
    timingBeltIntervalKm?: number;
    timingBeltIntervalMonths?: number;
}

export interface MaintenanceInsight {
    id: string;
    category: MaintenanceRuleCategory;
    status: MaintenanceInsightStatus;
    titleKey: string;
    detailKey: string;
    actionKey: string;
    basis: MaintenanceInsightBasis;
    dueMileage?: number;
    dueDate?: Date;
    remainingKm?: number;
    daysRemaining?: number;
    lastServiceMileage?: number;
    lastServiceDate?: Date;
    confidence: 'default' | 'service_history' | 'user_configured';
}

export interface Vehicle extends AuditableRecord {
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
    maintenanceProfile?: VehicleMaintenanceProfile;
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

export interface ServiceRecord extends AuditableRecord {
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

export interface ExpenseRecord extends AuditableRecord {
    id: string;
    category: string; // 'fuel' | 'insurance' | 'tax' | 'maintenance' | 'other'
    amount: number;
    date: Timestamp;
    notes?: string;
    vehicleId: string;
    userId?: string;
    sourceType?: 'manual' | 'service' | 'document' | 'fuel';
    sourceId?: string;
    sourceLabel?: string;
    organizationId?: string;
    createdBy?: string;
}

export interface Document extends AuditableRecord {
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
    ownerType?: WorkspaceOwnerType;
    ownerId?: string;
    plateNumber?: string | null;
    vin?: string | null;
    referenceNumber?: string | null;
    ocrAssisted?: boolean;
    organizationId?: string;
    createdBy?: string;
}

export interface Reminder extends AuditableRecord {
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
    lastWorkspaceType?: WorkspaceType;
    lastOrganizationId?: string | null;
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

export interface VehicleInspection extends AuditableRecord {
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

export interface VehicleIssue extends AuditableRecord {
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

export interface WorkOrder extends AuditableRecord {
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

export interface BusinessVendor extends AuditableRecord {
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
    updatedAt?: Timestamp;
    updatedBy?: string;
    archivedAt?: Timestamp | null;
    archivedBy?: string | null;
}

export interface OrganizationDriver extends AuditableRecord {
    id: string;
    organizationId: string;
    displayName: string;
    employeeId?: string | null;
    phone?: string | null;
    email?: string | null;
    department?: string | null;
    linkedUserId?: string | null;
    status: 'active' | 'inactive';
}

export interface OdometerLog extends AuditableRecord {
    id: string;
    organizationId?: string | null;
    vehicleId: string;
    mileage: number;
    recordedAt: Timestamp;
    sourceType: 'manual' | 'service' | 'fuel' | 'inspection';
    sourceId?: string | null;
    notes?: string | null;
}

export interface FuelLog extends AuditableRecord {
    id: string;
    organizationId: string;
    vehicleId: string;
    date: Timestamp;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    mileage: number;
    fuelType?: string | null;
    vendorId?: string | null;
    expenseId?: string | null;
    notes?: string | null;
}

export interface MaintenanceProgram extends AuditableRecord {
    id: string;
    organizationId: string;
    name: string;
    vehicleIds: string[];
    intervalKm?: number | null;
    intervalMonths?: number | null;
    active: boolean;
}

export interface InspectionTemplate extends AuditableRecord {
    id: string;
    organizationId: string;
    name: string;
    items: Array<{ id: string; label: string; required: boolean }>;
    recurrenceDays?: number | null;
    active: boolean;
}
