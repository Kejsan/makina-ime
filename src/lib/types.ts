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
    date: string;
    description: string;
    cost: number;
    mileage: number;
    vehicleId: string;
}

export interface ExpenseRecord {
    id: string;
    category: string; // 'fuel' | 'insurance' | 'tax' | 'maintenance' | 'other'
    amount: number;
    date: string;
    note?: string;
    vehicleId: string;
}

export interface Document {
    id: string;
    name: string;
    url: string;
    type: string; // 'insurance' | 'inspection' | 'tax' | 'other'
    uploadedAt: Timestamp;
    expiryDate?: string | null;
    vehicleId: string;
    path: string; // Storage path reference
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
