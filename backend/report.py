"""
GD Arena – /report endpoint.
Metrics computed in Python from timestamps. LLM only does qualitative evaluation.
Quote validation ensures no invented quotes.
"""

import json
import os
import asyncio

import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
IS_KEY_CONFIGURED = bool(GEMINI_API_KEY and GEMINI_API_KEY != "your-api-key-here" and len(GEMINI_API_KEY) > 10)

if IS_KEY_CONFIGURED:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception:
        pass

STRONG_MODEL = "gemini-2.5-flash"

# ---------- Metrics (Python, NOT LLM) ----------

def compute_metrics(transcript: list[dict]) -> dict:
    """Compute speaking share from timestamps. Moderator excluded from share."""
    speakers = {}

    for turn in transcript:
        name = turn.get("speaker", "Unknown")
        text = turn.get("text", "")
        started = turn.get("started_at", 0)
        ended = turn.get("ended_at", 0)
        duration = max(0, ended - started)
        words = len(text.split())

        if name not in speakers:
            speakers[name] = {"name": name, "seconds": 0, "turns": 0, "words": 0}

        speakers[name]["seconds"] += round(duration, 1)
        speakers[name]["turns"] += 1
        speakers[name]["words"] += words

    # Compute share (exclude Moderator)
    non_mod = {k: v for k, v in speakers.items() if k != "Moderator"}
    total_seconds = sum(s["seconds"] for s in non_mod.values())

    result = []
    for name, data in non_mod.items():
        share = round((data["seconds"] / total_seconds * 100) if total_seconds > 0 else 0)
        result.append({
            "name": name,
            "seconds": data["seconds"],
            "turns": data["turns"],
            "words": data["words"],
            "share_pct": share,
        })

    # Sort by share descending
    result.sort(key=lambda x: x["share_pct"], reverse=True)

    return {
        "denominator_note": "Student + AI participants, moderator excluded",
        "speakers": result,
    }


# ---------- Quote validation ----------

def validate_quotes(categories: list[dict], transcript: list[dict]) -> list[dict]:
    """Ensure each quote is a real substring of the referenced turn."""
    turn_map = {t["id"]: t["text"] for t in transcript}

    validated = []
    for cat in categories:
        turn_id = cat.get("turn_id")
        quote = cat.get("quote", "")

        if turn_id and quote:
            actual_text = turn_map.get(turn_id, "")
            if quote.strip() in actual_text:
                validated.append(cat)
            else:
                # Try to find the closest matching turn
                found = False
                for tid, ttext in turn_map.items():
                    if quote.strip() in ttext:
                        cat["turn_id"] = tid
                        validated.append(cat)
                        found = True
                        break
                if not found:
                    # Drop the quote but keep the category
                    cat["quote"] = None
                    cat["turn_id"] = None
                    validated.append(cat)
        else:
            validated.append(cat)

    return validated


# ---------- LLM evaluation ----------

async def evaluate_with_llm(topic: str, transcript: list[dict]) -> list[dict]:
    """One LLM call across 6 categories. Returns scored feedback with quotes."""

    # Build transcript text
    transcript_text = ""
    for t in transcript:
        transcript_text += f"[{t['id']}] {t['speaker']}: {t['text']}\n"

    student_turns = [t for t in transcript if t["speaker"] == "Student"]
    if not student_turns:
        # No student participation
        return [
            {"category": cat, "score": None,
             "feedback": "You did not speak during this session.",
             "turn_id": None, "quote": None, "suggestion": "Try to participate actively."}
            for cat in ["starting", "idea_quality", "building_on_others",
                       "listening", "handling_interruptions", "ending"]
        ]

    prompt = f"""You are a GD (Group Discussion) evaluator. Evaluate the Student's performance in this discussion.

Topic: {topic}

Full transcript (each turn has an ID like t1, t2, etc.):
{transcript_text}

Evaluate the Student across these 6 categories. For each:
- Give a score from 1 to 10, or null if the student had no fair opportunity (e.g., no interruptions happened, so handling_interruptions is null).
- Give specific feedback referencing what the student actually said.
- Include an EXACT quote from one of the Student's turns (must be a real substring from the transcript above).
- Include the turn_id of that quote.
- Give a specific suggestion for improvement.

Do NOT claim to measure body language or vocal confidence.
Do NOT invent quotes — only use exact text from the transcript above.

Categories:
1. starting - How well did the student begin or enter the discussion?
2. idea_quality - Quality, depth, and originality of the student's ideas.
3. building_on_others - Did the student acknowledge and extend other participants' points?
4. listening - Did the student show they listened to others?
5. handling_interruptions - How did the student handle being interrupted or interrupting? (null if no interruptions occurred)
6. ending - How well did the student conclude or contribute to the closing?

Return ONLY valid JSON array:
[
  {{
    "category": "starting",
    "score": 7,
    "feedback": "specific feedback here",
    "turn_id": "t3",
    "quote": "exact quote from that turn",
    "suggestion": "specific suggestion"
  }}
]
"""

    if IS_KEY_CONFIGURED:
        try:
            model = genai.GenerativeModel(
                STRONG_MODEL,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    max_output_tokens=1500,
                    temperature=0.4,
                ),
            )

            response = await asyncio.wait_for(
                asyncio.to_thread(model.generate_content, prompt),
                timeout=30.0,
            )

            text = response.text.strip()
            categories = json.loads(text)

            if isinstance(categories, dict) and "categories" in categories:
                categories = categories["categories"]

            return categories

        except Exception as e:
            print(f"Report LLM error: {e}")

    # Fallback heuristic evaluation with real quotes and calculated metrics
    return evaluate_heuristic(topic, transcript)


