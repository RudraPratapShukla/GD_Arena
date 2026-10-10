"""
GD Arena – /turn endpoint.
Stateless, robust turn-taking engine with:
1. Deterministic speaker selection in CODE (guards against back-to-back, forces silent participants).
2. Gemini model cascade invocation with strict prompt structure and temperature 0.9.
3. Native Hinglish and English language routing with Romanized Hinglish generation.
4. Anti-repetition guard (70% word overlap check + 1 regeneration attempt).
5. Safe console logging with Windows UTF-8 charset protection (never crashes on Devanagari / Unicode).
"""

import json
import os
import sys
import asyncio
import string
from typing import Optional

# Ensure UTF-8 stdout on Windows to prevent UnicodeEncodeError charmap crashes
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


def safe_print(*args, **kwargs):
    """Print helper that never raises UnicodeEncodeError on any platform."""
    try:
        print(*args, **kwargs)
    except Exception:
        try:
            safe_args = [str(a).encode("ascii", errors="backslashreplace").decode("ascii") for a in args]
            print(*safe_args, **kwargs)
        except Exception:
            pass


import google.generativeai as genai
from personalities import PERSONALITIES, PANEL_ORDER, FALLBACK_LINES, FALLBACK_LINES_HINGLISH

MODELS_CASCADE = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]


def normalize_text(text: str) -> str:
    """Lowercase and strip punctuation for repetition checking."""
    text = (text or "").lower()
    for p in string.punctuation:
        text = text.replace(p, " ")
    return " ".join(text.split())


def word_overlap_ratio(text_a: str, text_b: str) -> float:
    """Calculate word overlap relative to the shorter text."""
    words_a = set(normalize_text(text_a).split())
    words_b = set(normalize_text(text_b).split())
    if not words_a or not words_b:
        return 0.0
    common = words_a.intersection(words_b)
    return len(common) / min(len(words_a), len(words_b))


def is_repetitive(new_line: str, recent_lines: list[str]) -> bool:
    """Check if new_line is identical or has >70% word overlap with any recent lines."""
    norm_new = normalize_text(new_line)
    if not norm_new:
        return True
    for line in recent_lines:
        norm_line = normalize_text(line)
        if norm_new == norm_line:
            return True
        if word_overlap_ratio(new_line, line) > 0.70:
            return True
    return False


def detect_participation_imbalance(panel: list[str], transcript: list[dict]) -> tuple[bool, str, str]:
    """
    Smart Participation Balancer:
    Detects if one speaker dominates the conversation or if quieter participants (including Student)
    need gentle encouragement without interrupting confident speakers.
    Returns: (should_moderate: bool, dominant_speaker: str, quiet_target: str)
    """
    total_turns = len(transcript)
    if total_turns < 3:
        return False, "", ""

    # Check how many turns ago Moderator last spoke
    mod_indices = [i for i, t in enumerate(transcript) if t.get("speaker") == "Moderator"]
    if mod_indices and (total_turns - 1 - max(mod_indices)) < 4:
        # Avoid speaking too frequently (at least 4 non-moderator turns between balancing interventions)
        return False, "", ""

    # Turn count per speaker
    counts = {}
    for t in transcript:
        spk = t.get("speaker")
        if spk and spk != "Moderator":
            counts[spk] = counts.get(spk, 0) + 1

    cohort = list(panel) + ["Student"]
    for c in cohort:
        if c not in counts:
            counts[c] = 0

    non_mod_total = sum(counts.values())
    if non_mod_total < 3:
        return False, "", ""

    # Detect dominant speaker: someone with >= 38% share and at least 2 turns
    dominant_speaker = ""
    for spk, cnt in counts.items():
        if cnt >= 2 and (cnt / non_mod_total) >= 0.38:
            dominant_speaker = spk
            break

    # Detect quieter participant: Student or panel peer
    quiet_target = ""
    student_indices = [i for i, t in enumerate(transcript) if t.get("speaker") == "Student"]
    student_last = max(student_indices) if student_indices else -1
    if student_last == -1 or (total_turns - 1 - student_last) >= 3:
        quiet_target = "Student"
    else:
        quiet_candidates = [p for p in panel if counts.get(p, 0) <= 1]
        if quiet_candidates:
            quiet_target = quiet_candidates[0]

    if dominant_speaker or (quiet_target and total_turns >= 4):
        return True, dominant_speaker, quiet_target

    return False, "", ""


