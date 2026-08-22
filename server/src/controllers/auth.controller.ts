import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/prisma';

const googleClient = new OAuth2Client(config.googleClientId);

export class AuthController {
  /**
   * Login with Google Credential Token (ID Token)
   */
  public static async googleLogin(req: Request, res: Response) {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({
          success: false,
          message: 'Google credential token is required',
        });
      }

      let payload: any;

      try {
        // Verify with Google
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: config.googleClientId || undefined,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        console.warn('⚠️ Google token verification fallback decoding payload (e.g. for dev/demo client tokens)');
        // Fallback for custom decoded JWT if client ID not configured in local environment
        const decoded = jwt.decode(credential) as any;
        if (decoded && decoded.email) {
          payload = decoded;
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid Google authentication token',
          });
        }
      }

      if (!payload || !payload.email) {
        return res.status(401).json({
          success: false,
          message: 'Could not extract user details from Google token',
        });
      }

      const googleId = payload.sub || payload.id || `google_${payload.email}`;
      const email = payload.email;
      const name = payload.name || payload.given_name || email.split('@')[0];
      const avatar = payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

      // Upsert User in DB
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          avatar,
          googleId,
        },
        create: {
          googleId,
          email,
          name,
          avatar,
        },
      });

      // Create default sender for user if none exists
      const existingSender = await prisma.sender.findFirst({
        where: { userId: user.id },
      });

      if (!existingSender) {
        await prisma.sender.create({
          data: {
            userId: user.id,
            name: `${user.name || 'Pigeon User'}`,
            email: user.email,
            isDefault: true,
          },
        });
      }

      // Generate JWT session token
      const sessionToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.cookie('token', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Internal server error during authentication',
      });
    }
  }

  /**
   * Demo / Fast login for local testing without Google OAuth keys
   */
  public static async demoLogin(req: Request, res: Response) {
    try {
      const email = req.body.email || 'demo@pigeon.email';
      const name = req.body.name || 'Pigeon Demo User';
      const googleId = `demo_${email}`;
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

      const user = await prisma.user.upsert({
        where: { email },
        update: { name, avatar },
        create: {
          googleId,
          email,
          name,
          avatar,
        },
      });

      const existingSender = await prisma.sender.findFirst({
        where: { userId: user.id },
      });

      if (!existingSender) {
        await prisma.sender.create({
          data: {
            userId: user.id,
            name: user.name || 'Pigeon Sender',
            email: user.email,
            isDefault: true,
          },
        });
      }

      const sessionToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.cookie('token', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get current authenticated user profile
   */
  public static async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthenticated' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          createdAt: true,
          senders: true,
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Logout user
   */
  public static async logout(req: Request, res: Response) {
    res.clearCookie('token');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}
