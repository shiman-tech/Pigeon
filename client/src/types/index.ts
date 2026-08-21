export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface EmailJob {
  id: string;
  batchId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  senderName?: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RESCHEDULED' | 'CANCELLED';
  etherealUrl?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  bullmqJobId?: string | null;
  createdAt: string;
  batch?: {
    hourlyLimit: number;
    delaySeconds: number;
  };
}

export interface DashboardStats {
  scheduled: number;
  sent: number;
  failed: number;
  total: number;
  currentHourRateCount: number;
  defaultHourlyLimit: number;
}

export interface SchedulePayload {
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt?: string;
  delaySeconds: number;
  hourlyLimit: number;
  senderEmail?: string;
  senderName?: string;
}
