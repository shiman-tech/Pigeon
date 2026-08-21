import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { config } from '../config';
import { EmailJobData } from '../types';

export const emailQueue = new Queue<EmailJobData>(config.queue.name, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 2000, // Keep history of recent 2000 jobs in Redis
    },
    removeOnFail: {
      count: 2000,
    },
  },
});

/**
 * Adds an email job to the BullMQ persistent queue with calculated delay
 */
export async function scheduleEmailJob(
  data: EmailJobData,
  scheduledAt: Date
): Promise<{ bullmqJobId: string; delayMs: number }> {
  const now = Date.now();
  const targetTime = new Date(scheduledAt).getTime();
  const delayMs = Math.max(0, targetTime - now);

  const job = await emailQueue.add(
    `email-job-${data.jobRecordId}`,
    data,
    {
      delay: delayMs,
      jobId: `job_${data.jobRecordId}`, // Idempotent job key
    }
  );

  return {
    bullmqJobId: job.id || `job_${data.jobRecordId}`,
    delayMs,
  };
}

/**
 * Reschedules an existing job into the future (e.g. rate limit next hour window)
 */
export async function rescheduleDelayedJob(
  data: EmailJobData,
  delayMs: number
): Promise<{ bullmqJobId: string }> {
  const newAttempt = (data.attemptNumber || 0) + 1;
  const updatedData: EmailJobData = {
    ...data,
    attemptNumber: newAttempt,
  };

  const job = await emailQueue.add(
    `email-job-${data.jobRecordId}-retry-${newAttempt}`,
    updatedData,
    {
      delay: delayMs,
      jobId: `job_${data.jobRecordId}_retry_${newAttempt}`,
    }
  );

  return {
    bullmqJobId: job.id || `job_${data.jobRecordId}_retry_${newAttempt}`,
  };
}
