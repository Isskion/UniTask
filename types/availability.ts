
import { Timestamp } from "firebase/firestore";

export type AvailabilityType = 'vacation' | 'sick_leave' | 'public_holiday' | 'personal_days' | 'training' | 'remote_work' | 'other';

export type AvailabilityStatus = 'pending' | 'approved' | 'rejected';

export interface UserAvailability {
    id: string;
    tenantId: string;
    userId: string;
    type: AvailabilityType;
    startDate: Timestamp | Date;
    endDate: Timestamp | Date;
    status: AvailabilityStatus;
    notes?: string;
    createdBy: string;
    createdAt: Timestamp | Date;
    approvedBy?: string;
    approvedAt?: Timestamp | Date;
}

export const AVAILABILITY_TYPES: Record<AvailabilityType, { label: string; color: string }> = {
    vacation: { label: "Vacaciones", color: "#10b981" }, // Emerald
    sick_leave: { label: "Baja Médica", color: "#ef4444" }, // Red
    public_holiday: { label: "Festivo", color: "#f59e0b" }, // Amber
    personal_days: { label: "Asuntos Propios", color: "#3b82f6" }, // Blue
    training: { label: "Formación", color: "#8b5cf6" }, // Violet
    remote_work: { label: "Teletrabajo", color: "#06b6d4" }, // Cyan
    other: { label: "Otro", color: "#71717a" } // Zinc
};
