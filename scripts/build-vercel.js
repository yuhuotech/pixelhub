#!/usr/bin/env node

/**
 * Vercel Build Script with Dynamic Database Provider Replacement
 *
 * This script intelligently handles both Vercel and local environments:
 * - Detects if running on Vercel (via VERCEL environment variable)
 * - Automatically switches database provider from SQLite → PostgreSQL on Vercel
 * - Maintains single schema.prisma source for both environments
 * - Restores original schema after build
 *
 * Build Steps:
 * 1. Load environment variables
 * 2. Detect environment (Vercel vs local)
 * 3. Replace Prisma provider if needed (SQLite → PostgreSQL)
 * 4. Generate Prisma Client
 * 5. Apply database migrations (critical!)
 * 6. Seed database with initial data
 * 7. Build Next.js application
 * 8. Restore original schema file
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// ============================================
// Environment & Configuration Setup
// ============================================

// Load environment variables from .env if it exists (local development)
// Vercel will use system environment variables instead
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const fileContent = fs.readFileSync(envPath, 'utf-8');
    const envConfig = dotenv.parse(fileContent);
    Object.assign(process.env, envConfig);
    console.log(`✓ Loaded .env file\n`);
  } catch (err) {
    console.warn('Warning: Could not load .env file', err.message);
  }
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  console.error('   Local development: set in .env file');
  console.error('   Vercel deployment: configure DATABASE_URL in Vercel project settings');
  process.exit(1);
}

// ============================================
// Detect Environment & Schema Management
// ============================================

const isVercel = !!process.env.VERCEL;
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const migrationLockPath = path.join(__dirname, '..', 'prisma', 'migrations', 'migration_lock.toml');
const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

let originalSchema = null;
let originalMigrationLock = null;
let originalMigrationSQLs = {}; // Store all migration SQL files

/**
 * Store original files before any modifications
 */
const storeOriginalFiles = () => {
  try {
    originalSchema = fs.readFileSync(schemaPath, 'utf-8');
    originalMigrationLock = fs.readFileSync(migrationLockPath, 'utf-8');

    // Store all migration SQL files
    const migrations = fs.readdirSync(migrationsDir);
    for (const migration of migrations) {
      if (migration.startsWith('.')) continue;
      const sqlPath = path.join(migrationsDir, migration, 'migration.sql');
      if (fs.existsSync(sqlPath)) {
        originalMigrationSQLs[sqlPath] = fs.readFileSync(sqlPath, 'utf-8');
      }
    }
  } catch (err) {
    console.error('❌ Error reading original files:', err.message);
    process.exit(1);
  }
};

/**
 * Replace SQLite provider with PostgreSQL for Vercel deployment
 * This allows single schema.prisma file to work in both environments
 * Also updates migration_lock.toml and converts SQL syntax
 */
const replaceProviderForVercel = () => {
  if (!isVercel) {
    console.log('✓ Local environment detected - using SQLite provider\n');
    return;
  }

  console.log('✓ Vercel environment detected - switching to PostgreSQL provider\n');

  try {
    // Replace in schema.prisma
    const modifiedSchema = originalSchema.replace(
      /provider\s*=\s*"sqlite"/,
      'provider = "postgresql"'
    );

    if (modifiedSchema === originalSchema) {
      console.warn('⚠ Warning: Could not find SQLite provider in schema to replace');
      return;
    }

    // Replace in migration_lock.toml
    const modifiedLock = originalMigrationLock.replace(
      /provider\s*=\s*"sqlite"/,
      'provider = "postgresql"'
    );

    // Convert SQLite SQL syntax to PostgreSQL in migration files
    // DATETIME -> TIMESTAMP (PostgreSQL doesn't support DATETIME)
    for (const [sqlPath, originalSQL] of Object.entries(originalMigrationSQLs)) {
      const modifiedSQL = originalSQL.replace(/DATETIME/g, 'TIMESTAMP');
      if (modifiedSQL !== originalSQL) {
        fs.writeFileSync(sqlPath, modifiedSQL, 'utf-8');
      }
    }

    fs.writeFileSync(schemaPath, modifiedSchema, 'utf-8');
    fs.writeFileSync(migrationLockPath, modifiedLock, 'utf-8');
    console.log('✓ Prisma schema, migration lock, and migration SQL syntax updated to PostgreSQL\n');
  } catch (err) {
    console.error('❌ Error replacing provider:', err.message);
    process.exit(1);
  }
};

