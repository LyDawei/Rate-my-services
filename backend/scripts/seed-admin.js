#!/usr/bin/env node
/**
 * Admin User Seed Script
 * Creates the initial admin user for Baymax IT Care
 *
 * Usage: node scripts/seed-admin.js
 */

const {
  createAdminUser,
  usernameExists,
  hasAdminUsers
} = require('../auth-database');

// Configuration - Get from environment or use defaults with generated password
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'lydawei';
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || 'David Ly';
// Use environment password or generate a secure random one
const TEMP_PASSWORD = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(16).toString('base64').slice(0, 20);

async function seedAdmin() {
  console.log('\n🤖 Baymax IT Care - Admin Seeder\n');
  console.log('================================\n');

  try {
    // Check if user already exists
    if (usernameExists(ADMIN_USERNAME)) {
      console.log(`⚠️  Admin user "${ADMIN_USERNAME}" already exists.`);
      console.log('   No changes made.\n');
      return;
    }

    // Create the admin user
    const user = await createAdminUser(ADMIN_USERNAME, TEMP_PASSWORD, ADMIN_DISPLAY_NAME);

    console.log('✅ Admin user created successfully!\n');
    console.log('   User Details:');
    console.log('   ─────────────────────────────────');
    console.log(`   Username:     ${user.username}`);
    console.log(`   Display Name: ${user.display_name}`);
    console.log(`   Created At:   ${user.created_at}`);
    console.log('   ─────────────────────────────────\n');
    console.log('   🔐 TEMPORARY PASSWORD:');
    console.log(`   ${TEMP_PASSWORD}`);
    console.log('\n   ⚠️  Please change this password after first login!\n');

    // Summary
    const totalAdmins = hasAdminUsers();
    console.log(`📊 Total admin users in system: ${totalAdmins ? '1+' : '0'}\n`);

  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      console.log(`⚠️  Admin user "${ADMIN_USERNAME}" already exists.`);
    } else {
      console.error('❌ Error creating admin user:', error.message);
      process.exit(1);
    }
  }
}

// Run the seeder
seedAdmin().then(() => {
  console.log('🏁 Seed script completed.\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
