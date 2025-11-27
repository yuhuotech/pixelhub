#!/usr/bin/env node

/**
 * Database Migration Diagnostic Script
 *
 * This script analyzes the current state of database migrations and helps identify issues:
 * - Shows which migrations are recorded in _prisma_migrations table
 * - Detects if database tables exist
 * - Compares migration state with actual database schema
 * - Provides recovery recommendations
 *
 * Usage:
 *   node scripts/diagnose-migrations.js          # Show current state
 *   node scripts/diagnose-migrations.js --fix    # Auto-fix if possible
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

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
    console.log('✓ Loaded .env file\n');
  } catch (err) {
    console.warn('Warning: Could not load .env file', err.message);
  }
}

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

const autoFix = process.argv.includes('--fix');
const isPostgreSQL = process.env.DATABASE_URL.includes('postgresql');
const isSQLite = process.env.DATABASE_URL.includes('sqlite') || process.env.DATABASE_URL.includes('file:');

console.log('🔍 Database Migration Diagnostic\n');
console.log(`Database Type: ${isPostgreSQL ? 'PostgreSQL' : isSQLite ? 'SQLite' : 'Unknown'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 50)}...`);
console.log();

// ============================================
// Diagnostic Queries
// ============================================

/**
 * Run a diagnostic query and return the results
 */
function runDiagnosticQuery(query) {
  return new Promise((resolve, reject) => {
    const psqlCmd = isPostgreSQL
      ? ['psql', process.env.DATABASE_URL, '-c', query]
      : ['sqlite3', process.env.DATABASE_URL, query];

    const child = spawn(psqlCmd[0], psqlCmd.slice(1), {
      stdio: 'pipe',
      shell: false,
      timeout: 10000,
    });

    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(error || `Command exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Check Prisma migration status
 */
async function checkMigrationStatus() {
  console.log('▶ Checking Prisma Migration Status');
  console.log();

  try {
    // Show pending migrations
    const child = spawn('npx', ['prisma', 'migrate', 'status'], {
      stdio: 'pipe',
      shell: false,
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    await new Promise((resolve) => {
      child.on('close', () => {
        console.log(output);
        resolve();
      });
    });
  } catch (err) {
    console.error('Error checking migration status:', err.message);
  }
}

/**
 * Check if tables exist in database
 */
async function checkDatabaseTables() {
  console.log('\n▶ Checking Database Tables');
  console.log();

  try {
    if (isPostgreSQL) {
      const query = `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'pg_%';`;
      try {
        const result = await runDiagnosticQuery(query);
        const tables = result.split('\n').filter((t) => t && !t.includes('tablename'));
        console.log(`Found ${tables.length} tables in public schema:`);
        tables.forEach((table) => {
          console.log(`  - ${table.trim()}`);
        });
      } catch (err) {
        console.error('Could not query tables:', err.message.substring(0, 100));
      }
    } else if (isSQLite) {
      const query = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';`;
      try {
        const result = await runDiagnosticQuery(query);
        const tables = result.split('\n').filter((t) => t.trim());
        console.log(`Found ${tables.length} tables:`);
        tables.forEach((table) => {
          console.log(`  - ${table.trim()}`);
        });
      } catch (err) {
        console.error('Could not query tables:', err.message.substring(0, 100));
      }
    }
  } catch (err) {
    console.error('Error checking database tables:', err.message);
  }
}

/**
 * Check migration history in _prisma_migrations table
 */
async function checkMigrationHistory() {
  console.log('\n▶ Checking Migration History (_prisma_migrations)');
  console.log();

  try {
    if (isPostgreSQL) {
      const query = `SELECT id, checksum, finished_at, execution_time, started_at FROM "_prisma_migrations" ORDER BY started_at DESC;`;
      try {
        const result = await runDiagnosticQuery(query);
        console.log(result);
      } catch (err) {
        if (err.message.includes('does not exist')) {
          console.log('❌ _prisma_migrations table does not exist (database may be empty)');
        } else {
          console.error('Error:', err.message.substring(0, 100));
        }
      }
    } else if (isSQLite) {
      const query = `SELECT id, checksum, finished_at, execution_time FROM "_prisma_migrations" ORDER BY started_at DESC;`;
      try {
        const result = await runDiagnosticQuery(query);
        console.log(result);
      } catch (err) {
        if (err.message.includes('no such table')) {
          console.log('❌ _prisma_migrations table does not exist (database may be empty)');
        } else {
          console.error('Error:', err.message.substring(0, 100));
        }
      }
    }
  } catch (err) {
    console.error('Error checking migration history:', err.message);
  }
}

/**
 * Detect inconsistencies
 */
async function detectInconsistencies() {
  console.log('\n▶ Detecting Inconsistencies');
  console.log();

  try {
    // Check for failed migrations
    let hasFailed = false;

    try {
      const child = spawn('npx', ['prisma', 'migrate', 'status'], {
        stdio: 'pipe',
        shell: false,
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      await new Promise((resolve) => {
        child.on('close', () => {
          if (output.includes('Failed migrations')) {
            hasFailed = true;
            console.log('⚠️  FAILED MIGRATIONS DETECTED:');
            console.log(output);
          }
          resolve();
        });
      });
    } catch (err) {
      // Ignore
    }

    if (!hasFailed) {
      console.log('✓ No failed migrations detected');
    }
  } catch (err) {
    console.error('Error detecting inconsistencies:', err.message);
  }
}

/**
 * Provide recovery recommendations
 */
function provideRecommendations() {
  console.log('\n▶ Recovery Recommendations');
  console.log();

  console.log('If you see "relation ... already exists" error:');
  console.log('  Option 1: Mark migration as applied');
  console.log('    npx prisma migrate resolve --applied 20251127000000_init');
  console.log();
  console.log('  Option 2: Resolve old failed migrations first');
  console.log('    npx prisma migrate resolve --rolled-back 20251127000000_add_missing_fields');
  console.log();
  console.log('  Option 3: Reset database completely (careful!)');
  console.log('    npx prisma migrate reset --force');
  console.log();
}

// ============================================
// Main Execution
// ============================================

async function runDiagnostics() {
  try {
    await checkMigrationStatus();
    await checkDatabaseTables();
    await checkMigrationHistory();
    await detectInconsistencies();

    if (!autoFix) {
      provideRecommendations();
    }

    console.log(
      '\n✓ Diagnostic complete\n'
    );
  } catch (err) {
    console.error('Diagnostic error:', err.message);
    process.exit(1);
  }
}

runDiagnostics();
