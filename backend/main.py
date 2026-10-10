"""
GD Arena – FastAPI backend.
Stateless server with /health, /turn, and /report endpoints.
"""

import os
from dotenv import load_dotenv

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

class TurnRequest(BaseModel):
    topic: str
    format: str = "general"
    language: str = "english"
    panel: list[str]
    phase: str
    last_speaker: str
    transcript: list[dict] = []


class TranscriptEntry(BaseModel):
    id: str
    speaker: str
    text: str
    started_at: float = 0.0
    ended_at: float = 0.0


class ReportRequest(BaseModel):
    topic: str
    transcript: list[dict]


# ---------- Endpoints ----------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "gd-arena"}


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
    )
    return result


@app.post("/report")
async def report_endpoint(req: ReportRequest):
    result = await generate_report(
        topic=req.topic,
        transcript=req.transcript,
    )
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
