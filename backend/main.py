"""
GD Arena – FastAPI backend.
Stateless server with /health, /turn, and /report endpoints.
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

# Ensure UTF-8 stdout encoding on Windows to prevent charmap UnicodeEncodeErrors
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from turn import get_next_turn
from report import generate_report

app = FastAPI(title="GD Arena API", version="1.0.0")

# CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Models ----------

class ApiKeyRequest(BaseModel):
    api_key: str


class TurnRequest(BaseModel):
    topic: str
    format: str = "general"
    language: str = "english"
    panel: list[str]
    phase: str
    last_speaker: str
    transcript: list[dict] = []
    api_key: str = ""


class TranscriptEntry(BaseModel):
    id: str
    speaker: str
    text: str
    started_at: float = 0.0
    ended_at: float = 0.0


class ReportRequest(BaseModel):
    topic: str
    transcript: list[dict]
    api_key: str = ""


# ---------- Endpoints ----------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "gd-arena"}


@app.get("/api-key-status")
async def api_key_status():
    env_key = os.getenv("GEMINI_API_KEY", "").strip()
    is_valid = bool(env_key and env_key != "your-api-key-here" and len(env_key) > 10)
    return {
        "configured": is_valid,
        "masked_key": f"{env_key[:4]}...{env_key[-4:]}" if is_valid and len(env_key) >= 8 else "",
    }


@app.post("/set-api-key")
async def set_api_key_endpoint(req: ApiKeyRequest):
    key = req.api_key.strip()
    if not key or len(key) < 10:
        return {"status": "error", "message": "API key appears too short or empty."}

    # Verify key with a lightweight Gemini check
    import google.generativeai as genai
    try:
        genai.configure(api_key=key)
        model = genai.GenerativeModel("gemini-3.8-flash")
        # Quick test
        response = await asyncio.to_thread(model.generate_content, "Say 'OK'")
        if response and response.text:
            os.environ["GEMINI_API_KEY"] = key
            # Update .env
            env_path = os.path.join(os.path.dirname(__file__), ".env")
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(f"GEMINI_API_KEY={key}\n")
            return {"status": "ok", "message": "Gemini 2.0 Flash connected successfully!"}
    except Exception as e:
        return {"status": "error", "message": f"Gemini key verification failed: {str(e)}"}

    return {"status": "error", "message": "Could not verify key."}


@app.post("/turn")
async def turn_endpoint(req: TurnRequest):
    result = await get_next_turn(
        topic=req.topic,
        format=req.format,
        language=req.language,
        panel=req.panel,
        phase=req.phase,
        last_speaker=req.last_speaker,
        transcript=req.transcript,
        api_key=req.api_key,
    )
    return result


@app.post("/report")
async def report_endpoint(req: ReportRequest):
    result = await generate_report(
        topic=req.topic,
        transcript=req.transcript,
        api_key=req.api_key,
    )
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
