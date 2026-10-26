import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const authService = new AuthService();

export class AuthController {
  async sendRegisterOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, preferredLanguage } = req.body;
      const result = await authService.sendRegisterOtp({ email, password, name, preferredLanguage });
      return sendSuccess(res, result, 'Verification code sent');
    } catch (err) {
      next(err);
    }
  }

  async verifyRegisterOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyRegisterOtp({
        email,
        otp,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.cookie('accessToken', result.tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      res.cookie('refreshToken', result.tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

      return sendSuccess(res, result, 'Account verified and created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async resendRegisterOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authService.resendRegisterOtp(email);
      return sendSuccess(res, result, 'Verification code resent');
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, preferredLanguage } = req.body;
      const result = await authService.register({ email, password, name, preferredLanguage });

      res.cookie('accessToken', result.tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      res.cookie('refreshToken', result.tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

      return sendSuccess(res, result, 'Registration successful', 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.cookie('accessToken', result.tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      res.cookie('refreshToken', result.tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

      return sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      const result = await authService.refresh(refreshToken);

      res.cookie('accessToken', result.tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

      return sendSuccess(res, result, 'Token refreshed');
    } catch (err) {
      next(err);
    }
  }

  async logout(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, token } = req.body;
      const result = await authService.verifyEmail(email, token);
      return sendSuccess(res, result, 'Email verified successfully');
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);
      return sendSuccess(res, result, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  }
}
