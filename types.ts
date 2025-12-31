export enum OrderStatus {
  PENDING = 'Pending Acceptance',    // 待接单
  PENDING_VISIT = 'Pending Visit',   // 待上门
  IN_PROGRESS = 'In Progress',       // 维修中
  PENDING_PAYMENT = 'Pending Payment', // 待付款
  REFUNDING = 'Refunding',           // 退款中
  COMPLETED = 'Completed',           // 已完成
  PENDING_REVIEW = 'Pending Review', // 待评价
  CANCELLED = 'Cancelled'            // 已取消
}

export enum UrgencyLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
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
}

export interface AnalysisResult {
  title: string;
  description: string;
  urgency: UrgencyLevel;
  category: string;
}