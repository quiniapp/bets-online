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
   - Set to: `.` (dot - this is the monorepo root)
   - **IMPORTANT**: Must be `.` not `api` so helper package is accessible at runtime

3. **Build/Install Commands**
   - Leave empty (api/railpack-plan.json handles everything)

4. **Save changes** and trigger a manual redeploy

## How It Works

The `api/railpack-plan.json` configures:

1. **Install**: `pnpm install --frozen-lockfile` (runs from monorepo root)
2. **Build**: Builds `helper` package first, then `api` package (both use pnpm filters)
3. **Start**: `cd api && node dist/server.js` (changes to api directory, then starts server)

## Why Root Directory Must Be `.` (Monorepo Root)

When Root Directory is set to `api`:
- ❌ Runtime cannot find `helper` module (it's outside api/)
- ❌ Symlink `api/node_modules/helper -> ../helper` is broken

When Root Directory is set to `.` (monorepo root):
- ✅ Runtime has access to all packages (api, helper, web)
- ✅ Symlinks work correctly: `node_modules/helper -> ./helper`
- ✅ `require('helper')` resolves successfully

## Expected Result

Railway will:
1. Set working directory to monorepo root (`.`)
2. Install all dependencies with pnpm workspace
3. Build helper package, then API package
4. Start the API server from `api/dist/server.js`

The build AND runtime should complete successfully! ✅
