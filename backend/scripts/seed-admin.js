#!/usr/bin/env node
/**
 * Admin User Seed Script
 * Creates the initial admin user for Baymax IT Care
 *
 * Usage: node scripts/seed-admin.js
 *
 * SECURITY: Generated passwords are written to a secure file, not logged to console
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  createAdminUser,
  usernameExists,
  hasAdminUsers
} = require('../auth-database');

// Configuration - Get from environment or use defaults with generated password
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'lydawei';
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || 'David Ly';

// Check if password was provided via environment
const PASSWORD_PROVIDED = !!process.env.ADMIN_PASSWORD;
const TEMP_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('base64').slice(0, 20);

// Secure credentials file path
const CREDENTIALS_FILE = path.join(__dirname, '..', '.admin-credentials');

/**
 * Securely save generated password to a file with restricted permissions
 * @param {string} username
 * @param {string} password
 */
function saveCredentialsSecurely(username, password) {
  const content = `# Baymax IT Care - Admin Credentials
# Generated: ${new Date().toISOString()}
# IMPORTANT: Delete this file after noting the password!
#
# Username: ${username}
# Password: ${password}
#
# ⚠️  Change this password after first login!
`;

  // Write file with restricted permissions (owner read/write only)
  fs.writeFileSync(CREDENTIALS_FILE, content, { mode: 0o600 });
  return CREDENTIALS_FILE;
}

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

    // Handle password display securely
    if (PASSWORD_PROVIDED) {
      // Password was provided via environment - don't output anything about it
      console.log('   🔐 Password was set from ADMIN_PASSWORD environment variable.');
    } else {
      // Password was generated - save to secure file
      const credFile = saveCredentialsSecurely(ADMIN_USERNAME, TEMP_PASSWORD);
      console.log('   🔐 GENERATED PASSWORD SAVED TO SECURE FILE:');
      console.log(`   ${credFile}`);
      console.log('\n   ⚠️  Read the password from that file, then DELETE IT!');
      console.log('   Run: cat ' + credFile + ' && rm ' + credFile);
    }
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
