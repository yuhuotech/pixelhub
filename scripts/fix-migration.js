#!/usr/bin/env node

/**
 * Fix Migration Script
 *
 * Resolves failed migrations in the database before deployment.
 * Used to clean up migration history when old migrations fail.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const fileContent = fs.readFileSync(envPath, 'utf-8');
    const envConfig = dotenv.parse(fileContent);
    Object.assign(process.env, envConfig);
  } catch (err) {
    console.warn('Warning: Could not load .env file', err.message);
  }
}

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🔧 Attempting to resolve failed migrations...\n');

const migrationName = process.argv[2] || '20251127000000_add_missing_fields';

const child = spawn('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', migrationName], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
  cwd: process.cwd(),
});

child.on('close', (code) => {
  if (code === 0) {
    console.log(`\n✅ Successfully resolved migration: ${migrationName}`);
    console.log('✅ You can now retry the deployment');
    process.exit(0);
  } else {
    console.error(`\n❌ Failed to resolve migration`);
    process.exit(1);
  }
});

child.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});
