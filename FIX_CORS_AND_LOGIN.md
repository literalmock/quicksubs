# Fix CORS Error & Login - Quick Start

## What Was Fixed

✅ **CORS error** - Backend wasn't accessible
✅ **Login errors** - Better error messages & debugging
✅ **Backend health check** - Detects if server is running
✅ **Network error handling** - Clear instructions when things fail
✅ **Development setup** - Complete environment files included

## 3-Step Setup to Test Login

### Step 1: Install & Configure Backend

```bash
cd kalakar-ai/server

# Install dependencies
npm install

# Backend .env file is already created in:
# kalakar-ai/server/.env
# (Uses port 5000 - verify with: grep PORT .env)
```

### Step 2: Start Backend Server

```bash
cd kalakar-ai/server
npm run dev
```

Wait for this message:
```
🚀 Server running on port 5000 [development]
```

**Keep this terminal open!**

### Step 3: Start Frontend & Test

```bash
# In a NEW terminal:
cd kalakar-ai/app

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Wait for:
```
➜  Local:   http://localhost:5173/
```

### Step 4: Test Login

1. Open `http://localhost:5173` in browser
2. You should see the login page (WITHOUT red "Backend Not Available" alert)
3. Use these credentials:
   - Email: `sg946511@gmail.com`
   - Password: `Jlkufkgb`
4. Click "Sign In"

---

## What You'll See Now

### Good Signs ✅
- Login page loads (no console errors)
- "Backend Available" message in dev info section
- Can click login button
- After login, redirects to dashboard

### Debug Console (F12 → Console)
```
[v0] API Request: { method: 'GET', url: 'http://localhost:5000/health' }
[v0] Backend Health: { status: 'ok', uptime: 123 }
[v0] API Request: { method: 'POST', url: 'http://localhost:5000/auth/login' }
[v0] API Response: { status: 200, data: { user: { ... } } }
```

---

## If You Still Get CORS Error

The red alert says: **"Backend Not Available"**

**This means:** Server on port 5000 is not running or not responding

### Quick Fix:
```bash
# Check if backend is running
curl http://localhost:5000/health

# If that fails, make sure you:
# 1. Did: cd kalakar-ai/server && npm run dev
# 2. Wait 3 seconds for startup
# 3. Check for error messages in that terminal
# 4. Refresh browser (Ctrl+R or Cmd+R)
```

### If Port 5000 is Already Used
```bash
# Find what's using port 5000
lsof -i :5000

# Kill it
kill -9 <PID>

# Or change to port 5001:
# Edit: kalakar-ai/server/.env
# Change: PORT=5000 → PORT=5001
# Edit: kalakar-ai/app/.env
# Change: VITE_API_URL=http://localhost:5000 → ...5001
```

---

## Files Created/Updated

### Created:
- ✅ `kalakar-ai/server/.env` - Backend configuration
- ✅ `kalakar-ai/app/.env` - Frontend configuration
- ✅ `DEVELOPMENT_SETUP.md` - Complete dev setup guide
- ✅ `CORS_TROUBLESHOOTING.md` - CORS error solutions

### Updated:
- ✅ `kalakar-ai/app/vite.config.js` - Better dev server config
- ✅ `kalakar-ai/app/src/api/axios.js` - Better error handling
- ✅ `kalakar-ai/app/src/context/AuthContext.jsx` - Backend health check
- ✅ `kalakar-ai/app/src/pages/Login.jsx` - Better UI & error messages

---

## Key Improvements

### 1. Backend Health Checks
The app now checks if the backend is running and shows a clear error if it's not.

### 2. Better Error Messages
Instead of generic "Login failed", you get:
- "Backend server is not running"
- "Cannot connect to backend at http://localhost:5000"
- Specific login error from server

### 3. Debug Console Output
In development (F12 → Console), see all API calls:
```
[v0] API Request: POST /auth/login
[v0] API Response: 200 OK
```

### 4. CORS Configuration
Server is already configured to:
- Accept requests from `http://localhost:5173` (frontend)
- Include credentials in requests
- Handle preflight OPTIONS requests

---

## Troubleshooting Quick Links

For more details, see:
- **Setup Issues** → `DEVELOPMENT_SETUP.md`
- **CORS/Connection Errors** → `CORS_TROUBLESHOOTING.md`
- **Login Problems** → `FIX_CORS_AND_LOGIN.md` (this file)

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "Backend Not Available" (red alert) | Start backend: `cd kalakar-ai/server && npm run dev` |
| ERR_NETWORK in console | Backend not responding - check terminal for errors |
| "Invalid email or password" | Use: `sg946511@gmail.com` / `Jlkufkgb` |
| Port 5000 already in use | `kill -9 $(lsof -ti:5000)` or change PORT in .env |
| Cannot find module | Run `npm install` in that directory |
| Page won't load | Try hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac) |

---

## Next Steps After Login Works

1. ✅ Test the dashboard
2. ✅ Try uploading a video
3. ✅ Test caption generation
4. ✅ Check console for [v0] debug messages

---

## Need More Help?

1. Check `CORS_TROUBLESHOOTING.md` for detailed debugging steps
2. Look at browser console (F12) for [v0] debug messages
3. Check backend terminal for error messages
4. Verify both servers are running:
   ```bash
   curl http://localhost:5000/health
   curl http://localhost:5173
   ```

Happy testing! 🚀
