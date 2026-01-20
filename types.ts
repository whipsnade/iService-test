export enum OrderStatus {
  PENDING = '待接单',          // Pending Acceptance
  PENDING_VISIT = '待上门',    // Pending Visit
  IN_PROGRESS = '维修中',      // In Progress
  PENDING_PAYMENT = '待支付',  // Pending Payment
  REFUNDING = '退款中',        // Refunding
  COMPLETED = '已完成',        // Completed
  PENDING_REVIEW = '待评价',   // Pending Review
  CANCELLED = '已取消'         // Cancelled
}

export enum UrgencyLevel {
  LOW = '一般',      // Low
  MEDIUM = '中等',   // Medium
  HIGH = '紧急',     // High
  CRITICAL = '严重'  // Critical
}

export interface TimelineEvent {
  title: string;
  timestamp: string;
  description?: string;
  isActive: boolean;
}

export interface Engineer {
  id: string;
  name: string;
  phone: string;
  rating: number;
  latitude: number;
  longitude: number;
  distance: string; // e.g., "2.5km"
  avatarUrl?: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  location: string;
  status: OrderStatus;
  urgency: UrgencyLevel;
  dateCreated: string; // ISO Date String
  equipmentId?: string;
  imageUrl?: string;
  timeline: TimelineEvent[];
  description?: string;
  remarks?: string; // User editable remarks
  engineer?: Engineer;
  cost?: number;
  serialNumber?: string; // Device Serial Number
  scheduledTime?: string; // Scheduled visit time (e.g., "ASAP" or ISO String)
}

export interface AnalysisResult {
  title: string;
  description: string;
  urgency: UrgencyLevel;
  category: string;
}