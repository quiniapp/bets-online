# Railway Environment Variables

## Required Variables (Must Configure)

Go to your Railway project → API service → Variables tab and add these:

### 1. Database
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

**IMPORTANT for Supabase users:**
- ❌ **DO NOT** use "Direct Connection" URL (port 5432) - Railway doesn't support IPv6
- ✅ **USE** "Session Pooler" URL (port 6543) - Supports IPv4

**Where to find it in Supabase:**
1. Go to your Supabase project → Settings → Database
2. Scroll to "Connection string"
3. Select **"Session mode"** (NOT "Direct connection")
4. Copy the URI and replace `[YOUR-PASSWORD]` with your database password
5. Example: `postgresql://postgres.xxxxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

**Get this from**:
- Supabase: Session Pooler connection string (port 6543)
- Railway PostgreSQL plugin: Direct URL works (internal network)
- Other providers: Standard PostgreSQL connection URL

### 2. JWT Secrets (min 32 characters each)
```bash
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long
SESSION_SECRET=your-super-secret-session-key-min-32-characters-long
```

**Generate these with**:
```bash
# Run this 3 times to generate 3 different secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. CORS Origins
```bash
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://dev-arena-bett.vercel.app
```
**Note**: Add your Vercel deployment URL(s) separated by commas

---

## Optional Variables (Recommended)

```bash
# Environment
NODE_ENV=production

# Server (Railway auto-sets PORT)
API_URL=https://your-railway-app.up.railway.app

# Admin Bootstrap (optional - creates initial admin user)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword123!
ADMIN_USERNAME=admin
```

---

## How to Add Variables in Railway

1. Go to https://railway.app
2. Open your project
3. Click on your API service
4. Go to "Variables" tab
5. Click "New Variable"
6. Add each variable with its value
7. Railway will automatically redeploy

---

## Example Complete Setup

```bash
# Required
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Railway auto-fills if using Railway Postgres
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_REFRESH_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
SESSION_SECRET=m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4e5f6g7h8i9j0k1l2
ALLOWED_ORIGINS=https://dev-arena-bett.vercel.app

# Optional
NODE_ENV=production
ADMIN_EMAIL=admin@betarena.com
ADMIN_PASSWORD=ChangeThisPassword123!
ADMIN_USERNAME=superadmin
```

---

## After Adding Variables

Railway will automatically trigger a new deployment.
Check the logs to confirm the app starts successfully.

You should see:
```
✅ Environment Configuration:
   Environment: production
   Port: XXXX
   Database: postgresql://...
   CORS Origins: https://...
```
