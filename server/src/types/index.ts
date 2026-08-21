export interface EmailJobData {
  jobRecordId: string;
  batchId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  senderName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  delaySeconds: number;
  hourlyLimit: number;
  senderId?: string;
  attemptNumber?: number;
}

export interface UserSessionPayload {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserSessionPayload;
    }
  }
}
