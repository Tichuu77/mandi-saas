// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
// import { EventPublisher } from '@/lib/kafka';
import { authenticate } from '@/middleware/auth.middleware';

export async function POST(req: NextRequest) {
  try {
    const { authenticated, user } = await authenticate(req);

    if (authenticated && user) {
      // Publish audit log event
    //   await EventPublisher.publishAuditLog({
    //     tenantId: user.tenantId,
    //     userId: user.userId,
    //     action: 'USER_LOGOUT',
    //     module: 'AUTH',
    //     timestamp: new Date(),
    //   });
    }

    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear token cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'Logout failed' },
      { status: 500 }
    );
  }
}