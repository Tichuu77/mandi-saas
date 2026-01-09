// src/lib/auth.ts
import jwt from 'jsonwebtoken';
import { UserRole } from '@/types/enums';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

interface JWTPayload {
  userId: string;
  email: string;
  role: typeof UserRole;
  tenantId?: string;
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Generate reset password token
export function generateResetToken(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

// Role-based permissions
export const PERMISSIONS = {
  [UserRole.SUPER_ADMIN]: [
    'manage_all_mandis',
    'manage_subscriptions',
    'view_all_reports',
    'manage_platform_settings',
  ],
  [UserRole.ADMIN]: [
    'manage_mandi',
    'manage_users',
    'manage_masters',
    'manage_entries',
    'view_all_reports',
    'manage_settings',
  ],
  [UserRole.MANAGER]: [
    'view_mandi',
    'manage_entries',
    'view_all_reports',
  ],
  [UserRole.DATA_ENTRY]: [
    'create_challan',
    'create_goods_arrival',
    'view_basic_reports',
  ],
  [UserRole.ACCOUNTANT]: [
    'manage_vouchers',
    'view_financial_reports',
    'manage_accounts',
  ],
  [UserRole.VIEWER]: [
    'view_reports',
  ],
  [UserRole.BUYER]: [
    'view_own_transactions',
    'view_own_statements',
  ],
  [UserRole.GROWER]: [
    'view_own_transactions',
    'view_own_statements',
  ],
};

// Check if user has permission
export function hasPermission(role: typeof UserRole, permission: string): boolean {
  const rolePermissions = PERMISSIONS[role as any] || [];
  return rolePermissions.includes(permission);
}

// Check if user has any of the permissions
export function hasAnyPermission(role: typeof UserRole, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

// Check if user has all permissions
export function hasAllPermissions(role: typeof UserRole, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

// Password validation
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Generate random password
export function generateRandomPassword(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  
  // Fill the rest randomly
  for (let i = 3; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}