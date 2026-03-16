## QuickSubs Worker (`kalakar-ai/worker`)

BullMQ worker that performs all heavyweight tasks:

- Downloading videos/assets
- FFmpeg processing (extract audio, generate preview, burn subtitles)
- Transcription (Groq by default; ElevenLabs supported; OpenAI SDK present)
- Uploading assets (R2 for preview/audio; Cloudinary for rendered output pipeline)
- Writing results back to MongoDB

## Entrypoint

- `src/index.js`

It starts a BullMQ `Worker` listening on queue **`video-processing`** and routes jobs by name:

- `process-video` → `src/jobs/transcribeJob.js`
- `render-subtitles` → `src/jobs/renderJob.js`

## Transcribe pipeline (what happens)

Implemented in `src/jobs/transcribeJob.js`:

- Reuse cached audio if `Video.audioUrl` exists (saves bandwidth)
- Otherwise:
  - download original
  - generate preview mp4 (stored in R2, used by the editor)
  - extract audio wav + upload to R2 (cached for future retranscribe)
- Transcribe audio using provider routing in `src/pipeline/transcribe.js`
- For Hinglish, run cross-check + verification in `src/pipeline/quality/`
- Only save subtitles when the Hinglish quality gate approves the result
- Generate SRT from the approved captions
- Save `subtitleSrt`, `previewUrl`, `audioUrl`, etc. in MongoDB

Notes:

- Worker stores the **last raw transcription response** in `last_transcription_log.json` (local file) to help debugging.
- Retries are capped (`MAX_RETRIES = 3`) and a failure count is tracked on the `Video` doc.
- Hinglish verification uses a primary transcript, an optional cross-check provider, Gemini or DeepSeek for Roman Hinglish correction, and heuristic quality checks before marking a job `completed`.

## Render pipeline (export)

Implemented in `src/jobs/renderJob.js`:

- download original
- write subtitles to `.ass` (preferred) or `.srt`
- burn subtitles via FFmpeg
- upload rendered mp4
- save `outputUrl` in MongoDB

## Local run

```bash
cp .env.example .env
npm install
npm run dev
```

## Environment variables

Start from `.env.example`.

Required in practice:

- **`MONGODB_URI`**
- **`REDIS_URL`**
- **R2** (preview + cached audio):
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`
- **At least one ASR provider key**:
  - `GROQ_API_KEY` (default)
  - `ELEVENLABS_API_KEY` (used by editor retranscribe)
  - `OPENAI_API_KEY` (if you enable/use OpenAI path)
- Optional Hinglish quality gate:
  - `HINGLISH_VERIFIER_PROVIDER=gemini|deepseek`
  - `GOOGLE_GENERATIVE_AI_API_KEY` or `DEEPSEEK_API_KEY`
  - `HINGLISH_VERIFIER_MODEL`
  - `HINGLISH_MIN_AVG_CONFIDENCE`
  - `HINGLISH_MAX_LOW_CONFIDENCE_CAPTIONS`
