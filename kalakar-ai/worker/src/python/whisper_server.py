"""
Local Faster-Whisper HTTP Server
================================
Exposes an OpenAI-compatible transcription endpoint so the Node worker
can call it exactly like the Groq API.

Usage:
    pip install -r requirements.txt
    python whisper_server.py

Env vars (optional):
    WHISPER_MODEL   – model size: tiny, base, small, medium, large-v3 (default: small)
    WHISPER_DEVICE  – cpu or cuda (default: cpu)
    WHISPER_PORT    – port to listen on (default: 8787)
"""

import os
import sys
import tempfile
import logging

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
import uvicorn

# ── Config ───────────────────────────────────────────────────────────────────
MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = "int8" if DEVICE == "cpu" else "float16"
PORT = int(os.getenv("WHISPER_PORT", "8787"))

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("whisper-server")

# ── Load Model (once at startup) ────────────────────────────────────────────
logger.info(f"Loading Faster-Whisper model: {MODEL_SIZE} (device={DEVICE}, compute={COMPUTE_TYPE})")

try:
    from faster_whisper import WhisperModel
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    logger.info("✅ Model loaded successfully")
except Exception as e:
    logger.error(f"❌ Failed to load model: {e}")
    sys.exit(1)

# ── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="Faster-Whisper Server", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}


@app.post("/v1/audio/transcriptions")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form(None),
    prompt: str = Form(None),
    response_format: str = Form("verbose_json"),
    temperature: str = Form("0"),
):
    """
    OpenAI-compatible transcription endpoint.
    Accepts the same multipart form fields as the Groq / OpenAI Whisper API.
    Returns { text, words, segments } in verbose_json format.
    """
    # Save uploaded file to a temp path
    suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        content = await file.read()
        tmp.write(content)
        tmp.flush()
        tmp.close()

        logger.info(
            f"Transcribing: {file.filename} ({len(content)} bytes) "
            f"lang={language or 'auto'}"
        )

        # ── Run Faster-Whisper ───────────────────────────────────────────
        temp_val = float(temperature)
        segments_gen, info = model.transcribe(
            tmp.name,
            language=language if language else None,
            initial_prompt=prompt,
            word_timestamps=True,
            temperature=temp_val,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=200,
            ),
        )

        # ── Collect results ──────────────────────────────────────────────
        full_text = ""
        words_list = []
        segments_list = []

        for seg in segments_gen:
            full_text += seg.text
            segments_list.append({
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
                "text": seg.text,
            })
            if seg.words:
                for w in seg.words:
                    words_list.append({
                        "word": w.word,
                        "start": round(w.start, 3),
                        "end": round(w.end, 3),
                    })

        logger.info(
            f"✅ Done: {len(segments_list)} segments, {len(words_list)} words, "
            f"detected_lang={info.language} prob={info.language_probability:.2f}"
        )

        return JSONResponse(content={
            "text": full_text.strip(),
            "words": words_list,
            "segments": segments_list,
            "language": info.language,
        })

    except Exception as e:
        logger.error(f"❌ Transcription failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": {"message": str(e)}},
        )
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


# ── Entrypoint ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logger.info(f"Starting Whisper server on port {PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
