#!/usr/bin/env node

/**
 * Migration Reset/Recovery Script
 *
 * This script provides options to reset or recover from migration issues:
 * - Diagnose current migration state
 * - Mark specific migrations as applied (for partially created tables)
 * - Mark specific migrations as rolled back
 * - Complete database reset (careful!)
 *
 * Usage:
 *   node scripts/reset-migrations.js diagnose              # Show current state
 *   node scripts/reset-migrations.js mark-applied <id>     # Mark migration as applied
 *   node scripts/reset-migrations.js mark-rolled-back <id> # Mark migration as rolled back
 *   node scripts/reset-migrations.js reset                 # Complete reset (DESTRUCTIVE)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

// ============================================
// Setup
// ============================================

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

/**
 * Execute a Prisma command
 */
function executePrismaCommand(args, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${description}`);
    console.log();

    const child = spawn('npx', ['prisma', ...args], {
      stdio: 'inherit',
      shell: false,
      env: process.env,
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully\n`);
        resolve();
      } else {
        reject(new Error(`${description} failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Ask for user confirmation
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Diagnose current state
 */
async function diagnose() {
  console.log('🔍 Diagnosing migration state...\n');

  try {
    const child = spawn('node', ['scripts/diagnose-migrations.js'], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    await new Promise((resolve) => {
      child.on('close', resolve);
    });
  } catch (err) {
    console.error('Error running diagnostics:', err.message);
    process.exit(1);
  }
}

/**
 * Mark a migration as applied
 */
async function markApplied(migrationId) {
  if (!migrationId) {
    console.error('❌ Migration ID is required');
    console.error('Usage: node scripts/reset-migrations.js mark-applied <migration-id>');
    console.error('Example: node scripts/reset-migrations.js mark-applied 20251127000000_init');
    process.exit(1);
  }

  console.log(`\n⚠️  Mark migration as APPLIED: ${migrationId}`);
  console.log('This will tell Prisma that this migration was already applied.');
  console.log('Use this when database tables exist but Prisma doesnt know about it.\n');

  const confirmed = await askConfirmation('Continue? (y/n) ');
  if (!confirmed) {
    console.log('Cancelled.');
    process.exit(0);
  }

  try {
    await executePrismaCommand(
      ['migrate', 'resolve', '--applied', migrationId],
      `Marking migration ${migrationId} as applied`
    );
    console.log('✓ Migration marked as applied');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

/**
 * Mark a migration as rolled back
 */
async function markRolledBack(migrationId) {
  if (!migrationId) {
    console.error('❌ Migration ID is required');
    console.error('Usage: node scripts/reset-migrations.js mark-rolled-back <migration-id>');
    console.error('Example: node scripts/reset-migrations.js mark-rolled-back 20251127000000_init');
    process.exit(1);
  }

  console.log(`\n⚠️  Mark migration as ROLLED BACK: ${migrationId}`);
  console.log('This will remove this migration from the applied list.');
  console.log('Use this when a migration needs to be re-applied.\n');

  const confirmed = await askConfirmation('Continue? (y/n) ');
  if (!confirmed) {
    console.log('Cancelled.');
    process.exit(0);
  }

  try {
    await executePrismaCommand(
      ['migrate', 'resolve', '--rolled-back', migrationId],
      `Marking migration ${migrationId} as rolled back`
    );
    console.log('✓ Migration marked as rolled back');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

/**
 * Reset database completely
 */
async function reset() {
  console.log('\n🚨 DATABASE RESET');
  console.log('This will:');
  console.log('  1. Delete all tables from the database');
  console.log('  2. Clear migration history');
  console.log('  3. Re-apply all migrations from scratch\n');

  const confirmed1 = await askConfirmation('Are you sure? (y/n) ');
  if (!confirmed1) {
    console.log('Cancelled.');
    process.exit(0);
  }

  const confirmed2 = await askConfirmation('This cannot be undone. Confirm again? (y/n) ');
  if (!confirmed2) {
    console.log('Cancelled.');
    process.exit(0);
  }

  try {
    await executePrismaCommand(
      ['migrate', 'reset', '--force'],
      'Resetting database'
    );
    await executePrismaCommand(
      ['db', 'seed'],
      'Seeding database with initial data'
    );
    console.log('✓ Database reset complete');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// ============================================
// CLI
// ============================================

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'diagnose':
    diagnose().catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
    break;

  case 'mark-applied':
    markApplied(arg).catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
    break;

  case 'mark-rolled-back':
    markRolledBack(arg).catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
    break;

  case 'reset':
    reset().catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
    break;

  default:
    console.log('Migration Recovery Tool\n');
    console.log('Usage:');
    console.log('  node scripts/reset-migrations.js diagnose              # Show current state');
    console.log('  node scripts/reset-migrations.js mark-applied <id>     # Mark migration as applied');
    console.log('  node scripts/reset-migrations.js mark-rolled-back <id> # Mark migration as rolled back');
    console.log('  node scripts/reset-migrations.js reset                 # Complete database reset\n');
    console.log('Examples:');
    console.log('  node scripts/reset-migrations.js diagnose');
    console.log('  node scripts/reset-migrations.js mark-applied 20251127000000_init');
    console.log('  node scripts/reset-migrations.js reset\n');
    break;
}
