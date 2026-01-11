# Railway Deployment Configuration

## Monorepo Structure

This is a pnpm monorepo with a **single** `pnpm-lock.yaml` at the root.

- ✅ Root: `pnpm-lock.yaml` (the only lockfile)
- ✅ `api/`: API package (no lockfile)
- ✅ `web/`: Web package (no lockfile)
- ✅ `helper/`: Shared package (no lockfile)

## Required Railway Configuration

### In Railway Dashboard:

1. **Go to your API service** → Settings

2. **Root Directory**
   - Set to: `api`

3. **Build/Install Commands**
   - Leave empty (railpack-plan.json handles everything)

4. **Save changes** and trigger a manual redeploy

## How It Works

The `api/railpack-plan.json` configures:

1. **Install**: `cd ..` to access root `pnpm-lock.yaml`, then `pnpm install --frozen-lockfile`
2. **Build**: `pnpm run build` (runs from api directory)
3. **Start**: `pnpm run start` (runs from api directory)

## Expected Result

Railway will:
1. Set working directory to `api/`
2. Install dependencies from monorepo root (where pnpm-lock.yaml lives)
3. Build the API package
4. Start the API server

The build should complete successfully! ✅
