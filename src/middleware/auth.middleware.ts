// src/middleware/auth.middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { UserRole } from '@/types/enums';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: typeof UserRole;
    tenantId?: string;
  };
}

// Authenticate user from token
export async function authenticate(
  req: NextRequest
): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.get('authorization');
    const token =
      authHeader?.replace('Bearer ', '') ||
      req.cookies.get('token')?.value;

    if (!token) {
      return {
        authenticated: false,
        error: 'No token provided',
      };
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      return {
        authenticated: false,
        error: 'Invalid or expired token',
      };
    }

    return {
      authenticated: true,
      user: payload,
    };
  } catch (error) {
    return {
      authenticated: false,
      error: 'Authentication failed',
    };
  }
}

// Middleware factory - require authentication
export function requireAuth() {
  return async (req: NextRequest) => {
    const { authenticated, user, error } = await authenticate(req);

    if (!authenticated) {
      return NextResponse.json(
        { success: false, message: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    return NextResponse.next();
  };
}

// Middleware factory - require specific role
export function requireRole(...allowedRoles: typeof UserRole[]) {
  return async (req: NextRequest) => {
    const { authenticated, user, error } = await authenticate(req);

    if (!authenticated) {
      return NextResponse.json(
        { success: false, message: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    return NextResponse.next();
  };
}

// Middleware - Super Admin only
export function requireSuperAdmin() {
  return requireRole(UserRole.SUPER_ADMIN as any);
}

// Middleware - Mandi Admin or Manager
export function requireMandiAdmin() {
  return requireRole(UserRole.ADMIN as any, UserRole.MANAGER as any);
}