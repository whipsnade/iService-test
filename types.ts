export enum OrderStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
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

export interface WorkOrder {
  id: string;
  title: string;
  location: string;
  status: OrderStatus;
  urgency: UrgencyLevel;
  dateCreated: string;
  imageUrl?: string;
  timeline: TimelineEvent[];
  description?: string;
}

export interface AnalysisResult {
  title: string;
  description: string;
  urgency: UrgencyLevel;
  category: string;
}
