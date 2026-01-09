// ============================================
// SUBSCRIPTION MANAGEMENT WORKER
// ============================================
// workers/subscription-worker.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import Subscription from '../src/models/subscription';
import Mandi from '../src/models/tenant';
import User from '../src/models/user';
import { Notification } from '../src/models/notification';
import { SubscriptionStatus, MandiStatus, NotificationType, UserRole } from '../src/types/enums';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mandi_saas';

// ============================================
// 1. CHECK EXPIRING SUBSCRIPTIONS (7 days)
// ============================================
async function checkExpiringSubscriptions() {
  try {
    console.log('🔍 Checking expiring subscriptions...');

    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Find subscriptions expiring in next 7 days
    const expiringSubscriptions = await Subscription.find({
      status: SubscriptionStatus.ACTIVE,
      endDate: {
        $gte: today,
        $lte: sevenDaysFromNow,
      },
    }).populate('tenantId');

    console.log(`📊 Found ${expiringSubscriptions.length} expiring subscriptions`);

    for (const subscription of expiringSubscriptions) {
      const daysRemaining = subscription.daysUntilExpiry();
      
      // Send reminder on Day 7, 5, 3, 2, 1
      if ([7, 5, 3, 2, 1].includes(daysRemaining)) {
        const mandi = await Mandi.findById(subscription.tenantId);
        const adminUsers = await User.find({
          tenantId: subscription.tenantId,
          role: UserRole.ADMIN,
        });

        for (const admin of adminUsers) {
          // Create notification
          await Notification.create({
            tenantId: subscription.tenantId,
            recipientId: admin._id,
            recipientType: 'user',
            type: NotificationType.EMAIL,
            subject: `Subscription Expiring in ${daysRemaining} Days`,
            message: `Your ${subscription.planType} subscription will expire on ${subscription.endDate.toLocaleDateString()}. Please renew to continue using our services.`,
            data: {
              subscriptionId: subscription._id,
              daysRemaining,
              amount: subscription.amount,
            },
            status: 'pending',
          });

          console.log(`✉️  Notification sent to ${admin.email} (${daysRemaining} days remaining)`);
        }
      }
    }

    console.log('✅ Expiring subscriptions check completed');
  } catch (error) {
    console.error('❌ Error checking expiring subscriptions:', error);
  }
}

// ============================================
// 2. EXPIRE SUBSCRIPTIONS
// ============================================
async function expireSubscriptions() {
  try {
    console.log('🔍 Checking expired subscriptions...');

    const today = new Date();

    // Find active subscriptions that are past end date
    const expiredSubscriptions = await Subscription.find({
      status: SubscriptionStatus.ACTIVE,
      endDate: { $lt: today },
    });

    console.log(`📊 Found ${expiredSubscriptions.length} expired subscriptions`);

    for (const subscription of expiredSubscriptions) {
      // Update subscription status
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();

      // Send expiry notification
      const adminUsers = await User.find({
        tenantId: subscription.tenantId,
        role: UserRole.ADMIN,
      });

      for (const admin of adminUsers) {
        await Notification.create({
          tenantId: subscription.tenantId,
          recipientId: admin._id,
          recipientType: 'user',
          type: NotificationType.EMAIL,
          subject: 'Subscription Expired',
          message: `Your subscription has expired. You have ${subscription.gracePeriodDays} days grace period to renew. After that, your account will be suspended.`,
          data: {
            subscriptionId: subscription._id,
            gracePeriodDays: subscription.gracePeriodDays,
          },
          status: 'pending',
        });
      }

      console.log(`⏰ Subscription ${subscription._id} expired for tenant ${subscription.tenantId}`);
    }

    console.log('✅ Expired subscriptions processed');
  } catch (error) {
    console.error('❌ Error expiring subscriptions:', error);
  }
}

// ============================================
// 3. SUSPEND ACCOUNTS (Grace Period Over)
// ============================================
async function suspendExpiredAccounts() {
  try {
    console.log('🔍 Checking grace period expiries...');

    const today = new Date();

    // Find expired subscriptions past grace period
    const subscriptions = await Subscription.find({
      status: SubscriptionStatus.EXPIRED,
    });

    console.log(`📊 Checking ${subscriptions.length} expired subscriptions`);

    for (const subscription of subscriptions) {
      const gracePeriodEnd = new Date(subscription.endDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + subscription.gracePeriodDays);

      // If grace period is over
      if (today > gracePeriodEnd) {
        // Suspend mandi
        await Mandi.findByIdAndUpdate(subscription.tenantId, {
          status: MandiStatus.SUSPENDED,
        });

        // Send suspension notification
        const adminUsers = await User.find({
          tenantId: subscription.tenantId,
          role: UserRole.ADMIN,
        });

        for (const admin of adminUsers) {
          await Notification.create({
            tenantId: subscription.tenantId,
            recipientId: admin._id,
            recipientType: 'user',
            type: NotificationType.EMAIL,
            subject: 'Account Suspended',
            message: 'Your account has been suspended due to expired subscription. Please renew to reactivate your account.',
            data: {
              subscriptionId: subscription._id,
            },
            status: 'pending',
          });
        }

        console.log(`🚫 Account suspended for tenant ${subscription.tenantId}`);
      }
    }

    console.log('✅ Grace period check completed');
  } catch (error) {
    console.error('❌ Error suspending accounts:', error);
  }
}

