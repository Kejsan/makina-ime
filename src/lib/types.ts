import { Timestamp } from 'firebase/firestore';

export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    userId: string;
    plateNumber?: string;
    vin?: string;
    vehicleType?: string;
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
}

export interface Reminder {
    id: string;
    userId: string;
    vehicleId: string;
    type: string; // 'tax' | 'insurance' | 'inspection' | 'maintenance' | 'other'
    title: string;
    dueDate: Timestamp;
    leadTimeDays: number;
    recurrence: 'none' | 'yearly' | 'monthly' | 'biennial';
    completed: boolean;
    createdAt: Timestamp;
}

export interface UserPreferences {
    language: 'sq' | 'en' | 'it';
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
