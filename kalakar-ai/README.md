# QuickSubs (`kalakar-ai/`)

QuickSubs is a video captioning + editor pipeline:

- Upload a video
- Auto-generate subtitles (ASR → Hinglish verification/quality gate → SRT)
- Edit subtitles in a browser timeline/canvas editor
- Export a final video with **burned-in subtitles** (FFmpeg)

This README is written to give **future LLMs / new devs** immediate context: what runs where, how data flows, and where to change things.

## Architecture (services)

```text
kalakar-ai/
  landing/   Astro marketing site (optional in dev)
  app/       React + Vite dashboard + subtitle editor
  server/    Express API (auth, video CRUD, queues jobs)
  worker/    BullMQ worker (download/ffmpeg/transcribe/upload)
```

## High-level flow (end-to-end)

### Upload → transcription (async)

1. **User uploads a video** from `app/`.
2. `server/` stores a `Video` document in MongoDB and sets `status: "queued"`.
3. `server/` enqueues a BullMQ job on queue **`video-processing`** with name **`process-video`**.
4. `worker/` consumes the job and runs the transcription pipeline:
   - Download original video (or reuse cached audio if present)
   - Create a small **preview mp4** for in-editor playback (stored in R2)
   - Extract audio (wav) and cache it in R2 (so retranscribe is cheap)
   - Transcribe audio (provider defaults to **Groq**; ElevenLabs available via retranscribe)
   - For Hinglish, cross-check the transcript and reject low-confidence results
   - Generate `subtitleSrt`
   - Save results back to MongoDB (`status: "completed"`, `previewUrl`, `audioUrl`, `subtitleSrt`, etc.)

### Editor → export (async render)

1. User opens the editor (`app/src/pages/VideoEditor.jsx`) and edits subtitles.
2. On export:
   - `app/` POSTs `/video/save-subtitles` to persist `subtitleSrt` and `subtitleAss`.
   - `app/` POSTs `/video/render` to queue a render job.
3. `server/` enqueues a BullMQ job on queue **`video-processing`** with name **`render-subtitles`**.
4. `worker/` runs the render pipeline:
   - Download original video
   - Write `.ass` (preferred) or `.srt` temp file
   - Burn subtitles via FFmpeg
   - Upload rendered output (currently via Cloudinary upload pipeline)
   - Save `outputUrl` in MongoDB

## Key runtime components (what to edit when changing behavior)

### API (`server/`)

- **Entrypoint**: `server/src/index.js`
- **Routes**: `server/src/routes/video.js`
  - `/video/upload-signature` (Cloudinary direct upload params)
  - `/video/register` (register Cloudinary-uploaded original + queue transcription)
  - `/video/upload-local` (upload file to server, immediately offload original to R2, then queue transcription)
  - `/video/status/:id` (polling; Redis-cached once completed/failed)
  - `/video/source/:id` (public streaming proxy for browser playback; supports `?variant=preview`)
  - `/video/save-subtitles` (store SRT/ASS without rendering)
  - `/video/render` (queue render job)
- **Controllers**:
  - `server/src/controllers/videoController.js`
  - `server/src/controllers/subtitleController.js`
- **Models**: `server/src/models/Video.js`, `server/src/models/User.js`
- **Queue + Redis**: `server/src/config/redis.js`

### Worker (`worker/`)

- **Entrypoint**: `worker/src/index.js`
- **Job handlers**:
  - `worker/src/jobs/transcribeJob.js` (job name: `process-video`)
  - `worker/src/jobs/renderJob.js` (job name: `render-subtitles`)
- **Pipelines** (download/ffmpeg/transcribe/refine):
- **Pipelines** (download/ffmpeg/transcribe):
  - `worker/src/pipeline/transcribe.js` (provider routing)
  - `worker/src/pipeline/groqTranscriber.js`
  - `worker/src/pipeline/transcribeElevenLabs.js`
  - `worker/src/pipeline/createPreview.js`
  - `worker/src/pipeline/extractAudio.js` (+ audio chunking helpers)
  - `worker/src/pipeline/burnSubtitles.js`

### Dashboard + editor (`app/`)

- **API client**: `app/src/api/axios.js` (uses `VITE_API_URL`, sends cookies)
- **Upload screen**: `app/src/pages/Upload.jsx` + `app/src/components/UploadZone.jsx`
- **Editor**: `app/src/pages/VideoEditor.jsx`
  - Uses `/video/status/:id` and `/video/source/:id?variant=preview`
  - Export calls `/video/save-subtitles` then `/video/render`

## Storage / CDN

This project uses multiple storage backends:

- **Cloudinary**:
  - Supports direct uploads from the browser (signature flow).
  - Also used for uploading the final rendered output in the worker upload pipeline.
- **Cloudflare R2** (S3-compatible):
  - Used to store large originals (for `upload-local`) and worker-generated assets:
    - `previews/…` preview mp4
    - `audio/…` cached wav

## Local development

### Prereqs

- Node.js (any modern LTS)
- MongoDB (Atlas or local)
- Redis (local or Upstash)
- FFmpeg is bundled via `ffmpeg-static` (no system ffmpeg required)

### Run (3 terminals)

```bash
cd server && cp .env.example .env && npm i && npm run dev
cd worker && cp .env.example .env && npm i && npm run dev
cd app && cp .env.example .env && npm i && npm run dev
```

Dashboard: `http://localhost:5173`  
API health: `http://localhost:5000/health`

## Environment variables (what matters)

### Shared (server + worker)

- **`MONGODB_URI`**: Mongo connection string
- **`REDIS_URL`**: Redis connection (BullMQ + status caching)

### Server-only

- **`JWT_SECRET`**: auth signing key
- **`CLIENT_URL`**: CORS allowlist (comma-separated)
- **Cloudinary**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **R2 (needed for `/video/upload-local`)**:
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_BASE_URL` (public base like `https://<your-domain>/<bucket>` or R2 public domain)

### Worker-only

- **Transcription providers**:
  - `GROQ_API_KEY` (default provider)
  - `ELEVENLABS_API_KEY` (used by editor “retranscribe”)
  - `OPENAI_API_KEY` (present; used by the OpenAI SDK if you enable that provider path)
- **R2** (needed to store preview + cached audio):
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`
- **Cloudinary**: used for output upload in the render pipeline

## Debugging checklist

- **Job stuck in `queued`**: worker not running or Redis connection wrong.
- **Job fails quickly**: check worker logs; `Video.errorMessage` gets updated on failure.
- **Preview not playing in editor**: confirm `/video/source/:id?variant=preview` returns `206/200` and the `previewUrl` exists on the video.
- **Re-transcribe is slow**: ensure `audioUrl` is populated so cached audio reuse kicks in.
- **Render export fails**: likely FFmpeg subtitle burn; check worker logs and the temp `.ass` generation path.

## Deployment (current intent)

Typical mapping (can vary):

- Landing + Dashboard: Vercel
- API + Worker: Render/Fly/etc
- Redis: Upstash
- DB: MongoDB Atlas