// ============================================
// 4. SEND AUTO-RENEWAL REMINDERS
// ============================================
async function sendAutoRenewalReminders() {
  try {
    console.log('🔍 Checking auto-renewal subscriptions...');

    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Find subscriptions with auto-renew enabled expiring in 3 days
    const subscriptions = await Subscription.find({
      status: SubscriptionStatus.ACTIVE,
      autoRenew: true,
      endDate: {
        $gte: today,
        $lte: threeDaysFromNow,
      },
    });

    console.log(`📊 Found ${subscriptions.length} auto-renewal subscriptions`);

    for (const subscription of subscriptions) {
      const adminUsers = await User.find({
        tenantId: subscription.tenantId,
        role: UserRole.ADMIN,
      });

      for (const admin of adminUsers) {
        await Notification.create({
          tenantId: subscription.tenantId,
          recipientId: admin._id,
          recipientType: 'user',
          type: NotificationType.EMAIL,
          subject: 'Auto-Renewal Reminder',
          message: `Your ${subscription.planType} subscription will auto-renew on ${subscription.endDate.toLocaleDateString()} for ₹${subscription.amount}. You can disable auto-renewal from settings.`,
          data: {
            subscriptionId: subscription._id,
            amount: subscription.amount,
          },
          status: 'pending',
        });
      }
    }

    console.log('✅ Auto-renewal reminders sent');
  } catch (error) {
    console.error('❌ Error sending auto-renewal reminders:', error);
  }
}

// ============================================
// 5. GENERATE MONTHLY REPORTS
// ============================================
async function generateMonthlyReports() {
  try {
    console.log('📊 Generating monthly reports...');

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get statistics
    const totalMandis = await Mandi.countDocuments();
    const activeMandis = await Mandi.countDocuments({ status: MandiStatus.ACTIVE });
    const suspendedMandis = await Mandi.countDocuments({ status: MandiStatus.SUSPENDED });

    const activeSubscriptions = await Subscription.countDocuments({ 
      status: SubscriptionStatus.ACTIVE 
    });
    const expiredSubscriptions = await Subscription.countDocuments({ 
      status: SubscriptionStatus.EXPIRED 
    });

    // Calculate revenue
    const revenue = await Subscription.aggregate([
      {
        $match: {
          'paymentHistory.paymentDate': {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        },
      },
      {
        $unwind: '$paymentHistory',
      },
      {
        $match: {
          'paymentHistory.paymentDate': {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
          'paymentHistory.status': 'success',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$paymentHistory.amount' },
        },
      },
    ]);

    const report = {
      month: today.toLocaleString('default', { month: 'long', year: 'numeric' }),
      stats: {
        totalMandis,
        activeMandis,
        suspendedMandis,
        activeSubscriptions,
        expiredSubscriptions,
        totalRevenue: revenue[0]?.totalRevenue || 0,
      },
      generatedAt: new Date(),
    };

    console.log('📈 Monthly Report:', report);
    console.log('✅ Monthly report generated');

    // You can save this to a Report collection or send email
    return report;
  } catch (error) {
    console.error('❌ Error generating monthly report:', error);
  }
}

// ============================================
// MAIN WORKER FUNCTION
// ============================================
async function runSubscriptionWorker() {
  try {
    console.log('🚀 Starting Subscription Worker...');
    console.log('⏰ Time:', new Date().toLocaleString());

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Run all checks
    await checkExpiringSubscriptions();
    await expireSubscriptions();
    await suspendExpiredAccounts();
    await sendAutoRenewalReminders();

    // Generate monthly report on 1st of every month
    const today = new Date();
    if (today.getDate() === 1) {
      await generateMonthlyReports();
    }

    console.log('✅ Subscription Worker completed successfully');
  } catch (error) {
    console.error('❌ Subscription Worker error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// ============================================
// SCHEDULE WORKER
// ============================================
// Run immediately
runSubscriptionWorker();

// Schedule to run every 6 hours
setInterval(runSubscriptionWorker, 6 * 60 * 60 * 1000);

// Export for manual execution
export { runSubscriptionWorker };

// ============================================
// USAGE:
// ============================================
// 1. Run once: ts-node workers/subscription-worker.ts
// 2. Run as service: pm2 start workers/subscription-worker.ts
// 3. Docker: Add to docker-compose as a service
// 4. Cron: Add to crontab: 0 */6 * * * cd /app && ts-node workers/subscription-worker.ts