def choose_speaker(panel: list[str], last_speaker: str, phase: str, transcript: list[dict]) -> str:
    """
    Choose speaker in CODE first:
    - Never the same as last_speaker.
    - Moderator speaks in opening, closing, and as Smart Participation Balancer during middle phase.
    - In middle, force least recent speaker if someone has been silent for 3+ turns.
    """
    has_moderator_opened = any(t.get("speaker") == "Moderator" for t in transcript)

    # 1. Opening phase: Moderator speaks if not already opened
    if phase == "opening" and not has_moderator_opened:
        return "Moderator"

    # 2. Closing phase: Moderator wraps up once
    closing_mod_spoken = any(t.get("speaker") == "Moderator" and t.get("phase") == "closing" for t in transcript)
    if phase == "closing" and last_speaker != "Moderator" and not closing_mod_spoken:
        return "Moderator"

    # 3. Middle phase Smart Participation Balancer intervention
    if phase == "middle" and last_speaker != "Moderator":
        should_moderate, _, _ = detect_participation_imbalance(panel, transcript)
        if should_moderate:
            return "Moderator"

    # Candidates: all panel participants excluding last_speaker
    candidates = [p for p in panel if p != last_speaker and p != "Moderator"]
    if not candidates:
        candidates = [p for p in panel if p != "Moderator"] or ["Aarav"]

    # Calculate turns since last spoke for each candidate
    speaker_last_index = {}
    for p in candidates:
        indices = [i for i, t in enumerate(transcript) if t.get("speaker") == p]
        speaker_last_index[p] = max(indices) if indices else -1

    total_turns = len(transcript)
    # Check if someone has been silent for 3+ turns
    silent_candidates = [p for p in candidates if (total_turns - speaker_last_index[p]) >= 3]
    if silent_candidates:
        silent_candidates.sort(key=lambda p: speaker_last_index[p])
        return silent_candidates[0]

    # Otherwise pick the least recent speaker among all candidates
    candidates.sort(key=lambda p: speaker_last_index[p])
    return candidates[0]


def get_non_repeating_fallback(speaker: str, phase: str, topic: str, previous_speaker_lines: list[str], language: str = "english") -> str:
    """Select a fallback line from the persona pool that matches the discussion language."""
    pool_dict = FALLBACK_LINES_HINGLISH if language == "hinglish" else FALLBACK_LINES

    if speaker == "Moderator":
        mod_pool = pool_dict.get("Moderator", {})
        if phase == "opening":
            return mod_pool.get("opening", "Welcome everyone to today's group discussion. Let's begin.").replace("{topic}", topic)
        if phase == "closing":
            return mod_pool.get("closing", "We are reaching the end of our allotted time. Let's hear closing thoughts.")
        middle_lines = mod_pool.get("middle", ["Let's ensure everyone has an opportunity to share their perspective."])
        for line in middle_lines:
            if not is_repetitive(line, previous_speaker_lines):
                return line
        return middle_lines[0]

    lines = pool_dict.get(speaker, ["I think we need to examine this from a practical angle."])
    for line in lines:
        if not is_repetitive(line, previous_speaker_lines):
            return line
    return lines[0]


