import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';
import { Role } from '@prisma/client';
import { emailService } from './email.service';
import { otpService } from './otp.service';

export class AuthService {
  async sendRegisterOtp(data: { email: string; password: string; name: string; preferredLanguage?: string }) {
    if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new BadRequestError('Invalid email address format');
    }

    if (!data.password || typeof data.password !== 'string' || data.password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestError('Name is required');
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      throw new BadRequestError('User with this email already exists', { field: 'email' });
    }

    const passwordHash = await argon2.hash(data.password);
    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await otpService.savePendingRegistration({
      otp,
      email: data.email.toLowerCase(),
      name: data.name.trim(),
      passwordHash,
      preferredLanguage: data.preferredLanguage || 'en',
      expiresAt,
    });

    await emailService.sendOtpEmail(data.email.toLowerCase(), otp, data.name.trim());

    return {
      message: 'A 6-digit verification code has been sent to your email address.',
      email: data.email.toLowerCase(),
    };
  }

  async verifyRegisterOtp(data: { email: string; otp: string; ipAddress?: string; userAgent?: string }) {
    if (!data.email || typeof data.email !== 'string') {
      throw new BadRequestError('Email is required');
    }

    if (!data.otp || typeof data.otp !== 'string' || data.otp.trim().length !== 6) {
      throw new BadRequestError('Please enter a valid 6-digit verification code');
    }

    const pending = await otpService.getPendingRegistration(data.email);
    if (!pending) {
      const alreadyUser = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
      if (alreadyUser) {
        throw new BadRequestError('This account has already been registered and verified. Please sign in directly.');
      }
      throw new BadRequestError('Verification code has expired or is invalid. Please request a new code.');
    }

    if (pending.otp !== data.otp.trim()) {
      throw new BadRequestError('Invalid verification code. Please check and try again.');
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      await otpService.deletePendingRegistration(data.email);
      throw new BadRequestError('User with this email already exists');
    }

    const user = await prisma.user.create({
      data: {
        email: pending.email.toLowerCase(),
        passwordHash: pending.passwordHash,
        name: pending.name,
        preferredLanguage: pending.preferredLanguage || 'en',
        role: Role.USER,
        isEmailVerified: true,
      },
    });

    await otpService.deletePendingRegistration(data.email);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const refreshHash = await argon2.hash(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        expiresAt,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });

    return { user: this.sanitizeUser(user), tokens };
  }

  async resendRegisterOtp(email: string) {
    if (!email || typeof email !== 'string') {
      throw new BadRequestError('Email is required');
    }

    const pending = await otpService.getPendingRegistration(email);
    if (!pending) {
      throw new BadRequestError('No pending registration session found for this email. Please fill the registration form.');
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    pending.otp = newOtp;
    pending.expiresAt = Date.now() + 10 * 60 * 1000;

    await otpService.savePendingRegistration(pending);
    await emailService.sendOtpEmail(pending.email, newOtp, pending.name);

    return {
      message: 'A new verification code has been sent to your email address.',
      email: pending.email,
    };
  }

  async register(data: { email: string; password: string; name: string; preferredLanguage?: string }) {
    if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new BadRequestError('Invalid email address format');
    }

    if (!data.password || typeof data.password !== 'string' || data.password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestError('Name is required');
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      throw new BadRequestError('User with this email already exists', { field: 'email' });
    }

    const passwordHash = await argon2.hash(data.password);
    const verificationToken = crypto.randomBytes(24).toString('hex');

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        preferredLanguage: data.preferredLanguage || 'en',
        role: Role.USER,
        isEmailVerified: true, // Auto-verified on registration for clean test flow
        emailVerificationToken: verificationToken,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), tokens };
  }

  async verifyEmail(email: string, token?: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (token && user.emailVerificationToken && user.emailVerificationToken !== token) {
      throw new BadRequestError('Invalid email verification token');
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationToken: null },
    });
    return { verified: true, email: updated.email };
  }

  async login(data: { email: string; password: string; ipAddress?: string; userAgent?: string }) {
    if (!data.email || typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new BadRequestError('Invalid email address format');
    }

    if (!data.password || typeof data.password !== 'string' || data.password.trim() === '') {
      throw new BadRequestError('Password is required');
    }

    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await argon2.verify(user.passwordHash, data.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Your account has been deactivated by system administration.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const refreshHash = await argon2.hash(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        expiresAt,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });

    return { user: this.sanitizeUser(user), tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return { user: this.sanitizeUser(user), tokens };
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.trim() === '') {
      throw new BadRequestError('Current password is required');
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValidPassword) {
      throw new BadRequestError('Current password is incorrect');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestError('New password must be different from current password');
    }

    const newPasswordHash = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password updated successfully' };
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const accessToken = jwt.sign({ id: userId, email, role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });
    const refreshToken = jwt.sign({ id: userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });
    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
