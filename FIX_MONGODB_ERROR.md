# Quick Fix: MongoDB Connection Error

## The Error
```
❌ MongoDB connection error: querySrv ENOTFOUND _mongodb._tcp.cluster.mongodb.net
```

## The Cause
Your `.env` file has a **placeholder MongoDB URI** instead of your **actual connection string**.

---

## 🚀 Quick Fix (2 Minutes)

### 1. Get Your Real MongoDB URI

**Choose ONE:**

**Option A: Use MongoDB Atlas (Cloud - Easiest)**
- Go to https://www.mongodb.com/cloud/atlas
- Sign up free
- Create a cluster → Click "Connect" → Copy connection string
- Add your IP to whitelist (Network Access)

**Option B: Use Local MongoDB**
```
mongodb://localhost:27017/quicksubs
```

### 2. Update `.env` File

**File:** `kalakar-ai/server/.env`

Change this:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/kalakar?...
```

To this (replace with YOUR actual URI):
```env
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/quicksubs?retryWrites=true&w=majority
```

### 3. Update v0 Settings

1. Click Settings (top right)
2. Go to **Vars** tab
3. Update `MONGODB_URI` with your real connection string
4. Save

### 4. Restart Server

```bash
cd kalakar-ai/server
npm run dev
```

**You should see:**
```
✅ MongoDB connected: cluster0.xxxxx.mongodb.net
```

---

## Common Issues & Fixes

### "Still getting ENOTFOUND error?"
- ❌ You're still using the placeholder URI
- ✅ Copy your REAL MongoDB URI from MongoDB Atlas
- ✅ Make sure v0 Settings were updated

### "Authentication failed?"
- ❌ Username or password is wrong
- ✅ Reset password in MongoDB Atlas → Database Access
- ✅ Update `.env` with correct credentials

### "IP not whitelisted?" (MongoDB Atlas)
- ❌ Your computer's IP not added to whitelist
- ✅ Go to Network Access → Add IP Address
- ✅ Use "Allow access from anywhere" for development

### "Can't connect locally?"
- ❌ Local MongoDB not running
- ✅ Start it: `brew services start mongodb-community` (macOS)
- ✅ Or: `sudo systemctl start mongod` (Linux)

---

## MongoDB URI Format

```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DBNAME?retryWrites=true&w=majority
```

Replace:
- `USERNAME` → your MongoDB user
- `PASSWORD` → your MongoDB password
- `CLUSTER` → your cluster identifier
- `DBNAME` → your database name (e.g., `quicksubs`)

---

## Done! ✅

Once MongoDB connects, you can:
- ✅ Start the frontend
- ✅ Login with test account
- ✅ Upload videos
- ✅ Generate captions

**For detailed setup guide, see:** `MONGODB_SETUP.md`