def build_prompt(topic: str, phase: str, chosen_speaker: str, last_speaker: str,
                 transcript: list[dict], language: str = "english", extra_instruction: str = "") -> tuple[str, str]:
    """
    Build structured system and user prompts.
    Handles English and Hinglish seamlessly with Latin/Roman script generation for TTS clarity.
    """
    persona_info = PERSONALITIES.get(chosen_speaker, {})
    persona_system = persona_info.get("system_prompt", f"You are {chosen_speaker}, a competitive GD participant.")
    persona_role = persona_info.get("role", "Participant")

    if language == "hinglish":
        lang_rules = """LANGUAGE REQUIREMENT: HINGLISH ONLY.
- You MUST speak in natural, colloquial, modern conversational Hinglish (code-switching Hindi and English like Indian college/MBA students in placement GDs).
- EXAMPLE: "Main Aarav ke point se agree karta hoon, lekin ground reality ye hai ki automation se direct job losses honge."
- CRITICAL: Write ONLY in the Latin/English alphabet (Romanized Hinglish). Do NOT write in Devanagari Hindi script.
- Keep technical terms in English (e.g. 'automation', 'productivity', 'metrics', 'scalability', 'efficiency') while using Hindi conversational phrasing ('lekin', 'kyunki', 'isliye', 'humein sochna hoga', 'agree karta hoon')."""
    else:
        lang_rules = """LANGUAGE REQUIREMENT: ENGLISH ONLY.
- Speak in clear, professional, fluent English suitable for placement GDs."""

    system_prompt = f"""{persona_system}

Common GD Rules:
- You are a participant in a competitive placement group discussion on the topic: "{topic}".
- Stay strictly focused on this topic.
- Sound conversational, sharp, and natural (1 to 3 spoken sentences).
- Listen carefully to what was just argued in the room. React directly to the immediate previous speaker ({last_speaker}).
- Bring your own distinct angle as {chosen_speaker} ({persona_role}): do not repeat earlier points.
{lang_rules}
- Return ONLY valid JSON in this exact structure:
{{"speaker": "{chosen_speaker}", "text": "<your spoken line in Latin script>", "intent": "challenge|agree|extend|redirect"}}
"""

    # Discussion so far (up to last 8 turns)
    so_far_lines = []
    if len(transcript) > 1:
        for t in transcript[-8:-1]:
            so_far_lines.append(f"{t.get('speaker', 'Unknown')}: {t.get('text', '')}")
    elif len(transcript) == 1 and transcript[0].get("speaker") != last_speaker:
        so_far_lines.append(f"{transcript[0].get('speaker')}: {transcript[0].get('text', '')}")

    so_far_str = "\n".join(so_far_lines) if so_far_lines else "(discussion just beginning)"
    latest_message = transcript[-1].get("text", "") if transcript else "(the floor is open)"

    # This speaker's earlier lines
    prev_lines = [t.get("text", "") for t in transcript if t.get("speaker") == chosen_speaker]
    prev_lines_str = "\n".join(f"- {l}" for l in prev_lines[-4:]) if prev_lines else "(none yet)"

    extra_str = f"\nEXTRA INSTRUCTION: {extra_instruction}\n" if extra_instruction else ""

    if chosen_speaker == "Moderator":
        task_instruction = (
            f"TASK: Reply as the GD Moderator & Smart Participation Balancer in 1-2 spoken sentences.\n"
            f"- Acknowledge the point from {last_speaker} respectfully without interrupting harshly.\n"
            f"- Act as a fair moderator: encourage quieter participants (especially Student or less frequent speakers) to contribute.\n"
            f"- Ask an engaging prompt such as: 'What is your perspective on this?' or 'How do you view this side of the debate?'\n"
            f"- Do NOT take a side. Remain diplomatic, encouraging, and neutral."
        )
    else:
        task_instruction = (
            f"TASK: Reply as {chosen_speaker} ({persona_role}) in 1-3 spoken sentences. "
            f"React directly to the LATEST MESSAGE from {last_speaker}: refer to one specific point in it, "
            f"then agree, challenge, or extend it with a NEW point that has not been said yet."
        )

    user_prompt = f"""TOPIC: {topic}
PHASE: {phase}
LANGUAGE: {"HINGLISH (Romanized Latin alphabet)" if language == "hinglish" else "ENGLISH"}

DISCUSSION SO FAR (oldest to newest):
{so_far_str}

LATEST MESSAGE (from {last_speaker}): "{latest_message}"

YOUR IDENTITY: {chosen_speaker} (Persona: {persona_role})
YOUR PREVIOUS LINES (never repeat or rephrase these):
{prev_lines_str}
{extra_str}
{task_instruction}
{"Write in natural conversational Hinglish using Latin/English characters." if language == "hinglish" else "Write in fluent English."}
Return JSON only: {{"speaker": "{chosen_speaker}", "text": "<your spoken line>", "intent": "<challenge|agree|extend|redirect>"}}
"""
    return system_prompt, user_prompt


