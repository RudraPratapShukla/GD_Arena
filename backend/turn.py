"""
GD Arena – /turn endpoint.
One LLM call picks the next speaker AND writes the line.
Guards enforce turn-taking rules in code, not left to the LLM.
"""

import json
import os
import asyncio
from typing import Optional

import google.generativeai as genai
from personalities import PERSONALITIES, PANEL_ORDER, FALLBACK_LINES, FALLBACK_LINES_HINGLISH

# Configure Gemini if valid key exists
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
IS_KEY_CONFIGURED = bool(GEMINI_API_KEY and GEMINI_API_KEY != "your-api-key-here" and len(GEMINI_API_KEY) > 10)

if IS_KEY_CONFIGURED:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception:
        pass

FAST_MODEL = "gemini-2.0-flash"

def get_fallback_line(speaker: str, phase: str, language: str, topic: str, turn_index: int = 0) -> str:
    pool = FALLBACK_LINES_HINGLISH if language == "hinglish" else FALLBACK_LINES
    if speaker == "Moderator":
        mod_pool = pool.get("Moderator", {})
        line = mod_pool.get(phase, mod_pool.get("middle", "Let's continue the discussion."))
        return line.replace("{topic}", topic)

    speaker_lines = pool.get(speaker, FALLBACK_LINES.get(speaker, ["That's an interesting point."]))
    if isinstance(speaker_lines, list):
        return speaker_lines[turn_index % len(speaker_lines)]
    return str(speaker_lines)

# ---------- Speaker guards (code, not LLM) ----------

def pick_forced_speaker(panel: list[str], last_speaker: str,
                         transcript: list[dict]) -> Optional[str]:
    """Force a speaker if someone has been silent for 3+ turns."""
    if len(transcript) < 3:
        return None

    recent_speakers = set()
    for turn in transcript[-3:]:
        recent_speakers.add(turn.get("speaker", ""))

    silent = [p for p in panel if p not in recent_speakers and p != last_speaker]
    if silent:
        return silent[0]
    return None


def validate_speaker(speaker: str, panel: list[str], last_speaker: str,
                      phase: str) -> str:
    """Ensure the speaker is valid: in the panel, and not the same as last."""
    allowed = list(panel)
    if phase in ("opening", "closing"):
        allowed.append("Moderator")

    if speaker not in allowed:
        # Pick someone who isn't last_speaker
        candidates = [p for p in allowed if p != last_speaker]
        return candidates[0] if candidates else allowed[0]

    if speaker == last_speaker:
        candidates = [p for p in allowed if p != last_speaker]
        return candidates[0] if candidates else speaker

    return speaker


# ---------- LLM call ----------

def build_turn_prompt(topic: str, format: str, language: str,
                       panel: list[str], phase: str, last_speaker: str,
                       transcript: list[dict],
                       forced_speaker: Optional[str] = None) -> str:
    """Build the system + user prompt for the /turn LLM call."""

    panel_desc = []
    for name in panel:
        p = PERSONALITIES.get(name, {})
        panel_desc.append(f"- {name} ({p.get('role', 'participant')})")

    panel_str = "\n".join(panel_desc)

    transcript_lines = []
    for t in transcript[-6:]:
        transcript_lines.append(f"{t['speaker']}: {t['text']}")
    transcript_str = "\n".join(transcript_lines) if transcript_lines else "(no turns yet)"

    speaker_instruction = ""
    if forced_speaker:
        speaker_instruction = f"\nYou MUST pick '{forced_speaker}' as the next speaker because they have been quiet."
    else:
        speaker_instruction = f"\nDo NOT pick '{last_speaker}' as the next speaker (no back-to-back)."

    language_note = ""
    if language == "hinglish":
        language_note = "\nSpeak in Hinglish (Hindi-English mix, Roman script)."

    phase_note = ""
    if phase == "opening":
        phase_note = "\nThis is the OPENING. The Moderator should speak to welcome everyone and state the topic."
    elif phase == "closing":
        phase_note = "\nThis is the CLOSING round. The Moderator should ask for final thoughts or wrap up."
    elif phase == "middle":
        phase_note = "\nThis is the MIDDLE of the discussion. Participants should debate and build on each other's points."

    format_note = ""
    if format == "case":
        format_note = "\nThis is a CASE STUDY discussion. Focus on practical solutions and structured analysis."
    elif format == "abstract":
        format_note = "\nThis is an ABSTRACT topic discussion. Be philosophical and explore multiple interpretations."
    elif format == "controversial":
        format_note = "\nThis is a CONTROVERSIAL topic. Take clear positions and engage with opposing views."

    prompt = f"""You are the GD Arena discussion engine. Pick the next speaker and write their line.

Topic: {topic}
Panel:
{panel_str}
{phase_note}{format_note}{language_note}{speaker_instruction}

Recent transcript:
{transcript_str}

Respond to {last_speaker}'s point. The AI participants should talk to EACH OTHER, not only to the student.

Return ONLY valid JSON in this exact format:
{{"speaker": "<name from panel or Moderator>", "text": "<1-3 sentences spoken>", "intent": "<challenge|agree|extend|redirect>"}}
"""
    return prompt


