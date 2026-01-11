# Railway Deployment Configuration

## Current Issue
Railway was failing because it was configured with Root Directory = `api`, which prevented access to the monorepo's `pnpm-lock.yaml`.

## Required Configuration Changes

### In Railway Dashboard:

1. **Go to your API service** → Settings

2. **Root Directory**
   - Change from: `api`
   - Change to: `.` (dot - represents root of repository)

3. **Build Command** (optional, railpack-plan.json handles this)
   - Can leave empty or set to: `cd api && pnpm run build`

4. **Start Command** (optional, railpack-plan.json handles this)
   - Can leave empty or set to: `cd api && pnpm run start`

5. **Install Command** (optional, railpack-plan.json handles this)
   - Can leave empty or set to: `pnpm install --frozen-lockfile`

6. **Save changes** and trigger a manual redeploy

## What Changed

- Created `railpack-plan.json` at repository root
- Moved configuration from `api/railpack-plan.json` to root
- Commands now execute relative to repository root

## Expected Result

Railway will:
1. Install dependencies from root (where pnpm-lock.yaml with bcrypt ^6.0.0 lives)
2. Build the API package
3. Start the API server

The build should complete successfully! ✅
