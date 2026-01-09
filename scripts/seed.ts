// scripts/seed.ts
// Run with: npx ts-node scripts/seed.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Import models
import User from '../src/models/user';
import { UserRole, Status } from '../src/types/enums';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mandi_saas';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN });

    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists!');
      console.log('Email:', existingSuperAdmin.email);
      return;
    }

    // Create Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@mandisaas.com',
      phone: '9999999999',
      password: 'Admin@123',
      role: UserRole.SUPER_ADMIN,
      status: Status.ACTIVE,
      tenantId: null,
    });

    console.log('\n✅ Super Admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', superAdmin.email);
    console.log('Password: Admin@123');
    console.log('Role:', superAdmin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Database seeding completed!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run seeding
seedDatabase()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });