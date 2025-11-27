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
let originalSchema = null;

/**
 * Store original schema before any modifications
 */
const storeOriginalSchema = () => {
  try {
    originalSchema = fs.readFileSync(schemaPath, 'utf-8');
  } catch (err) {
    console.error('❌ Error reading original schema:', err.message);
    process.exit(1);
  }
};

/**
 * Replace SQLite provider with PostgreSQL for Vercel deployment
 * This allows single schema.prisma file to work in both environments
 */
const replaceProviderForVercel = () => {
  if (!isVercel) {
    console.log('✓ Local environment detected - using SQLite provider\n');
    return;
  }

  console.log('✓ Vercel environment detected - switching to PostgreSQL provider\n');

  try {
    const modified = originalSchema.replace(
      /provider\s*=\s*"sqlite"/,
      'provider = "postgresql"'
    );

    if (modified === originalSchema) {
      console.warn('⚠ Warning: Could not find SQLite provider to replace');
      return;
    }

    fs.writeFileSync(schemaPath, modified, 'utf-8');
    console.log('✓ Prisma schema provider updated to PostgreSQL\n');
  } catch (err) {
    console.error('❌ Error replacing provider:', err.message);
    process.exit(1);
  }
};

/**
 * Restore original schema file (always at end)
 */
const restoreOriginalSchema = () => {
  if (!originalSchema) return;

  try {
    fs.writeFileSync(schemaPath, originalSchema, 'utf-8');
    console.log('✓ Prisma schema restored to original state\n');
  } catch (err) {
    console.error('❌ Error restoring schema:', err.message);
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
        reject(new Error(`❌ ${command.name} failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// ============================================
// Main Build Process
// ============================================

async function runBuild() {
  // Step 1: Store original schema
  storeOriginalSchema();

  // Step 2: Replace provider if on Vercel
  replaceProviderForVercel();

  try {
    // Step 3: Execute all build commands
    for (const command of commands) {
      await executeCommand(command);
    }

    // Step 4: Restore original schema
    restoreOriginalSchema();

    console.log('✅ Vercel build completed successfully!');
    console.log('🎉 Application is ready for deployment\n');
    process.exit(0);
  } catch (error) {
    // Always restore schema, even on error
    restoreOriginalSchema();

    console.error(`\n❌ Build failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Start the build
console.log('🚀 Starting Vercel build process...\n');
runBuild();
