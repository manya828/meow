import crypto from 'crypto';
import type { Request } from 'express';
import { db } from './db.ts';
import type { User } from '../types/index.ts';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

export function sanitizeUser<T extends User & { password_hash?: string }>(user: T): User {
  const { password_hash: _removed, ...safeUser } = user;
  return safeUser;
}

export function getRequestUser(req: Request): (User & { password_hash: string }) | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes('carpoolx_token_')) return null;
  const tokenValue = authHeader.replace(/^Bearer\s+/i, '').trim();
  const parts = tokenValue.split('_');
  if (parts.length < 3 || isNaN(Number(parts[2]))) return null;
  const userId = Number(parts[2]);
  const user = db.users.find((u) => u.user_id === userId) || null;
  if (!user || !user.is_active) return null;
  return user;
}

export function isPassenger(user: Pick<User, 'role'> | null | undefined): boolean {
  return Boolean(user && user.role === 'passenger');
}

export function isDriver(user: Pick<User, 'role'> | null | undefined): boolean {
  return Boolean(user && user.role === 'driver');
}

export function isStandardUser(user: Pick<User, 'role'> | null | undefined): boolean {
  return Boolean(user && (user.role === 'passenger' || user.role === 'driver'));
}

