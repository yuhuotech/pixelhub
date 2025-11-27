# Migration Troubleshooting Guide

This document covers common database migration issues and how to resolve them, particularly for Vercel PostgreSQL deployments.

## Quick Diagnosis

Start here if you have migration issues:

```bash
# 1. See what's currently happening
node scripts/diagnose-migrations.js

# 2. Check Prisma's view of migration status
npx prisma migrate status

# 3. Open database GUI (local SQLite only)
npx prisma studio
```

## Common Issues & Solutions

### Issue 1: "relation User already exists"

**What this means:**
- Previous deployment partially created database tables
- Migration was marked as failed in `_prisma_migrations` table
- New deployment tries to create tables again → conflict

**Quick Fix:**
```bash
node scripts/reset-migrations.js mark-applied 20251127000000_init
```

Then retry your deployment.

**Why it works:**
- Tells Prisma: "These tables already exist, don't try to create them"
- Marks the init migration as applied in the migration history
- Next deployment will skip table creation but can run other migrations

---

### Issue 2: "failed migrations" blocking deployment

**What this means:**
- `prisma migrate deploy` shows failed migrations that need resolution
- Orphaned migrations from previous failed deployments

**Quick Fix:**
```bash
# First: resolve old failed migrations
node scripts/reset-migrations.js mark-rolled-back 20251127000000_add_missing_fields

# Then: retry your deployment
```

**Why it works:**
- Removes the orphaned migration from the history
- Allows `prisma migrate deploy` to proceed without conflicts

---

### Issue 3: "database schema is not empty"

**What this means:**
- Database has tables but migration history doesn't know about them
- Prisma can't match current schema to migration state

**Diagnosis Steps:**
```bash
# Understand the current state
node scripts/diagnose-migrations.js

# Check what tables exist in database
npx prisma studio

# Check what Prisma thinks is applied
npx prisma migrate status
```

**Solutions:**

If tables exist and match the schema:
```bash
node scripts/reset-migrations.js mark-applied 20251127000000_init
```

If you want to start fresh (DESTRUCTIVE - loses all data):
```bash
node scripts/reset-migrations.js reset
```

---

### Issue 4: "type datetime does not exist" on Vercel

**What this means:**
- SQLite uses `DATETIME` type
- PostgreSQL doesn't support `DATETIME`, needs `TIMESTAMP`
- Migration files have SQLite syntax

**This is automatically handled:**
The `build-vercel.js` script automatically converts:
- `provider = "sqlite"` → `provider = "postgresql"`
- `DATETIME` → `TIMESTAMP` in migration files

**If it still fails:**
- Verify that `build-vercel.js` is being used in vercel.json
- Check that migration files have correct syntax after conversion
- Run diagnostics: `node scripts/diagnose-migrations.js`

---

## Manual Migration Recovery

### For Development/Local SQLite

**See current state:**
```bash
npx prisma migrate status
npx prisma studio
```

**Create a new migration:**
```bash
npx prisma migrate dev --name descriptive_name
```

**Apply all pending migrations:**
```bash
npx prisma migrate deploy
```

**Reset database (careful!):**
```bash
npx prisma migrate reset --force
```

### For Vercel/PostgreSQL

Use the reset-migrations.js script:

```bash
# See current state
node scripts/reset-migrations.js diagnose

# Mark a migration as applied (if tables exist)
node scripts/reset-migrations.js mark-applied 20251127000000_init

# Mark a migration as rolled back (if it needs to be redone)
node scripts/reset-migrations.js mark-rolled-back 20251127000000_add_missing_fields

# Complete reset (DESTRUCTIVE - loses all data)
node scripts/reset-migrations.js reset
```

---

## Understanding the Migration System

### Single Idempotent Migration Philosophy

This project uses a single comprehensive migration:
- **File**: `prisma/migrations/20251127000000_init/migration.sql`
- **Contains**: All tables (User, Image, Settings) in one file
- **Idempotent**: Can be applied multiple times safely
- **Benefit**: No partial state issues from incomplete migrations

### Multi-Database Support

**Source of Truth (always SQLite):**
- `/prisma/schema.prisma` → `provider = "sqlite"`
- `/prisma/migrations/migration_lock.toml` → `provider = "sqlite"`

