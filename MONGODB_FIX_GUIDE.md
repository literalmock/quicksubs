# MongoDB Connection Error - Complete Fix Guide

## The Problem

Your server is failing to connect to MongoDB with this error:

```
❌ MongoDB connection error: querySrv ENOTFOUND _mongodb._tcp.cluster.mongodb.net
```

## The Root Cause

Your `.env` file contains a **placeholder MongoDB URI** instead of your **actual connection string**.

**Placeholder (doesn't work):**
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/kalakar?...
```

**Real (what you need):**
```
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.abc123.mongodb.net/quicksubs?...
```

---

## ✅ Quick Fix (2-3 Minutes)

### Step 1: Get Your MongoDB Connection String

Choose **ONE** option:

#### Option A: MongoDB Atlas (Cloud - Recommended ⭐)

1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Sign Up Free" (takes 1 minute)
3. Create a cluster (free M0 tier)
4. Go to **Database Access** → Create a database user with username & password
5. Go to **Network Access** → Add your IP to whitelist
6. Go to **Databases** → Click "Connect" → Copy connection string
7. Paste it as `MONGODB_URI` in your `.env` file

#### Option B: Local MongoDB (For Development)

1. Install MongoDB locally
2. Start the service
3. Use this connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/quicksubs
   ```

### Step 2: Update Your `.env` File

**File location:** `kalakar-ai/server/.env`

Replace the line:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/...
```

With your actual connection string from Step 1.

### Step 3: Update v0 Settings

1. Click **Settings** (top right)
2. Go to **Vars** tab
3. Update `MONGODB_URI` with your real connection string
4. Click **Save**

### Step 4: Restart the Server

```bash
cd kalakar-ai/server
npm run dev
```

**You should now see:**
```
✅ MongoDB connected: cluster0.xxxxx.mongodb.net
🚀 Server running on port 5000
```

---

## 📚 Documentation Files

| File | Purpose | Read Time |
|------|---------|-----------|
| **FIX_MONGODB_ERROR.md** | Quick 2-minute fix checklist | 2 min |
| **MONGODB_SETUP.md** | Complete step-by-step guide | 10 min |
| **MONGODB_VISUAL_GUIDE.txt** | ASCII diagrams and visual flow | 5 min |
| **MONGODB_ERROR_FIXED.txt** | Technical summary of what was fixed | 3 min |
| This file | Overview and navigation | 2 min |

**Start with:** `FIX_MONGODB_ERROR.md` for the quickest fix, or `MONGODB_SETUP.md` for detailed instructions.

---

## 🔧 Troubleshooting

### "Still getting ENOTFOUND error"

**Cause:** Using placeholder URI

**Fix:**
1. Copy your REAL MongoDB URI from MongoDB Atlas
2. Make sure you've replaced `user:password` with actual credentials
3. Update BOTH `.env` file AND v0 Settings
4. Restart server

### "Authentication failed"

**Cause:** Wrong username/password in URI

**Fix:**
1. Go to MongoDB Atlas → Database Access
2. Either use correct credentials OR reset password
3. Update `.env` with correct credentials
4. Restart server

### "Can't connect (MongoDB Atlas)"

**Cause:** Your IP not whitelisted

**Fix:**
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Either add your IP (check https://www.whatismyip.com/) OR allow all (0.0.0.0/0)
4. Restart server

### "Can't connect (Local MongoDB)"

**Cause:** MongoDB service not running

**Fix:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# Start MongoDB Community Server from Services
```

---

## 🎯 MongoDB URI Format Reference

```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DBNAME?retryWrites=true&w=majority
```

**Variables:**
- `USERNAME` → Your MongoDB database user
- `PASSWORD` → Your MongoDB database password  
- `CLUSTER` → Your cluster identifier (e.g., cluster0.abc123)
- `DBNAME` → Your database name (e.g., quicksubs)

---

## ✨ What Was Fixed

The codebase now includes:

1. **Enhanced Error Messages** (`src/config/db.js`)
   - Validates if `MONGODB_URI` is set
   - Checks if you're still using placeholder values
   - Provides helpful troubleshooting tips
   - Shows connection failures with suggestions

2. **Updated `.env` Template**
   - Clear instructions for getting MongoDB URI
   - Step-by-step MongoDB Atlas setup guide
   - Multiple examples of connection strings

3. **Comprehensive Documentation**
   - Multiple guides for different learning styles
   - Visual ASCII diagrams
   - Troubleshooting section
   - Quick reference cards

---

## 🚀 Next Steps

After MongoDB connects successfully:

1. **Start the frontend:**
   ```bash
   cd kalakar-ai/app
   npm install
   npm run dev
   ```

2. **Open in browser:**
   ```
   http://localhost:5173
   ```

3. **Login with test account:**
   - Email: `sg946511@gmail.com`
   - Password: `Jlkufkgb`

4. **Start using the app:**
   - Upload videos
   - Generate captions
   - Edit captions
   - Export videos

---

## 📞 Still Stuck?

The enhanced error messages in your server will tell you exactly what's wrong:

- If `MONGODB_URI` is missing
- If it's still using a placeholder
- What might be wrong with the connection
- How to troubleshoot

**Just restart the server and read the error message carefully - it will guide you!**

---

## 📋 Files Changed

- `kalakar-ai/server/src/config/db.js` - Better error handling and validation
- `kalakar-ai/server/.env` - Updated with instructions and examples

## 📄 Files Created

- `MONGODB_FIX_GUIDE.md` (this file)
- `FIX_MONGODB_ERROR.md` (quick fix)
- `MONGODB_SETUP.md` (detailed guide)
- `MONGODB_VISUAL_GUIDE.txt` (visual diagrams)
- `MONGODB_ERROR_FIXED.txt` (technical summary)

---

## 💡 Pro Tips

1. **For Development:** Use MongoDB Atlas (cloud) - free tier is plenty
2. **For Local Testing:** Install MongoDB locally
3. **For Production:** Use MongoDB Atlas paid tier with backups
4. **Security:** Never commit `.env` files with real credentials to git
5. **Testing:** Always whitelist your IP before connecting

---

**You've got this! 🎉 Just get your MongoDB URI and update `.env` - everything else is handled!**