async def get_next_turn(topic: str, format: str, language: str,
                         panel: list[str], phase: str, last_speaker: str,
                         transcript: list[dict], api_key: str = "") -> dict:
    """
    Main entry point for /turn:
    1. Log request safely without charmap crashes.
    2. Choose speaker in code.
    3. Call Gemini with cascade and language-aware prompt.
    4. Validate and apply anti-repetition guard.
    5. Fallback safely with Hinglish or English lines.
    """
    # 1. Logging
    num_turns = len(transcript)
    last_line = transcript[-1].get("text", "NONE") if transcript else "NONE"
    safe_print(f"[/turn REQUEST] phase='{phase}' | lang='{language}' | last_speaker='{last_speaker}' | transcript_turns={num_turns} | last_line='{last_line}'")

    # 2. Speaker Selection in CODE
    has_moderator_opened = any(t.get("speaker") == "Moderator" for t in transcript)
    effective_phase = phase
    if has_moderator_opened and effective_phase == "opening":
        effective_phase = "middle"

    chosen_speaker = choose_speaker(panel, last_speaker, effective_phase, transcript)
    safe_print(f"[/turn CODE SELECTION] Chosen speaker: {chosen_speaker} (last_speaker was '{last_speaker}')")

    # Handle Moderator opening directly if no LLM needed
    if chosen_speaker == "Moderator" and effective_phase == "opening":
        mod_line = get_non_repeating_fallback("Moderator", "opening", topic, [], language=language)
        return {
            "speaker": "Moderator",
            "text": mod_line,
            "intent": "redirect",
            "source": "fallback",
            "fallback_reason": "moderator_initial_opening",
        }

    # Gather recent lines from all speakers for repetition guard
    recent_lines_all = [t.get("text", "") for t in transcript[-6:] if t.get("text")]
    speaker_prev_lines = [t.get("text", "") for t in transcript if t.get("speaker") == chosen_speaker and t.get("text")]

    # 3. Configure Gemini key
    active_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
    key_available = bool(active_key and active_key != "your-api-key-here" and len(active_key) > 10)

    if key_available:
        try:
            genai.configure(api_key=active_key)
            system_prompt, user_prompt = build_prompt(
                topic, effective_phase, chosen_speaker, last_speaker, transcript, language=language
            )

            # Cascade across supported models in case one hits quota/rate limits
            for model_name in MODELS_CASCADE:
                try:
                    model = genai.GenerativeModel(
                        model_name,
                        system_instruction=system_prompt,
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json",
                            max_output_tokens=1000,
                            temperature=0.9,
                        ),
                    )

                    # Try LLM call (with 1 anti-repetition regeneration if needed)
                    regenerate_needed = False
                    for attempt in range(2):
                        current_user_prompt = user_prompt
                        if regenerate_needed:
                            _, current_user_prompt = build_prompt(
                                topic, effective_phase, chosen_speaker, last_speaker, transcript,
                                language=language,
                                extra_instruction=f"Your last answer repeated an earlier line. Say something new that responds to: '{last_line}'."
                            )

                        try:
                            response = await asyncio.wait_for(
                                asyncio.to_thread(model.generate_content, current_user_prompt),
                                timeout=15.0,
                            )
                            raw_text = response.text.strip()
                            safe_print(f"[/turn LLM SUCCESS] attempt={attempt+1} | model={model_name} | raw_output={raw_text}")

                            cleaned_text = raw_text
                            if cleaned_text.startswith("```"):
                                lines = cleaned_text.split("\n")
                                if lines and lines[0].startswith("```"):
                                    lines = lines[1:]
                                if lines and lines[-1].startswith("```"):
                                    lines = lines[:-1]
                                cleaned_text = "\n".join(lines).strip()

                            result = json.loads(cleaned_text)
                            line = result.get("text", "").strip()
                            intent = result.get("intent", "extend")

                            if not line or len(line) < 5:
                                raise ValueError("Empty or invalid line returned by model")

                            # Anti-repetition check against last 6 lines from ALL speakers
                            if is_repetitive(line, recent_lines_all):
                                safe_print(f"[/turn REPETITION DETECTED] Line '{line}' repeats recent lines. attempt={attempt+1}")
                                if attempt == 0:
                                    regenerate_needed = True
                                    continue
                                else:
                                    raise ValueError(f"Repeated line after regeneration: '{line}'")

                            return {
                                "speaker": chosen_speaker,
                                "text": line,
                                "intent": intent,
                                "source": "llm",
                                "model_used": model_name,
                            }

                        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as parse_err:
                            safe_print(f"[/turn LLM FAILURE] attempt={attempt+1} | parse_error={type(parse_err).__name__}: {str(parse_err)}")
                            if attempt == 0 and not regenerate_needed:
                                continue
                            break
                        except asyncio.TimeoutError:
                            safe_print(f"[/turn LLM FAILURE] attempt={attempt+1} | Timeout after 15.0s on {model_name}")
                            break
                        except Exception as call_err:
                            err_str = str(call_err)
                            safe_print(f"[/turn LLM FAILURE] model={model_name} | exception={type(call_err).__name__}: {err_str}")
                            break

                except Exception as model_setup_err:
                    safe_print(f"[/turn MODEL SETUP FAILED] model={model_name} | error={model_setup_err}")
                    continue

        except Exception as setup_err:
            safe_print(f"[/turn LLM SETUP FAILURE] exception={type(setup_err).__name__}: {str(setup_err)}")
            fallback_reason = f"setup_error: {str(setup_err)}"
    else:
        fallback_reason = "gemini_api_key_not_configured"

    # Fallback in chosen language
    fallback_text = get_non_repeating_fallback(chosen_speaker, effective_phase, topic, speaker_prev_lines, language=language)
    reason = "llm_call_failed_or_repeated" if key_available else "api_key_missing"
    safe_print(f"[/turn FALLBACK USED] speaker={chosen_speaker} | lang={language} | reason={reason} | text='{fallback_text}'")

    return {
        "speaker": chosen_speaker,
        "text": fallback_text,
        "intent": "extend",
        "source": "fallback",
        "fallback_reason": reason,
    }
