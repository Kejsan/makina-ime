import { Timestamp } from 'firebase/firestore';

export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    userId: string;
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
}

export interface Reminder {
    id: string;
    userId: string;
    vehicleId: string;
    type: string; // 'tax' | 'insurance' | 'inspection' | 'maintenance' | 'other'
    title: string;
    dueDate: Timestamp;
    leadTimeDays: number;
    recurrence: 'none' | 'yearly' | 'monthly';
    completed: boolean;
    createdAt: Timestamp;
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
