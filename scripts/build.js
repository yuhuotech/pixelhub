#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env (local development takes precedence)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const fileContent = fs.readFileSync(envPath, 'utf-8');
    const envConfig = dotenv.parse(fileContent);
    // Always load from .env file (it's the source of truth for local development)
    Object.assign(process.env, envConfig);
    console.log(`✓ Loaded .env file from ${envPath}`);
  } catch (err) {
    console.warn('Warning: Could not load .env file', err.message);
  }
}

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set. Please set it in .env or environment variables.');
  process.exit(1);
}

// Build commands
const commands = [
  {
    name: 'prisma generate',
    cmd: 'npx',
    args: ['prisma', 'generate'],
  },
  {
    name: 'prisma migrate deploy',
    cmd: 'npx',
    args: ['prisma', 'migrate', 'deploy'],
  },
  {
    name: 'prisma db seed',
    cmd: 'npx',
    args: ['prisma', 'db', 'seed'],
  },
  {
    name: 'next build',
    cmd: 'npx',
    args: ['next', 'build'],
  },
];

let currentCommand = 0;

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ Running: ${command.name}\n`);

    // Create a copy of process.env with DATABASE_URL explicitly set
    const env = { ...process.env };

    const child = spawn(command.cmd, command.args, {
      stdio: 'inherit',
      shell: false,
      env: env,
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✔ ${command.name} completed successfully\n`);
        resolve();
      } else {
        reject(new Error(`${command.name} failed with exit code ${code}`));
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
    console.log('\n✔ Build completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Build failed: ${error.message}`);
    process.exit(1);
  }
}

runBuild();
