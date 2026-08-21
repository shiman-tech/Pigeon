import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { scheduleEmailJob } from '../queue/email.queue';
import { config } from '../config';
import { RateLimiterService } from '../services/rate-limiter.service';
import { z } from 'zod';

const scheduleSchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'At least 1 recipient is required'),
  subject: z.string().min(1, 'Subject cannot be empty'),
  body: z.string().min(1, 'Body cannot be empty'),
  scheduledAt: z.string().optional(), // ISO string or empty for immediate
  delaySeconds: z.number().int().min(0).default(2),
  hourlyLimit: z.number().int().min(1).default(200),
  senderId: z.string().optional(),
  senderEmail: z.string().email().optional(),
  senderName: z.string().optional(),
});

export class EmailController {
  /**
   * Schedule a new email or batch of emails
   */
  public static async scheduleEmails(req: Request, res: Response) {
    try {
      const parseResult = scheduleSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          errors: parseResult.error.errors,
        });
      }

      const {
        recipients,
        subject,
        body,
        scheduledAt: scheduledAtStr,
        delaySeconds,
        hourlyLimit,
        senderId,
        senderEmail: customSenderEmail,
        senderName: customSenderName,
      } = parseResult.data;

      const userId = req.user?.id;

      // Determine sender
      let sender = null;
      if (senderId) {
        sender = await prisma.sender.findUnique({ where: { id: senderId } });
      } else if (userId) {
        sender = await prisma.sender.findFirst({ where: { userId, isDefault: true } });
      }

      const senderEmail = customSenderEmail || sender?.email || req.user?.email || 'reachinbox@ethereal.email';
      const senderName = customSenderName || sender?.name || req.user?.name || 'Pegion Team';

      const baseScheduleTime = scheduledAtStr ? new Date(scheduledAtStr) : new Date();

      let validUserId: string | undefined = undefined;
      if (userId) {
        const u = await prisma.user.findUnique({ where: { id: userId } });
        if (u) validUserId = u.id;
      }

      // Create EmailBatch record in DB
      const batch = await prisma.emailBatch.create({
        data: {
          userId: validUserId,
          senderId: sender?.id,
          subject,
          body,
          totalCount: recipients.length,
          delaySeconds: delaySeconds || config.defaults.delaySeconds,
          hourlyLimit: hourlyLimit || config.defaults.hourlyLimit,
          scheduledAt: baseScheduleTime,
          status: 'PENDING',
        },
      });

      const scheduledJobs = [];

      // Stagger each recipient by delaySeconds to prevent queue contention
      for (let i = 0; i < recipients.length; i++) {
        const recipientEmail = recipients[i].trim();
        const individualDelayMs = i * (delaySeconds * 1000);
        const itemScheduleTime = new Date(baseScheduleTime.getTime() + individualDelayMs);

        // 1. Create DB Job record
        const jobRecord = await prisma.emailJob.create({
          data: {
            batchId: batch.id,
            recipientEmail,
            subject,
            body,
            senderEmail,
            senderName,
            scheduledAt: itemScheduleTime,
            status: 'SCHEDULED',
          },
        });

        // 2. Add to BullMQ with delayed execution
        const { bullmqJobId } = await scheduleEmailJob(
          {
            jobRecordId: jobRecord.id,
            batchId: batch.id,
            recipientEmail,
            subject,
            body,
            senderEmail,
            senderName,
            smtpHost: sender?.smtpHost || undefined,
            smtpPort: sender?.smtpPort || undefined,
            smtpUser: sender?.smtpUser || undefined,
            smtpPass: sender?.smtpPass || undefined,
            delaySeconds,
            hourlyLimit,
            senderId: sender?.id || senderEmail,
          },
          itemScheduleTime
        );

        // 3. Update job record with BullMQ job ID
        await prisma.emailJob.update({
          where: { id: jobRecord.id },
          data: { bullmqJobId },
        });

        scheduledJobs.push({
          id: jobRecord.id,
          recipientEmail,
          scheduledAt: itemScheduleTime,
          bullmqJobId,
        });
      }

      // Update batch to PROCESSING
      await prisma.emailBatch.update({
        where: { id: batch.id },
        data: { status: 'PROCESSING' },
      });

      return res.status(201).json({
        success: true,
        message: `Successfully scheduled ${recipients.length} email(s)`,
        batch: {
          id: batch.id,
          totalCount: recipients.length,
          scheduledAt: baseScheduleTime,
          delaySeconds,
          hourlyLimit,
        },
        jobs: scheduledJobs,
      });
    } catch (err: any) {
      console.error('Error scheduling emails:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to schedule emails',
      });
    }
  }

  /**
   * List scheduled emails
   */
  public static async getScheduledEmails(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const search = (req.query.search as string || '').trim();

      const where: any = {
        status: { in: ['SCHEDULED', 'PROCESSING', 'RESCHEDULED', 'PENDING'] },
        batch: {
          userId: req.user?.id || null
        }
      };

      if (search) {
        where.OR = [
          { recipientEmail: { contains: search } },
          { subject: { contains: search } },
        ];
      }

      const [jobs, total] = await Promise.all([
        prisma.emailJob.findMany({
          where,
          orderBy: { scheduledAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            batch: {
              select: {
                hourlyLimit: true,
                delaySeconds: true,
              },
            },
          },
        }),
        prisma.emailJob.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * List sent emails
   */
  public static async getSentEmails(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const search = (req.query.search as string || '').trim();

      const where: any = {
        status: { in: ['SENT', 'FAILED'] },
        batch: {
          userId: req.user?.id || null
        }
      };

      if (search) {
        where.OR = [
          { recipientEmail: { contains: search } },
          { subject: { contains: search } },
        ];
      }

      const [jobs, total] = await Promise.all([
        prisma.emailJob.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.emailJob.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Cancel a scheduled email
   */
  public static async cancelJob(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id || null;
      const job = await prisma.emailJob.findFirst({
        where: {
          id,
          batch: { userId }
        }
      });

      if (!job) {
        return res.status(404).json({ success: false, message: 'Email job not found' });
      }

      if (job.status === 'SENT') {
        return res.status(400).json({ success: false, message: 'Email already sent, cannot cancel' });
      }

      await prisma.emailJob.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      return res.status(200).json({
        success: true,
        message: 'Email job cancelled successfully',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Dashboard stats & rate limit metrics
   */
  public static async getStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id || null;
      const [scheduledCount, sentCount, failedCount, rescheduledCount] = await Promise.all([
        prisma.emailJob.count({ where: { status: 'SCHEDULED', batch: { userId } } }),
        prisma.emailJob.count({ where: { status: 'SENT', batch: { userId } } }),
        prisma.emailJob.count({ where: { status: 'FAILED', batch: { userId } } }),
        prisma.emailJob.count({ where: { status: 'RESCHEDULED', batch: { userId } } }),
      ]);

      const senderEmail = req.user?.email || 'default_sender';
      let currentHourCount = await RateLimiterService.getCurrentCount(senderEmail);

      // Fallback check if user has a DB sender ID key
      if (currentHourCount === 0 && req.user?.id) {
        const userSender = await prisma.sender.findFirst({ where: { userId: req.user.id } });
        if (userSender?.id) {
          const countBySenderId = await RateLimiterService.getCurrentCount(userSender.id);
          if (countBySenderId > 0) currentHourCount = countBySenderId;
        }
      }

      return res.status(200).json({
        success: true,
        stats: {
          scheduled: scheduledCount + rescheduledCount,
          sent: sentCount,
          failed: failedCount,
          total: scheduledCount + sentCount + failedCount + rescheduledCount,
          currentHourRateCount: currentHourCount,
          defaultHourlyLimit: config.defaults.hourlyLimit,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
