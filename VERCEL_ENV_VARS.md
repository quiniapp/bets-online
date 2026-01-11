# Vercel Environment Variables

## Required Variables (Must Configure)

Go to your Vercel project → Settings → Environment Variables and add these:

### 1. API Backend URL
```bash
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
```

**IMPORTANT:**
- Replace `your-railway-app.up.railway.app` with your actual Railway API URL
- You can find this in Railway Dashboard → API service → Settings → Domains
- Example: `https://bets-online-api-production.up.railway.app`

### 2. Application URL
```bash
NEXT_PUBLIC_APP_URL=https://dev-arena-bett.vercel.app
```

**IMPORTANT:**
- For **Production** deployment: Use your production domain
- For **Preview** deployments: Vercel automatically sets this, but you can override
- Example production: `https://dev-arena-bett.vercel.app`

---

## How to Add Variables in Vercel

### Method 1: Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project (`dev-arena-bett`)
3. Go to **Settings** tab
4. Click **Environment Variables** in sidebar
5. Add each variable:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_API_URL`)
   - **Value**: Variable value (e.g., `https://your-api.up.railway.app`)
   - **Environments**: Select where to use it:
     - ✅ **Production** - For main branch deploys
     - ✅ **Preview** - For PR deploys
     - ⬜ **Development** - For local development (optional)
6. Click **Save**

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add environment variable
vercel env add NEXT_PUBLIC_API_URL
# Enter value when prompted
# Select environments: Production, Preview

vercel env add NEXT_PUBLIC_APP_URL
# Enter value when prompted
# Select environments: Production
```

---

## Different Environments

### Production (main branch)
```bash
NEXT_PUBLIC_API_URL=https://bets-online-api-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://dev-arena-bett.vercel.app
```

### Preview (PR branches)
```bash
NEXT_PUBLIC_API_URL=https://bets-online-api-production.up.railway.app
# OR if you enable Railway PR deployments:
# NEXT_PUBLIC_API_URL=https://pr-{number}-api-bets-online.up.railway.app

NEXT_PUBLIC_APP_URL=https://dev-arena-bett-git-{branch}-quiniapps.vercel.app
```

**Note**: For preview deployments with Railway PR environments, you'll need to configure each PR deployment URL manually or use a dynamic approach.

---

## After Adding Variables

1. **Trigger a redeploy**:
   - Go to Vercel Dashboard → Deployments
   - Click on the latest deployment
   - Click **"Redeploy"** button
   - Or push a new commit to trigger automatic deployment

2. **Verify the variables**:
   - After deployment completes, visit your site
   - Open browser DevTools → Console
   - Check that API calls are going to the correct Railway URL

---

## IMPORTANT: Update Railway CORS

After configuring Vercel, you MUST update Railway environment variables:

### In Railway Dashboard:

1. Go to your **API service** → **Variables**
2. Update **`ALLOWED_ORIGINS`** to include your Vercel URLs:

```bash
# For production only:
ALLOWED_ORIGINS=https://dev-arena-bett.vercel.app

# For production + all previews (recommended):
ALLOWED_ORIGINS=https://dev-arena-bett.vercel.app,https://dev-arena-bett-git-*.vercel.app

# Alternative (less secure but easier):
ALLOWED_ORIGINS=https://*.vercel.app
```

3. Save and Railway will redeploy automatically

---

## Troubleshooting

### "CORS error" in browser console
- ✅ Verify `ALLOWED_ORIGINS` in Railway includes your Vercel domain
- ✅ Check that Railway API is running (visit the API URL directly)
- ✅ Ensure HTTPS is used (not HTTP)

### "API calls fail" or "Network error"
- ✅ Verify `NEXT_PUBLIC_API_URL` is correct in Vercel
- ✅ Check Railway API health: visit `https://your-api.up.railway.app/doc`
- ✅ Open browser DevTools → Network tab to see the actual URL being called

### "Environment variables not updated"
- ✅ Redeploy after adding variables (Vercel doesn't auto-redeploy)
- ✅ Clear Vercel cache: Deployments → Redeploy → "Redeploy with Cache Invalidation"

---

## Example Complete Setup

### Vercel Environment Variables:
```bash
NEXT_PUBLIC_API_URL=https://bets-online-api-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://dev-arena-bett.vercel.app
```

### Railway Environment Variables (ALLOWED_ORIGINS):
```bash
ALLOWED_ORIGINS=https://dev-arena-bett.vercel.app,https://dev-arena-bett-git-*.vercel.app
```

---

## ✅ Checklist

- [ ] Added `NEXT_PUBLIC_API_URL` in Vercel
- [ ] Added `NEXT_PUBLIC_APP_URL` in Vercel
- [ ] Updated `ALLOWED_ORIGINS` in Railway
- [ ] Triggered redeploy in Vercel
- [ ] Tested the application works without CORS errors
- [ ] Verified API calls in browser DevTools

---

## 🚀 Next Steps

Once configured:
1. Visit your Vercel deployment
2. Open browser DevTools → Console
3. Try logging in or making API calls
4. Verify no CORS errors appear
5. Check Network tab shows successful API calls to Railway

✅ Your frontend and backend should now be connected!
