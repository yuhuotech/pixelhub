#!/usr/bin/env node

/**
 * Vercel Build Script
 *
 * This script is specifically designed for Vercel deployments.
 * It ensures proper execution order of database migrations and Next.js build.
 *
 * Steps:
 * 1. Generate Prisma Client
 * 2. Apply database migrations (critical for schema synchronization)
 * 3. Seed database with initial data
 * 4. Build Next.js application
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

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

console.log('🚀 Starting Vercel build process...\n');

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

async function runBuild() {
  try {
    for (const command of commands) {
      await executeCommand(command);
    }
    console.log('✅ Vercel build completed successfully!');
    console.log('🎉 Application is ready for deployment\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Build failed: ${error.message}\n`);
    process.exit(1);
  }
}

runBuild();
