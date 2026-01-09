// src/middleware/tenant.middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthenticatedRequest } from './auth.middleware';
import connectDB from '@/lib/mongodb';
import Mandi from '@/models/tenant';
import Subscription from '@/models/subscription';
import { MandiStatus, UserRole } from '@/types/enums';

export interface TenantRequest extends AuthenticatedRequest {
  tenantId?: string;
  mandi?: any;
  subscription?: any;
}

// Verify tenant access and subscription
export async function verifyTenant(req: NextRequest) {
  try {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Super admin doesn't need tenant verification
    if (user.role as any === UserRole.SUPER_ADMIN) {
      return NextResponse.next();
    }

    // Get tenant ID
    const tenantId = user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: 'No tenant associated with user' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get mandi details
    const mandi = await Mandi.findById(tenantId);

    if (!mandi) {
      return NextResponse.json(
        { success: false, message: 'Mandi not found' },
        { status: 404 }
      );
    }

    // Check mandi status
    if (mandi.status === MandiStatus.SUSPENDED) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account has been suspended. Please contact support.',
        },
        { status: 403 }
      );
    }

    // Get subscription
    const subscription = await Subscription.findOne({ tenantId });

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          message: 'No active subscription found',
        },
        { status: 403 }
      );
    }

    // Check subscription status
    if (subscription.isExpired()) {
      // Check if in grace period
      if (subscription.isInGracePeriod()) {
        // Allow access but add warning header
        const response = NextResponse.next();
        response.headers.set(
          'X-Subscription-Warning',
          `Your subscription expired on ${subscription.endDate}. Grace period ends in ${subscription.daysUntilExpiry() + subscription.gracePeriodDays} days.`
        );
        
        (req as TenantRequest).tenantId = tenantId;
        (req as TenantRequest).mandi = mandi;
        (req as TenantRequest).subscription = subscription;
        
        return response;
      } else {
        // Expired and out of grace period
        return NextResponse.json(
          {
            success: false,
            message: 'Your subscription has expired. Please renew to continue.',
            redirectTo: '/subscription/renew',
          },
          { status: 402 }
        );
      }
    }

    // All checks passed - attach tenant data to request
    (req as TenantRequest).tenantId = tenantId;
    (req as TenantRequest).mandi = mandi;
    (req as TenantRequest).subscription = subscription;

    return NextResponse.next();
  } catch (error) {
    console.error('Tenant verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Tenant verification failed' },
      { status: 500 }
    );
  }
}