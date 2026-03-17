# MongoDB Connection Setup Guide

## Problem You're Facing

```
❌ MongoDB connection error: querySrv ENOTFOUND _mongodb._tcp.cluster.mongodb.net
```

This error occurs when the MongoDB URI in your `.env` file is:
1. **Not set at all** (empty/missing)
2. **Still using placeholder values** like `user:password@cluster.mongodb.net`
3. **Incorrectly formatted**
4. **Network/DNS issues** (IP not whitelisted, server down, etc.)

---

## Solution: 3 Steps to Fix

### Step 1: Create/Update Your MongoDB Connection String

You need an **actual MongoDB URI**. Here's how to get one:

#### Option A: MongoDB Atlas (Cloud - Recommended)

1. **Create Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up (free tier available)

2. **Create a Cluster**
   - Click "Create a Deployment"
   - Choose "M0" tier (free)
   - Select your region (closest to you)
   - Click "Create"

3. **Get Connection String**
   - Go to "Database" → "Drivers"
   - Copy the connection string
   - It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/dbname?retryWrites=true&w=majority`

4. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Set username and password
   - Copy these credentials

5. **Add IP to Whitelist**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Choose "Allow access from anywhere" (for development) or add your IP
   - This is important - without it, connections will fail!

#### Option B: Local MongoDB (For Development)

1. **Install MongoDB**
   ```bash
   # macOS
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community

   # Ubuntu/Debian
   sudo apt-get install -y mongodb

   # Windows
   # Download from https://www.mongodb.com/try/download/community
   ```

2. **Use Local Connection String**
   ```
   MONGODB_URI=mongodb://localhost:27017/quicksubs
   ```

---

### Step 2: Update Your `.env` File

**Location:** `kalakar-ai/server/.env`

Replace this line:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/quicksubs?retryWrites=true&w=majority
```

With your actual connection string:
```env
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.abc123.mongodb.net/quicksubs?retryWrites=true&w=majority
```

**Important:** Replace:
- `your_username` → your MongoDB database user
- `your_password` → your MongoDB database password
- `cluster0.abc123` → your actual cluster name
- `quicksubs` → your database name

---

### Step 3: Update v0 Settings

If you created the `.env` file in v0, you also need to update the project settings:

1. Click the **Settings** button (top right)
2. Go to **Vars** tab
3. Find or create `MONGODB_URI`
4. Paste your connection string
5. Save

---

## Troubleshooting

### Error: `querySrv ENOTFOUND _mongodb._tcp.cluster.mongodb.net`

**Causes:**
- Using placeholder URI
- Invalid MongoDB URI format
- Network/DNS issue

**Solutions:**
1. ✅ Update `.env` with real connection string
2. ✅ Verify URI format is correct
3. ✅ Check internet connection
4. ✅ Add your IP to MongoDB Atlas whitelist

### Error: `authentication failed`

**Cause:** Wrong username or password

**Solution:**
1. Go to MongoDB Atlas
2. Click "Database Access"
3. Reset password for your database user
4. Update `.env` with correct password

### Error: `connect ECONNREFUSED 127.0.0.1:27017` (Local MongoDB)

**Cause:** MongoDB service not running locally

**Solution:**
```bash
# Start MongoDB service
# macOS
brew services start mongodb-community

# Ubuntu/Linux
sudo systemctl start mongod

# Windows
# Start MongoDB Community Server from Services
```

### Error: `IP not whitelisted`

**Cause:** Your IP address not added to MongoDB Atlas

**Solution:**
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Either:
   - Add your specific IP (check https://www.whatismyip.com/)
   - Allow access from anywhere (0.0.0.0/0) - less secure

---

## Verify Connection

Once you've updated `.env`, restart your server:

```bash
cd kalakar-ai/server
npm run dev
```

You should see:
```
✅ MongoDB connected: cluster0.xxxxx.mongodb.net
```

If you still see the error, check:
1. `.env` file has correct URI
2. v0 Settings → Vars has correct MONGODB_URI
3. MongoDB Atlas whitelist includes your IP
4. Username/password are correct

---

## MongoDB Atlas Quick Reference

| Task | Where |
|------|-------|
| Get Connection String | Database → Drivers |
| Create DB User | Database Access → Add New Database User |
| Whitelist IP | Network Access → Add IP Address |
| Check Cluster | Databases → View |
| View Collections | Browse Collections |

---

## Common Connection Strings

```javascript
// MongoDB Atlas (Cloud)
mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/dbname?retryWrites=true&w=majority

// Local MongoDB
mongodb://localhost:27017/quicksubs

// Local with auth
mongodb://user:pass@localhost:27017/quicksubs?authSource=admin

// Docker MongoDB
mongodb://mongodb:27017/quicksubs
```

---

## Next Steps

After fixing MongoDB:
1. Server should start without errors
2. Frontend should connect and show login
3. You can create accounts and log in
4. Videos will be stored in MongoDB

Questions? Check the error messages - they're usually helpful!