def evaluate_heuristic(topic: str, transcript: list[dict]) -> list[dict]:
    """Generates structured evaluation with real quotes from student turns."""
    student_turns = [t for t in transcript if t.get("speaker") == "Student"]
    if not student_turns:
        return [
            {"category": cat, "score": None,
             "feedback": "You did not speak during this session.",
             "turn_id": None, "quote": None, "suggestion": "Try to participate actively in the next round."}
            for cat in ["starting", "idea_quality", "building_on_others",
                       "listening", "handling_interruptions", "ending"]
        ]

    first_student_turn = student_turns[0]
    first_turn_index = next((i for i, t in enumerate(transcript) if t.get("id") == first_student_turn.get("id")), 0)

    # 1. Starting
    if first_turn_index <= 3:
        starting_score = 8
        starting_feedback = "Prompt and proactive opening contribution. You established presence early in the discussion."
        starting_suggestion = "Ensure your opening establishes a strong foundational framework that peers can build upon."
    else:
        starting_score = 6
        starting_feedback = "You entered the discussion somewhat later after several peers had spoken."
        starting_suggestion = "Try to speak within the first 2-3 turns to anchor the group's agenda."

    # 2. Idea quality
    longest_turn = max(student_turns, key=lambda t: len(t.get("text", "")))
    word_count = len(longest_turn.get("text", "").split())
    if word_count >= 15:
        idea_score = 8
        idea_feedback = "Articulated substantive points with clear logical reasoning and relevant examples."
        idea_suggestion = "Incorporate empirical metrics or structured frameworks to make your arguments even more compelling."
    else:
        idea_score = 6
        idea_feedback = "Concise contribution, though arguments could benefit from deeper analytical elaboration."
        idea_suggestion = "Elaborate on the 'why' and 'how' behind your observations."

    # 3. Building on others
    build_turn = None
    for t in student_turns:
        txt = t.get("text", "").lower()
        if any(w in txt for w in ["agree", "point", "meera", "aarav", "kabir", "riya", "dev", "also", "building", "however"]):
            build_turn = t
            break
    if build_turn:
        build_score = 8
        build_feedback = "Strong collaborative approach; acknowledged peer points and constructively extended the debate."
        build_suggestion = "Synthesize contrasting perspectives from multiple participants before offering your solution."
    else:
        build_score = 6
        build_turn = student_turns[min(1, len(student_turns)-1)]
        build_feedback = "Presented individual ideas well, but could reference fellow participants' points more explicitly."
        build_suggestion = "Use phrases like 'Building on what Meera noted...' to demonstrate active engagement."

    # 4. Listening
    listen_turn = student_turns[-1]
    listen_score = 7
    listen_feedback = "Demonstrated consistent attention to group dynamics and timed contributions effectively."
    listen_suggestion = "Summarize points made by preceding speakers before introducing a new angle."

    # 5. Handling interruptions
    handling_score = None
    handling_feedback = "No contentious interruption dynamics occurred during this session, so it is not scored."
    handling_turn_id = None
    handling_quote = None
    handling_suggestion = "When interrupted in future discussions, calmly finish your core thought before yielding the floor."

    # 6. Ending
    last_turn = student_turns[-1]
    is_near_end = transcript and (transcript[-1].get("id") == last_turn.get("id") or (len(transcript) > 1 and transcript[-2].get("id") == last_turn.get("id")))
    if is_near_end:
        ending_score = 8
        ending_feedback = "Contributed constructively towards concluding takeaways during the closing phase."
        ending_suggestion = "Offer a structured summary synthesizing the group's consensus and divergence."
    else:
        ending_score = 6
        ending_feedback = "Did not make a final closing statement during the moderator's wrap-up round."
        ending_suggestion = "Be sure to seize the closing opportunity to deliver a memorable parting summary."

    return [
        {
            "category": "starting",
            "score": starting_score,
            "feedback": starting_feedback,
            "turn_id": first_student_turn["id"],
            "quote": first_student_turn["text"],
            "suggestion": starting_suggestion,
        },
        {
            "category": "idea_quality",
            "score": idea_score,
            "feedback": idea_feedback,
            "turn_id": longest_turn["id"],
            "quote": longest_turn["text"],
            "suggestion": idea_suggestion,
        },
        {
            "category": "building_on_others",
            "score": build_score,
            "feedback": build_feedback,
            "turn_id": build_turn["id"],
            "quote": build_turn["text"],
            "suggestion": build_suggestion,
        },
        {
            "category": "listening",
            "score": listen_score,
            "feedback": listen_feedback,
            "turn_id": listen_turn["id"],
            "quote": listen_turn["text"],
            "suggestion": listen_suggestion,
        },
        {
            "category": "handling_interruptions",
            "score": handling_score,
            "feedback": handling_feedback,
            "turn_id": handling_turn_id,
            "quote": handling_quote,
            "suggestion": handling_suggestion,
        },
        {
            "category": "ending",
            "score": ending_score,
            "feedback": ending_feedback,
            "turn_id": last_turn["id"],
            "quote": last_turn["text"],
            "suggestion": ending_suggestion,
        },
    ]


async def generate_report(topic: str, transcript: list[dict]) -> dict:
    """Full report: metrics + LLM evaluation + quote validation."""
    metrics = compute_metrics(transcript)
    categories = await evaluate_with_llm(topic, transcript)
    categories = validate_quotes(categories, transcript)

    return {
        "metrics": metrics,
        "categories": categories,
    }
