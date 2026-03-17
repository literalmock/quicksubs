# CORS & Login Troubleshooting Guide

## Problem: "Cross-Origin Request Blocked" Error

This error occurs when the frontend cannot connect to the backend API.

### Quick Fix

1. **Start the Backend Server:**
   ```bash
   cd kalakar-ai/server
   npm install  # First time only
   npm run dev
   ```

   You should see:
   ```
   🚀 Server running on port 5000 [development]
   ```

2. **Start the Frontend:**
   ```bash
   cd kalakar-ai/app
   npm install  # First time only
   npm run dev
   ```

   You should see:
   ```
   ➜  Local:   http://localhost:5173/
   ```

3. **Open the App:**
   Visit `http://localhost:5173` in your browser and try to login.

---

## Common Issues & Solutions

### Issue 1: "Backend Not Available" Message in Login Page

**Symptom:** Red alert on login page saying "Backend Not Available"

**Causes:**
- Backend server is not running
- Backend is running on wrong port
- API URL is misconfigured

**Solutions:**

```bash
# 1. Check if backend is running
curl http://localhost:5000/health

# If curl fails, start the backend:
cd kalakar-ai/server
npm run dev

# 2. Verify the port
# Check kalakar-ai/server/.env
# Should have: PORT=5000

# 3. Check API URL in frontend
# Check kalakar-ai/app/.env
# Should have: VITE_API_URL=http://localhost:5000
```

### Issue 2: CORS Error (ERR_NETWORK)

**Symptom:** 
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading 
the remote resource at http://localhost:5000/auth/login
```

**Causes:**
- Backend server crashed or not listening
- Network issue between frontend and backend
- CORS configuration issue

**Solutions:**

```bash
# 1. Check if backend is actually running
lsof -i :5000

# If nothing shows, start it:
cd kalakar-ai/server && npm run dev

# 2. If port 5000 is in use by another process:
lsof -i :5000
kill -9 <PID>

# 3. Change to a different port in .env:
# kalakar-ai/server/.env
PORT=5001
# Then update frontend:
# kalakar-ai/app/.env
VITE_API_URL=http://localhost:5001
```

### Issue 3: Login Button Disabled or Grayed Out

**Symptom:** Login button won't respond to clicks

**Cause:** Backend is not available (detected by the app)

**Solution:**
```bash
# Start the backend
cd kalakar-ai/server
npm run dev

# Wait 2-3 seconds for it to fully start
# Then refresh the browser
```

---

## Complete Setup Checklist

- [ ] **Backend Dependencies Installed**
  ```bash
  cd kalakar-ai/server
  npm install
  ```

- [ ] **Backend .env Created**
  ```bash
  cp kalakar-ai/server/.env.example kalakar-ai/server/.env
  ```
  
- [ ] **MongoDB Connection Working**
  ```bash
  # Test with:
  curl http://localhost:5000/health
  # Should return: {"status":"ok","uptime":...}
  ```

- [ ] **Backend Running on Port 5000**
  ```bash
  cd kalakar-ai/server
  npm run dev
  # Should show: 🚀 Server running on port 5000
  ```

- [ ] **Frontend .env Created**
  ```bash
  # Should contain:
  # VITE_API_URL=http://localhost:5000
  ```

- [ ] **Frontend Running on Port 5173**
  ```bash
  cd kalakar-ai/app
  npm run dev
  # Should show: ➜ Local: http://localhost:5173
  ```

- [ ] **Login Page Shows "Backend Available"**
  ```bash
  # Visit http://localhost:5173
  # Should NOT show red "Backend Not Available" alert
  ```

- [ ] **Test Login with Credentials**
  - Email: `sg946511@gmail.com`
  - Password: `Jlkufkgb`

---

## Debug Terminal Output

### Backend (Should Show This)
```
🚀 Server running on port 5000 [development]
[v0] GET /health
[v0] GET /auth/me
[v0] POST /auth/login
```

### Frontend (Should Show This)
```
[v0] API Request: { method: 'GET', url: 'http://localhost:5000/health' }
[v0] API Response: { status: 200, data: { status: 'ok' } }
[v0] API Request: { method: 'POST', url: 'http://localhost:5000/auth/login' }
[v0] API Response: { status: 200, data: { user: { ... } } }
```

### If You See This CORS Error
```
ERR_NETWORK: Network Error: Cannot connect to backend at http://localhost:5000
```

**What it means:** The backend is not responding at all
**What to do:** 
1. Check backend is running: `npm run dev` in `kalakar-ai/server`
2. Wait 3 seconds for it to fully start
3. Refresh browser

---

## Testing the API Manually

### Check Backend Health
```bash
curl http://localhost:5000/health
# Returns: {"status":"ok","uptime":123.456}
```

### Test Login Endpoint
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sg946511@gmail.com","password":"Jlkufkgb"}'
```

### Check CORS Configuration
The server should accept requests from `http://localhost:5173`:
```bash
curl -X OPTIONS http://localhost:5000/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v
# Should see: Access-Control-Allow-Origin: http://localhost:5173
```

---

## Environment Variables Quick Reference

### Backend (.env)
```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000  # Not needed in server, only for reference
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

---

## Still Having Issues?

1. **Check browser console** (F12 → Console tab)
   - Look for [v0] debug messages
   - Note exact error message

2. **Check terminal logs**
   - Backend terminal should show requests
   - Frontend terminal should show build messages

3. **Verify both are running**
   ```bash
   curl http://localhost:5000/health  # Backend
   curl http://localhost:5173         # Frontend
   ```

4. **Try restarting both:**
   - Kill both servers (Ctrl+C)
   - Wait 2 seconds
   - Restart backend first, then frontend
   - Wait 3 seconds, then refresh browser

5. **Clear browser cache**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty cache and hard refresh"

---

## Production Notes

For production deployment:
- Set `NODE_ENV=production` in backend
- Update `CLIENT_URL` to match your domain
- Use `VITE_API_URL` pointing to your production backend
- Ensure CORS whitelist includes your domain
- Enable HTTPS

See `DEVELOPMENT_SETUP.md` for more details.
