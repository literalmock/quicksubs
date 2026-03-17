# QuickSubs Development Setup Guide

## Overview

QuickSubs is a monorepo with multiple services:
- **Frontend (app)** - React + Vite on port 5173
- **Backend (server)** - Express on port 5000
- **Worker** - Background job processor
- **Landing** - Landing page

## Quick Start (Development)

### 1. Prerequisites

Make sure you have Node.js installed (v18+):
```bash
node --version
npm --version
```

### 2. Install Dependencies

**For the entire project:**
```bash
npm install
```

**Or for individual services:**
```bash
# Backend
cd kalakar-ai/server && npm install

# Frontend
cd kalakar-ai/app && npm install

# Worker
cd kalakar-ai/worker && npm install
```

### 3. Environment Setup

#### Backend (.env)
Create `.env` in `kalakar-ai/server/`:
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/kalakar?retryWrites=true&w=majority
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-development-jwt-secret-key-change-in-production
CLIENT_URL=http://localhost:5173
```

#### Frontend (.env)
Create `.env` in `kalakar-ai/app/`:
```
VITE_API_URL=http://localhost:5000
```

### 4. Database & Cache Setup

You need:
- **MongoDB** - Cloud or local (for user data, videos, etc.)
- **Redis** - For job queues (local or Upstash)

Quick local setup:
```bash
# Install MongoDB locally (macOS)
brew install mongodb-community

# Install Redis locally (macOS)
brew install redis

# Start services
mongod
redis-server
```

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd kalakar-ai/server
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd kalakar-ai/app
npm run dev
# App runs on http://localhost:5173
```

**Terminal 3 - Worker (optional):**
```bash
cd kalakar-ai/worker
npm run dev
```

### 6. Access the App

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Testing Login

### Default Test Account
Email: `sg946511@gmail.com`
Password: `Jlkufkgb`

> Note: You may need to create this account first via signup if it doesn't exist

## Troubleshooting

### CORS Error: "Cross-Origin Request Blocked"

**Cause**: Backend server is not running or not accessible.

**Solution**:
1. Ensure backend is running: `npm run dev` in `kalakar-ai/server`
2. Check that it's running on port 5000
3. Verify `VITE_API_URL` is set to `http://localhost:5000`

```bash
# Check if backend is running
curl http://localhost:5000/health
# Should return: {"status":"ok","uptime":...}
```

### "Cannot connect to MongoDB"

**Solution**:
1. Update `MONGODB_URI` in `.env` with your MongoDB connection string
2. Or install and run MongoDB locally:
   ```bash
   mongod
   ```

### "Cannot connect to Redis"

**Solution**:
1. Update `REDIS_URL` in `.env` with your Redis connection string
2. Or install and run Redis locally:
   ```bash
   redis-server
   ```

### "Port 5000 already in use"

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change PORT in .env
PORT=5001
```

## Project Structure

```
quicksubs/
├── kalakar-ai/
│   ├── app/                 # React Frontend (Vite)
│   │   ├── src/
│   │   │   ├── pages/       # Page components
│   │   │   ├── components/  # Reusable components
│   │   │   ├── context/     # Auth context
│   │   │   ├── api/         # API client (axios)
│   │   │   └── assets/      # Images, fonts, etc
│   │   └── package.json
│   │
│   ├── server/              # Express Backend
│   │   ├── src/
│   │   │   ├── routes/      # API routes
│   │   │   ├── models/      # MongoDB models
│   │   │   ├── config/      # Configuration
│   │   │   └── index.js     # Entry point
│   │   └── package.json
│   │
│   ├── worker/              # Job processor
│   │   └── package.json
│   │
│   └── landing/             # Landing page
│       └── package.json
│
└── docs/                    # Documentation
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user

### Videos
- `GET /video` - List user's videos
- `POST /video/upload` - Upload video
- `GET /video/:id` - Get video details
- `PUT /video/:id` - Update video

## Common Development Tasks

### Create a new React component
```bash
cd kalakar-ai/app/src/components
# Create MyComponent.jsx
```

### Add a new API route
```bash
cd kalakar-ai/server/src/routes
# Create in routes, add to index.js
```

### Check backend logs
```bash
# Backend logs appear in Terminal 1
# Look for [v0] debug statements
```

### Build for production
```bash
# Frontend
cd kalakar-ai/app
npm run build

# Backend
cd kalakar-ai/server
npm run build
```

## Deployment

See individual service READMEs:
- Frontend: `kalakar-ai/app/README.md`
- Backend: `kalakar-ai/server/README.md`

## Support

For issues or questions, check:
1. CORS configuration in `kalakar-ai/server/src/index.js`
2. API client setup in `kalakar-ai/app/src/api/axios.js`
3. Environment variables in `.env` files

Happy developing! 🚀
