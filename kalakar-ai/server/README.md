## QuickSubs API (`kalakar-ai/server`)

Express API for:

- Auth (JWT in cookies)
- Video CRUD + status polling
- Upload flows (Cloudinary direct upload + local upload that offloads to R2)
- Queueing background jobs to BullMQ (transcription + render)
- Streaming proxy endpoint for browser-safe playback

## Entrypoint

- `src/index.js`

## How the API talks to the worker

- Uses BullMQ queue **`video-processing`** (see `src/config/redis.js`).
- Enqueues:
  - **`process-video`** when a new video is registered/uploaded
  - **`render-subtitles`** when the editor requests export

## Key routes

Defined in `src/routes/video.js`:

- **`GET /health`**: health check
- **`GET /video/upload-signature`**: signed params for client-side Cloudinary upload
- **`POST /video/register`**: create `Video` doc + enqueue `process-video`
- **`POST /video/upload-local`**: upload to API (multer) → offload original to R2 → enqueue `process-video`
- **`GET /video/list`**: user’s videos
- **`GET /video/status/:id`**: polling endpoint (Redis-cached once terminal state)
- **`GET /video/source/:id?variant=preview|original`**: streams remote URL (R2/Cloudinary) with range support
- **`POST /video/save-subtitles`**: store SRT/ASS without rendering
- **`POST /video/render`**: enqueue `render-subtitles`
- **`POST /video/:id/retranscribe`**: reset fields + enqueue `process-video` (optionally different provider)

## Local run

```bash
cp .env.example .env
npm install
npm run dev
```

## Environment variables

Start from `.env.example`.

Common gotchas:

- **`CLIENT_URL`** can be comma-separated (multiple allowed origins).
- **R2 vars are required for `/video/upload-local`**:
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`