async def get_next_turn(topic: str, format: str, language: str,
                         panel: list[str], phase: str, last_speaker: str,
                         transcript: list[dict], api_key: str = "") -> dict:
    """Get the next turn from the LLM with guards, timeout, retry, and fallback."""

    has_moderator_spoken = any(t.get("speaker") == "Moderator" for t in transcript)
    effective_phase = phase

    # If moderator has already spoken, opening phase is COMPLETE. Never repeat opening.
    if has_moderator_spoken and effective_phase == "opening":
        effective_phase = "middle"

    # Opening phase: Moderator speaks exactly ONCE at the start
    if effective_phase == "opening" and not has_moderator_spoken:
        return {
            "speaker": "Moderator",
            "text": get_fallback_line("Moderator", "opening", language, topic),
            "intent": "redirect",
        }

    # Closing phase: Moderator wraps up once
    closing_mod_spoken = any(t.get("speaker") == "Moderator" and t.get("phase") == "closing" for t in transcript)
    if effective_phase == "closing" and last_speaker != "Moderator" and not closing_mod_spoken:
        return {
            "speaker": "Moderator",
            "text": get_fallback_line("Moderator", "closing", language, topic),
            "intent": "redirect",
        }

    forced = pick_forced_speaker(panel, last_speaker, transcript)
    turn_idx = len(transcript)

    # Determine if API key is provided or configured
    active_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
    key_available = bool(active_key and active_key != "your-api-key-here" and len(active_key) > 10)

    # If API key is configured, call LLM
    if key_available:
        try:
            genai.configure(api_key=active_key)
            system_parts = []
            for name in panel:
                p = PERSONALITIES.get(name, {})
                system_parts.append(f"{name}: {p.get('system_prompt', '')}")
            system_parts.append(f"Moderator: {PERSONALITIES['Moderator']['system_prompt']}")
            system_prompt = "\n\n".join(system_parts)

            user_prompt = build_turn_prompt(
                topic, format, language, panel, effective_phase,
                last_speaker, transcript, forced
            )

            model = genai.GenerativeModel(
                FAST_MODEL,
                system_instruction=system_prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    max_output_tokens=120,
                    temperature=0.85,
                ),
            )

            for attempt in range(2):
                try:
                    response = await asyncio.wait_for(
                        asyncio.to_thread(model.generate_content, user_prompt),
                        timeout=8.0,
                    )
                    text = response.text.strip()
                    result = json.loads(text)

                    speaker = result.get("speaker", "")
                    line = result.get("text", "")
                    intent = result.get("intent", "extend")

                    speaker = validate_speaker(speaker, panel, last_speaker, effective_phase)
                    # Never allow Moderator to speak standard conversational turns in middle
                    if effective_phase == "middle" and speaker == "Moderator":
                        candidates = [p for p in panel if p != last_speaker]
                        speaker = candidates[0] if candidates else panel[0]

                    if not line or len(line.strip()) < 3:
                        line = get_fallback_line(speaker, effective_phase, language, topic, turn_idx)

                    return {
                        "speaker": speaker,
                        "text": line.strip(),
                        "intent": intent,
                    }
                except (json.JSONDecodeError, KeyError, TypeError):
                    if attempt == 0:
                        continue
                    break
                except asyncio.TimeoutError:
                    if attempt == 0:
                        continue
                    break
                except Exception:
                    if attempt == 0:
                        continue
                    break
        except Exception:
            pass

    # Fallback when LLM fails or API key is not configured
    if forced:
        fallback_speaker = forced
    else:
        candidates = [p for p in panel if p != last_speaker and p != "Moderator"]
        fallback_speaker = candidates[0] if candidates else panel[0]

    # Context-aware fallback if student just spoke
    fallback_text = get_fallback_line(fallback_speaker, effective_phase, language, topic, turn_idx)
    if last_speaker == "Student":
        student_responses = {
            "Aarav": "I see your point about human roles, but in high-stakes industries, businesses will prioritize automation efficiency over sentiment.",
            "Meera": "That's an important angle. Looking at the data, companies aren't just replacing workers; they are shifting human roles toward supervision and high-level strategy.",
            "Kabir": "Building on what you said, the real dilemma isn't whether jobs change, but whether we are educating the next generation to adapt fast enough.",
            "Riya": "I really like that perspective. Automation handles routine logic, which frees human beings to focus on creative problem solving and empathy.",
            "Dev": "That's a very valid perspective. It actually reminds me of how computing was feared in the 80s, but it ended up opening massive new sectors.",
        }
        if fallback_speaker in student_responses:
            fallback_text = student_responses[fallback_speaker]

    return {
        "speaker": fallback_speaker,
        "text": fallback_text,
        "intent": "extend",
    }
