import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserSessionPayload } from '../types';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // In development or if unauthenticated, provide demo user if requested
      if (process.env.NODE_ENV === 'development' && req.headers['x-demo-user']) {
        req.user = {
          id: 'demo-user-id',
          email: 'demo@reachinbox.ai',
          name: 'ReachInbox Demo User',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox',
        };
        return next();
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login with Google.',
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as UserSessionPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please login again.',
    });
  }
}
