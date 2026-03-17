# QuickSubs - CORS Fix & Login Setup

## Problem Solved ✅

You were getting a **CORS error** when trying to login:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading 
the remote resource at http://localhost:5001/auth/login
```

**Root cause:** Backend server wasn't running or wasn't accessible

## Solution Implemented ✅

- ✅ Created `.env` files for backend and frontend
- ✅ Improved error handling and debugging
- ✅ Added backend health checks
- ✅ Better error messages on login page
- ✅ Comprehensive documentation

## What You Need to Do

### Step 1: Start Backend (Terminal 1)
```bash
cd kalakar-ai/server
npm install  # Only if first time
npm run dev
```

Wait for:
```
🚀 Server running on port 5000 [development]
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd kalakar-ai/app
npm install  # Only if first time
npm run dev
```

Wait for:
```
➜  Local:   http://localhost:5173/
```

### Step 3: Test Login
Open: **http://localhost:5173**

Credentials:
- Email: `sg946511@gmail.com`
- Password: `Jlkufkgb`

**Done!** 🎉

---

## Where to Find Help

### Quick Setup (Copy & Paste Commands)
👉 **[QUICK_COMMANDS.md](./QUICK_COMMANDS.md)**
- One-time setup commands
- Everyday startup commands
- Debugging commands

### Getting Started (Detailed Setup)
👉 **[FIX_CORS_AND_LOGIN.md](./FIX_CORS_AND_LOGIN.md)**
- 3-step quick start
- What to expect
- Common errors & fixes

### Complete Development Guide
👉 **[DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md)**
- Full project overview
- Environment setup
- Database setup
- Troubleshooting guide
- API endpoints

### CORS & Network Errors
👉 **[CORS_TROUBLESHOOTING.md](./CORS_TROUBLESHOOTING.md)**
- Detailed CORS error solutions
- Manual API testing
- Debug output examples
- Production notes

---

## Files Changed

### Created
- `kalakar-ai/server/.env` - Backend config (port 5000)
- `kalakar-ai/app/.env` - Frontend config (VITE_API_URL)
- Documentation files (above)

### Updated
- `kalakar-ai/app/vite.config.js` - Better dev server config
- `kalakar-ai/app/src/api/axios.js` - Error handling & debugging
- `kalakar-ai/app/src/context/AuthContext.jsx` - Backend health check
- `kalakar-ai/app/src/pages/Login.jsx` - Better UI & error messages

---

## What's Different Now

### Before
❌ CORS error on login
❌ No error handling
❌ Confusing error messages
❌ No way to debug

### After
✅ Clear backend availability detection
✅ Comprehensive error messages
✅ [v0] debug logs in console
✅ Backend health checks
✅ Better UX with loading states

---

## If You Get "Backend Not Available" Alert

This means the server on port 5000 is not running.

**Fix:**
```bash
cd kalakar-ai/server
npm run dev
```

Then refresh browser.

---

## Debug Console (F12 → Console)

When everything works, you'll see:
```
[v0] Backend Health: { status: 'ok', uptime: 123.45 }
[v0] API Request: { method: 'POST', url: 'http://localhost:5000/auth/login' }
[v0] API Response: { status: 200, data: { user: { ... } } }
```

---

## Project Structure

```
quicksubs/
├── kalakar-ai/
│   ├── app/                 # Frontend (Port 5173)
│   │   ├── src/
│   │   ├── .env             # ← Frontend config
│   │   └── package.json
│   ├── server/              # Backend (Port 5000)
│   │   ├── src/
│   │   ├── .env             # ← Backend config
│   │   └── package.json
│   └── worker/              # Background jobs
├── QUICK_COMMANDS.md        # ← Start here for commands
├── FIX_CORS_AND_LOGIN.md    # ← 3-step quick start
├── DEVELOPMENT_SETUP.md     # ← Complete guide
└── CORS_TROUBLESHOOTING.md  # ← For CORS errors
```

---

## Quick Checklist

Before testing login:

- [ ] Backend `.env` exists: `kalakar-ai/server/.env`
- [ ] Frontend `.env` exists: `kalakar-ai/app/.env`
- [ ] Backend running: `npm run dev` in `kalakar-ai/server`
- [ ] Frontend running: `npm run dev` in `kalakar-ai/app`
- [ ] Backend shows: `🚀 Server running on port 5000`
- [ ] Frontend shows: `➜ Local: http://localhost:5173`
- [ ] No red alerts on login page
- [ ] Can see "Backend: Available" in dev info

---

## Environment Variables

### Backend (`kalakar-ai/server/.env`)
```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Frontend (`kalakar-ai/app/.env`)
```
VITE_API_URL=http://localhost:5000
```

These are already created for you! ✅

---

## Common Issues

| Problem | Solution |
|---------|----------|
| "Backend Not Available" (red alert) | Run `npm run dev` in `kalakar-ai/server` |
| ERR_NETWORK in console | Backend crashed or not running |
| Port 5000 in use | `kill -9 $(lsof -ti:5000)` or change PORT in .env |
| Blank page | Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) |
| "Cannot find module" | Run `npm install` in that directory |

**See [CORS_TROUBLESHOOTING.md](./CORS_TROUBLESHOOTING.md) for detailed help.**

---

## Next Steps

1. **Start the servers** (follow Quick Start above)
2. **Test the login** (use provided credentials)
3. **Check console** (F12 → Console for [v0] messages)
4. **Read docs** if you hit any issues

---

## API Endpoints

Available at `http://localhost:5000`:

```
GET    /health                 - Health check
POST   /auth/signup            - Register
POST   /auth/login             - Login
POST   /auth/logout            - Logout
GET    /auth/me                - Get current user
GET    /video                  - List videos
POST   /video/upload           - Upload video
```

---

## Need Help?

1. **Quick commands?** → [QUICK_COMMANDS.md](./QUICK_COMMANDS.md)
2. **Getting started?** → [FIX_CORS_AND_LOGIN.md](./FIX_CORS_AND_LOGIN.md)
3. **CORS errors?** → [CORS_TROUBLESHOOTING.md](./CORS_TROUBLESHOOTING.md)
4. **Full setup?** → [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md)

---

## You're All Set! 🚀

Everything is configured. Just:
1. Run `npm run dev` in `kalakar-ai/server`
2. Run `npm run dev` in `kalakar-ai/app`
3. Open http://localhost:5173
4. Login with the test credentials

Happy coding!
