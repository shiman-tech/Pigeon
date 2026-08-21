import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config';
import { prisma } from '../config/prisma';
import { EmailJobData } from '../types';
import { getOrCreateTransporter, getEtherealPreviewUrl } from '../services/mailer.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { rescheduleDelayedJob } from './email.queue';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function initEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    config.queue.name,
    async (job: Job<EmailJobData>) => {
      const data = job.data;
      console.log(`\n⏳ [Worker] Processing email job ${job.id} for <${data.recipientEmail}> (Record: ${data.jobRecordId})`);

      // 1. Fetch current status from DB to ensure idempotency and cancellation checks
      const dbJob = await prisma.emailJob.findUnique({
        where: { id: data.jobRecordId },
      });

      if (!dbJob) {
        console.warn(`⚠️ [Worker] Job record ${data.jobRecordId} not found in DB. Skipping.`);
        return { skipped: true, reason: 'NOT_FOUND' };
      }

      if (dbJob.status === 'SENT') {
        console.log(`ℹ️ [Worker] Job ${data.jobRecordId} already sent. Skipping.`);
        return { skipped: true, reason: 'ALREADY_SENT' };
      }

      if (dbJob.status === 'CANCELLED') {
        console.log(`🛑 [Worker] Job ${data.jobRecordId} was cancelled by user.`);
        return { skipped: true, reason: 'CANCELLED' };
      }

      // 2. Check Hourly Rate Limit
      const senderKey = data.senderId || data.senderEmail || 'default_sender';
      const hourlyLimit = data.hourlyLimit || config.defaults.hourlyLimit;

      const rateCheck = await RateLimiterService.checkAndConsume(senderKey, hourlyLimit);

      if (!rateCheck.allowed) {
        console.warn(
          `🚫 [RateLimit] Hourly limit of ${hourlyLimit} emails reached for sender '${senderKey}' (count: ${rateCheck.currentCount}).`
        );
        console.log(`⏰ [Reschedule] Rescheduling job ${data.jobRecordId} in ${Math.round(rateCheck.delayUntilNextWindowMs / 1000)}s (next hour window)...`);

        // Update DB record to RESCHEDULED status with new scheduledAt
        const nextScheduledTime = new Date(Date.now() + rateCheck.delayUntilNextWindowMs);
        await prisma.emailJob.update({
          where: { id: data.jobRecordId },
          data: {
            status: 'RESCHEDULED',
            scheduledAt: nextScheduledTime,
            errorMessage: `Hourly rate limit of ${hourlyLimit}/hr exceeded. Automatically rescheduled for ${nextScheduledTime.toISOString()}.`,
          },
        });

        // Add delayed job into next hour
        const { bullmqJobId } = await rescheduleDelayedJob(data, rateCheck.delayUntilNextWindowMs);
        await prisma.emailJob.update({
          where: { id: data.jobRecordId },
          data: { bullmqJobId },
        });

        return {
          rescheduled: true,
          nextScheduledTime,
          delayMs: rateCheck.delayUntilNextWindowMs,
        };
      }

      // 3. Mark DB status as PROCESSING
      await prisma.emailJob.update({
        where: { id: data.jobRecordId },
        data: { status: 'PROCESSING' },
      });

      // 4. Enforce minimum delay between sends (Provider throttling)
      const delayBetweenSends = Math.max(500, (data.delaySeconds || config.defaults.delaySeconds) * 1000);
      if (delayBetweenSends > 0) {
        console.log(`⏱️ [Throttling] Pausing ${delayBetweenSends}ms before dispatching email to ${data.recipientEmail}...`);
        await sleep(delayBetweenSends);
      }

      // 5. Send Email via Transporter
      try {
        const { transporter, isEthereal, senderEmail } = await getOrCreateTransporter({
          smtpHost: data.smtpHost,
          smtpPort: data.smtpPort,
          smtpUser: data.smtpUser,
          smtpPass: data.smtpPass,
          email: data.senderEmail,
        });

        const fromAddress = data.senderName
          ? `"${data.senderName}" <${senderEmail}>`
          : senderEmail;

        const info = await transporter.sendMail({
          from: fromAddress,
          to: data.recipientEmail,
          subject: data.subject,
          text: data.body,
          html: `<div style="font-family: sans-serif; line-height: 1.5; color: #1e293b; padding: 20px;">
            ${data.body.replace(/\n/g, '<br/>')}
            <hr style="margin-top: 24px; border: none; border-top: 1px solid #e2e8f0;"/>
            <p style="font-size: 11px; color: #94a3b8;">Sent securely via Pigeon Email Job Scheduler</p>
          </div>`,
        });

        let previewUrl: string | null = null;
        if (isEthereal) {
          const testUrl = getEtherealPreviewUrl(info);
          if (testUrl) {
            previewUrl = testUrl;
            console.log(`🔗 [Ethereal Preview URL]: ${previewUrl}`);
          }
        }

        // 6. Update DB record to SENT
        await prisma.emailJob.update({
          where: { id: data.jobRecordId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealUrl: previewUrl,
            errorMessage: null,
          },
        });

        // Update batch counters
        await prisma.emailBatch.update({
          where: { id: data.batchId },
          data: {
            sentCount: { increment: 1 },
          },
        });

        console.log(`🎉 [Worker] Email successfully sent to <${data.recipientEmail}>! Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId, previewUrl };
      } catch (err: any) {
        console.error(`💥 [Worker] Failed to send email to <${data.recipientEmail}>:`, err.message);

        // Update DB record to FAILED
        await prisma.emailJob.update({
          where: { id: data.jobRecordId },
          data: {
            status: 'FAILED',
            errorMessage: err.message,
            retryCount: { increment: 1 },
          },
        });

        await prisma.emailBatch.update({
          where: { id: data.batchId },
          data: {
            failedCount: { increment: 1 },
          },
        });

        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: config.queue.concurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ [Worker] Job ${job.id} finished successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  console.log(`🚀 BullMQ Worker initialized with concurrency: ${config.queue.concurrency}`);
  return worker;
}
