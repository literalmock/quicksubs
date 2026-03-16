## QuickSubs Dashboard (`kalakar-ai/app`)

React + Vite dashboard that provides:

- Auth UI
- Upload UI
- Dashboard list + status polling
- Subtitle editor (timeline + canvas) and export workflow

## Local run

```bash
cp .env.example .env
npm install
npm run dev
```

Default: `http://localhost:5173`

## Environment variables

- **`VITE_API_URL`**: API base URL (defaults to `http://localhost:5000`)

## How the editor works (important for future changes)

The editor is implemented in `src/pages/VideoEditor.jsx` and uses three server capabilities:

- **Status polling**: `GET /video/status/:id`
  - Loads `subtitleSrt` if present; otherwise seeds captions from the transcript for editing.
- **Playback source**: `GET /video/source/:id?variant=preview`
  - The API streams a preview (preferred) or the original video with Range support, so the browser can play it reliably cross-origin.
- **Export pipeline**:
  1. `POST /video/save-subtitles` (persist `subtitleSrt` + styled `subtitleAss`)
  2. `POST /video/render` (queues worker render job)
  3. poll `GET /video/status/:id` until `outputUrl` is populated

## Where to change subtitle formats/themes

- **Core subtitle logic**: `src/utils/subtitles.js`
  - `parseSrtToSubtitles`, `subtitlesToSrt`, `subtitlesToAss`
  - style normalization (positions, y/x percent, etc.)
- **Themes**: `src/utils/captionThemes.js`