**At Vercel Build Time** (`scripts/build-vercel.js`):
1. Stores original files
2. Replaces `sqlite` → `postgresql`
3. Converts SQL syntax (`DATETIME` → `TIMESTAMP`)
4. Runs Prisma commands
5. Restores original files

**Benefit**: Single codebase works for both SQLite (local) and PostgreSQL (Vercel).

---

## Detailed Scenario Walkthroughs

### Scenario A: Clean Vercel Deployment

**Expected Flow:**
```
1. build-vercel.js detects VERCEL env var
2. Stores original schema (sqlite)
3. Replaces provider to postgresql
4. Converts migration SQL syntax
5. npx prisma generate
6. npx prisma migrate status → shows "3 pending migrations" (first time)
7. npx prisma migrate deploy → creates tables
8. npx prisma db seed → creates admin user
9. next build → compiles app
10. Restores original schema (sqlite)
```

**Success indicators:**
- All steps show ✅
- No "failed migrations" errors
- Vercel deployment completes
- App loads at https://your-vercel-url.com

---

### Scenario B: Partial Table Creation (relation ... already exists)

**What Happened:**
- Previous deployment created tables
- But then failed before marking migration as applied
- Tables exist, migration history doesn't know

**Recovery:**
```bash
# Step 1: Diagnose
node scripts/diagnose-migrations.js
# Should show:
# - Tables exist (User, Image, Settings)
# - But _prisma_migrations shows failed or missing init migration

# Step 2: Fix
node scripts/reset-migrations.js mark-applied 20251127000000_init

# Step 3: Verify
npx prisma migrate status
# Should now show "Database is up to date" (no pending migrations)

# Step 4: Retry Vercel deployment
# In Vercel Dashboard: Deployments → Redeploy (or push to main)
```

---

### Scenario C: Orphaned Failed Migration

**What Happened:**
- Multiple deployment attempts created orphaned migration records
- `_prisma_migrations` has entries from failed attempts
- `prisma migrate deploy` can't proceed

**Recovery:**
```bash
# Step 1: See the orphaned migrations
npx prisma migrate status
# Shows: "Failed migrations" list

# Step 2: Resolve them
node scripts/reset-migrations.js mark-rolled-back 20251127000000_add_missing_fields

# Step 3: Check again
npx prisma migrate status

# Step 4: Retry deployment
```

---

### Scenario D: Complete Fresh Start (Destructive)

**Use only if:**
- Data loss is acceptable
- Other approaches didn't work
- Want guaranteed clean state

**Steps:**
```bash
# Option 1: Local development
npx prisma migrate reset --force

# Option 2: Using recovery script
node scripts/reset-migrations.js reset

# This will:
# 1. Delete all tables
# 2. Clear migration history
# 3. Re-apply all migrations
# 4. Re-seed with admin user
```

**For Vercel:**
Manual intervention required:
1. Delete Vercel PostgreSQL database (carefully!)
2. Or add query to Vercel PostgreSQL database admin panel
3. Run new deployment - it will recreate everything

---

## Prevention Best Practices

1. **Keep migrations simple and idempotent**
   - Single comprehensive migration > multiple small ones
   - Can safely apply multiple times

2. **Always test locally first**
   ```bash
   npm run build  # Test local build
   npm run dev    # Verify app works
   ```

3. **Monitor Vercel deployments**
   - Check Vercel Dashboard → Functions → Logs
   - Look for Prisma errors early
   - Don't let failed deployments accumulate

4. **Document schema changes**
   - Update CLAUDE.md when adding new tables/fields
   - Note any database-specific changes

5. **Regular backups**
   - For production data, enable Vercel PostgreSQL backups
   - Test recovery procedures

---

## For Next Developer

If you encounter migration issues:

1. Run: `node scripts/diagnose-migrations.js`
2. Read output carefully - it tells you the state
3. Choose the appropriate fix from this guide
4. Test locally first if possible
5. Verify with `npx prisma migrate status`
6. Then retry deployment

If something new happens:
1. Document it in this file
2. Create a new diagnostic script if needed
3. Share findings with the team

---

## Related Files

- `scripts/build-vercel.js` - Handles multi-database build
- `scripts/diagnose-migrations.js` - Diagnostic tool
- `scripts/reset-migrations.js` - Recovery tool
- `prisma/schema.prisma` - Data model (source of truth)
- `prisma/migrations/` - Migration files
- `vercel.json` - Vercel build configuration
- `.nvmrc` - Node version specification
