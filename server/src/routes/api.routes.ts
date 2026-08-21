import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { EmailController } from '../controllers/email.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Auth routes
router.post('/auth/google', AuthController.googleLogin);
router.post('/auth/demo', AuthController.demoLogin);
router.get('/auth/me', authenticate, AuthController.getMe);
router.post('/auth/logout', AuthController.logout);

// Email routes
router.post('/emails/schedule', authenticate, EmailController.scheduleEmails);
router.get('/emails/scheduled', authenticate, EmailController.getScheduledEmails);
router.get('/emails/sent', authenticate, EmailController.getSentEmails);
router.delete('/emails/:id', authenticate, EmailController.cancelJob);
router.get('/stats', authenticate, EmailController.getStats);

export default router;
