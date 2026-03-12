# QuickSubs – Automatic Video Captioning SaaS

AI-powered SaaS platform that automatically generates and burns subtitles into uploaded videos.

## Architecture

```
/quicksubs
  /landing   → Astro marketing site
  /app       → React dashboard (Vite)
  /server    → Node.js + Express API
  /worker    → BullMQ video processing worker
```

## Quick Start

### 1. Backend API
```bash
cd server
cp .env.example .env   # fill in your keys
npm install
npm run dev
```

### 2. Worker
```bash
cd worker
cp .env.example .env
npm install
npm run dev
```

### 3. React Dashboard
```bash
cd app
cp .env.example .env
npm install
npm run dev
```

### 4. Landing Site
```bash
cd landing
npm install
npm run dev
```

## Environment Variables

| Variable | Used In |
|---|---|
| `MONGODB_URI` | server, worker |
| `REDIS_URL` | server, worker |
| `JWT_SECRET` | server |
| `OPENAI_API_KEY` | worker |
| `CLOUDINARY_CLOUD_NAME` | server, worker |
| `CLOUDINARY_API_KEY` | server, worker |
| `CLOUDINARY_API_SECRET` | server, worker |
| `CLIENT_URL` | server |

## Deployment

| Service | Platform |
|---|---|
| Landing | Vercel |
| Dashboard | Vercel |
| Backend API | Render |
| Worker | Render |
| Redis | Upstash |
| Database | MongoDB Atlas |
