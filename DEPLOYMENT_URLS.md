# Deployment URLs - Quick Reference

## 🌐 Production URLs

### Frontend (Vercel)
- **URL**: https://dev-arena-bett.vercel.app
- **Dashboard**: https://vercel.com/quiniapps-projects/dev-arena-bett

### Backend (Railway)
- **API URL**: https://api-develop-9201.up.railway.app
- **API Docs**: https://api-develop-9201.up.railway.app/doc
- **Dashboard**: https://railway.app

---

## ⚙️ Quick Configuration

### Vercel Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://api-develop-9201.up.railway.app
NEXT_PUBLIC_APP_URL=https://dev-arena-bett.vercel.app
```

**Where to add**: Vercel Dashboard → Settings → Environment Variables → Production + Preview

### Railway Environment Variables

```bash
ALLOWED_ORIGINS=https://dev-arena-bett.vercel.app,https://dev-arena-bett-git-*.vercel.app
```

**Where to add**: Railway Dashboard → API service → Variables

---

## 🧪 Testing URLs

After configuration, test these endpoints:

- ✅ Frontend: https://dev-arena-bett.vercel.app
- ✅ API Health: https://api-develop-9201.up.railway.app/doc
- ✅ API Auth: https://api-develop-9201.up.railway.app/api/auth/login

---

## 📝 Preview Deployments

### Frontend Preview Pattern
```
https://dev-arena-bett-git-{branch-name}-quiniapps.vercel.app
```

Example:
```
https://dev-arena-bett-git-fix-railway-database-connection-quiniapps.vercel.app
```

### Backend Preview Pattern (if Railway PR deployments enabled)
```
https://pr-{number}-api-bets-online.up.railway.app
```

---

## 🔄 After Configuration

1. ✅ Add environment variables in Vercel
2. ✅ Update ALLOWED_ORIGINS in Railway
3. ✅ Redeploy in Vercel
4. ✅ Test the application
5. ✅ Check browser console for CORS errors

---

## 📚 Detailed Documentation

- [Vercel Configuration](./VERCEL_ENV_VARS.md)
- [Railway Configuration](./RAILWAY_ENV_VARS.md)
- [Preview Deployments](./PREVIEW_DEPLOYMENTS.md)