/**
 * Restore original files (always at end)
 */
const restoreOriginalFiles = () => {
  try {
    if (originalSchema) {
      fs.writeFileSync(schemaPath, originalSchema, 'utf-8');
    }
    if (originalMigrationLock) {
      fs.writeFileSync(migrationLockPath, originalMigrationLock, 'utf-8');
    }
    // Restore all migration SQL files
    for (const [sqlPath, originalSQL] of Object.entries(originalMigrationSQLs)) {
      fs.writeFileSync(sqlPath, originalSQL, 'utf-8');
    }
    console.log('✓ Prisma schema, migration lock, and migration SQL restored to original state\n');
  } catch (err) {
    console.error('❌ Error restoring files:', err.message);
  }
};

// ============================================
// Build Commands
// ============================================

const commands = [
  {
    name: 'Generate Prisma Client',
    cmd: 'npx',
    args: ['prisma', 'generate'],
  },
  {
    name: 'Resolve Failed Migrations - Old (if any)',
    cmd: 'npx',
    args: ['prisma', 'migrate', 'resolve', '--rolled-back', '20251127000000_add_missing_fields'],
    description: 'Cleaning up old failed migrations from previous deployments',
    optional: true,  // Don't fail if this migration doesn't exist
  },
  {
    name: 'Resolve Failed Migrations - Current (if any)',
    cmd: 'npx',
    args: ['prisma', 'migrate', 'resolve', '--rolled-back', '20251127000000_init'],
    description: 'Cleaning up current migration failures from this or previous deployments',
    optional: true,  // Don't fail if this migration hasn't failed
  },
  {
    name: 'Apply Database Migrations',
    cmd: 'npx',
    args: ['prisma', 'migrate', 'deploy'],
    description: 'Synchronizing database schema with Prisma migrations',
  },
  {
    name: 'Seed Database',
    cmd: 'npx',
    args: ['prisma', 'db', 'seed'],
    description: 'Initializing database with admin user and settings',
  },
  {
    name: 'Build Next.js Application',
    cmd: 'npx',
    args: ['next', 'build'],
  },
];

// ============================================
// Command Execution
// ============================================

/**
 * Execute a single command with proper error handling
 * Supports optional commands that don't fail the build if they fail
 */
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${command.name}`);
    if (command.description) {
      console.log(`  ${command.description}`);
    }
    console.log();

    const child = spawn(command.cmd, command.args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${command.name} completed successfully\n`);
        resolve();
      } else {
        // For optional commands, log warning but continue
        if (command.optional) {
          console.log(`⚠️  ${command.name} failed with exit code ${code}, but continuing (optional)\n`);
          resolve();
        } else {
          reject(new Error(`❌ ${command.name} failed with exit code ${code}`));
        }
      }
    });

    child.on('error', (err) => {
      // For optional commands, log warning but continue
      if (command.optional) {
        console.log(`⚠️  ${command.name} encountered error, but continuing (optional): ${err.message}\n`);
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

// ============================================
// Main Build Process
// ============================================

async function runBuild() {
  // Step 1: Store original files
  storeOriginalFiles();

  // Step 2: Replace provider if on Vercel
  replaceProviderForVercel();

  try {
    // Step 3: Execute all build commands
    for (const command of commands) {
      await executeCommand(command);
    }

    // Step 4: Restore original files
    restoreOriginalFiles();

    console.log('✅ Vercel build completed successfully!');
    console.log('🎉 Application is ready for deployment\n');
    process.exit(0);
  } catch (error) {
    // Always restore files, even on error
    restoreOriginalFiles();

    console.error(`\n❌ Build failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Start the build
console.log('🚀 Starting Vercel build process...\n');
runBuild();
