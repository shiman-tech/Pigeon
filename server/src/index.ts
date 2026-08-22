import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import apiRoutes from './routes/api.routes';
import { initEmailWorker } from './queue/email.worker';
import { prisma } from './config/prisma';

const app = express();

// Middleware
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(null, true); // Allow all for now but log
      }
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pigeon-email-scheduler',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', apiRoutes);

// Initialize BullMQ Worker
const worker = initEmailWorker();

// Start Server
const server = app.listen(config.port, () => {
  console.log(`\n🚀 Server listening on port ${config.port} (${config.nodeEnv})`);
  console.log(`📡 API Base URL: http://localhost:${config.port}/api`);
  console.log(`⚙️ Concurrency: ${config.queue.concurrency} workers`);
  console.log(`⏱️ Default delay between sends: ${config.defaults.delaySeconds}s`);
  console.log(`📊 Default hourly rate limit: ${config.defaults.hourlyLimit} emails/hr\n`);
});

// Graceful Shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  try {
    await worker.close();
    console.log('💤 BullMQ worker closed.');
    await prisma.$disconnect();
    console.log('💾 Database connection closed.');
    server.close(() => {
      console.log('👋 HTTP server closed. Exiting process.');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
