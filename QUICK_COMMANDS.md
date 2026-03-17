# Quick Terminal Commands - Copy & Paste

## One-Time Setup

### Terminal 1: Install & Start Backend
```bash
cd kalakar-ai/server
npm install
npm run dev
```

### Terminal 2: Install & Start Frontend
```bash
cd kalakar-ai/app
npm install
npm run dev
```

**Then open:** http://localhost:5173

---

## For Next Time

Just run these (they install is already done):

### Backend (Terminal 1)
```bash
cd kalakar-ai/server && npm run dev
```

### Frontend (Terminal 2)
```bash
cd kalakar-ai/app && npm run dev
```

---

## Testing & Debugging

### Check if backend is running
```bash
curl http://localhost:5000/health
```

### Check if port is in use
```bash
# See what's using port 5000
lsof -i :5000

# Kill it (macOS/Linux)
kill -9 <PID>

# Or on Windows, use Task Manager
```

### Test login endpoint directly
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sg946511@gmail.com","password":"Jlkufkgb"}'
```

### Clear all node_modules and reinstall
```bash
# Backend
cd kalakar-ai/server
rm -rf node_modules package-lock.json
npm install

# Frontend
cd kalakar-ai/app
rm -rf node_modules package-lock.json
npm install
```

### Update to latest dependencies
```bash
# Backend
cd kalakar-ai/server && npm update

# Frontend
cd kalakar-ai/app && npm update
```

---

## Running Everything at Once (Recommended)

Use a terminal multiplexer or just open 2 terminals:

**Terminal 1:**
```bash
cd kalakar-ai/server && npm run dev
```

**Terminal 2:**
```bash
cd kalakar-ai/app && npm run dev
```

Then visit: http://localhost:5173

---

## Environment Files

### Verify backend config
```bash
cat kalakar-ai/server/.env
# Should show: PORT=5000
```

### Verify frontend config
```bash
cat kalakar-ai/app/.env
# Should show: VITE_API_URL=http://localhost:5000
```

### Edit backend port
```bash
# macOS/Linux
nano kalakar-ai/server/.env
# Windows
notepad kalakar-ai/server/.env
```

---

## Monitoring Logs

### Watch backend logs in real-time
```bash
cd kalakar-ai/server && npm run dev
# Logs appear here
```

### Check frontend build messages
```bash
cd kalakar-ai/app && npm run dev
# Logs appear here
```

### Look for [v0] debug messages
```
[v0] API Request: GET /health
[v0] API Response: 200 OK
[v0] Login error: Invalid credentials
```

---

## If Something Breaks

### Option 1: Restart (Quick)
```bash
# Kill servers (Ctrl+C in both terminals)
# Wait 2 seconds
# Run again:
cd kalakar-ai/server && npm run dev  # Terminal 1
cd kalakar-ai/app && npm run dev     # Terminal 2
# Refresh browser
```

### Option 2: Clean Reinstall
```bash
# Backend
cd kalakar-ai/server
rm -rf node_modules package-lock.json
npm install
npm run dev

# Frontend (in new terminal)
cd kalakar-ai/app
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Option 3: Nuke and Rebuild
```bash
# Start completely fresh
cd /path/to/quicksubs
rm -rf kalakar-ai/server/node_modules kalakar-ai/server/package-lock.json
rm -rf kalakar-ai/app/node_modules kalakar-ai/app/package-lock.json

npm install  # Install everything

# Then start servers
cd kalakar-ai/server && npm run dev
cd kalakar-ai/app && npm run dev
```

---

## Useful npm Commands

### See what version of packages you have
```bash
npm list
```

### Update one package
```bash
npm install axios@latest
```

### Check for security issues
```bash
npm audit
```

### Fix security issues automatically
```bash
npm audit fix
```

### Build for production
```bash
# Frontend
cd kalakar-ai/app
npm run build

# Backend would be:
# cd kalakar-ai/server
# npm run build
```

---

## Docker Commands (if using Docker)

```bash
# Build
docker-compose build

# Start
docker-compose up

# Stop
docker-compose down

# Logs
docker-compose logs -f server
docker-compose logs -f app
```

---

## Git Commands

### See what you've changed
```bash
git status
```

### Commit your changes
```bash
git add .
git commit -m "Fix CORS and login"
```

### Push to GitHub
```bash
git push origin main
```

### Check git log
```bash
git log --oneline
```

---

## Monitoring Ports

### macOS/Linux: List all processes using ports
```bash
lsof -i :5000   # Backend
lsof -i :5173   # Frontend
lsof -i :6379   # Redis
lsof -i :27017  # MongoDB
```

### Windows: Check ports
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## All Ports at a Glance

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend | 5000 | http://localhost:5000 |
| MongoDB | 27017 | mongodb://localhost:27017 |
| Redis | 6379 | redis://localhost:6379 |

---

## Remember

- **2 terminals minimum** (backend + frontend)
- **Backend first**, then frontend
- **Wait 3 seconds** for each to fully start
- **Check console** for [v0] debug messages
- **Hard refresh browser** if stuck: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

That's it! 🚀
