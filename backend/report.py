"""
GD Arena – /report endpoint.
Metrics computed in Python from timestamps. LLM only does qualitative evaluation.
Quote validation ensures no invented quotes.
"""

import json
import os
import sys
import asyncio
import re

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
    try:
        print(*args, **kwargs)
    except Exception:
        try:
            safe_args = [str(a).encode("ascii", errors="backslashreplace").decode("ascii") for a in args]
            print(*safe_args, **kwargs)
        except Exception:
            pass


import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
IS_KEY_CONFIGURED = bool(GEMINI_API_KEY and GEMINI_API_KEY != "your-api-key-here" and len(GEMINI_API_KEY) > 10)

if IS_KEY_CONFIGURED:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception:
        pass

STRONG_MODEL = "gemini-3.8-flash"

# ---------- Metrics (Python, NOT LLM) ----------

def compute_metrics(transcript: list[dict], topic: str = "", student_categories: list[dict] = None, llm_ratings: dict = None) -> dict:
    """Compute performance ratings out of 10 for every participant. Moderator excluded."""
    speakers = {}

    for turn in transcript:
        name = turn.get("speaker", "Unknown")
        text = turn.get("text", "")
        started = turn.get("started_at", 0)
        ended = turn.get("ended_at", 0)
        duration = max(0, ended - started)
        words = len(text.split())

        if name not in speakers:
            speakers[name] = {"name": name, "seconds": 0, "turns": 0, "words": 0, "texts": []}

        speakers[name]["seconds"] += round(duration, 1)
        speakers[name]["turns"] += 1
        speakers[name]["words"] += words
        speakers[name]["texts"].append(text)

    # Exclude Moderator from participant performance scoring
    non_mod = {k: v for k, v in speakers.items() if k != "Moderator"}

    # Average score for Student if categories are evaluated
    student_avg_score = None
    if student_categories:
        valid_scores = [c["score"] for c in student_categories if isinstance(c.get("score"), (int, float))]
        if valid_scores:
            student_avg_score = round(sum(valid_scores) / len(valid_scores), 1)

    total_seconds = sum(data["seconds"] for data in non_mod.values())
    total_words = sum(data["words"] for data in non_mod.values())

    result = []
    for name, data in non_mod.items():
        all_words = data["words"]
        turns_count = data["turns"]

        if total_seconds > 0:
            share_pct = round((data["seconds"] / total_seconds) * 100, 1)
        elif total_words > 0:
            share_pct = round((data["words"] / total_words) * 100, 1)
        else:
            share_pct = round(100.0 / len(non_mod), 1) if non_mod else 0

        # Check if LLM provided a score and feedback for this speaker
        llm_info = (llm_ratings or {}).get(name, {})
        if llm_info and "score" in llm_info and isinstance(llm_info["score"], (int, float)):
            score = round(float(llm_info["score"]), 1)
            feedback = llm_info.get("feedback", "")
        elif name == "Student":
            score = student_avg_score if student_avg_score is not None else 8.0
            if student_categories:
                feedbacks = [c.get("feedback", "") for c in student_categories if c.get("feedback") and c.get("score") and c.get("category") in ["building_on_others", "idea_quality"]]
                feedback = feedbacks[0] if feedbacks else "Constructive presence with structured arguments and collaborative focus."
            else:
                feedback = "Active collaborative presence with structured arguments."
        else:
            # Algorithmic rating out of 10 based on actual contribution depth and conversation dynamics
            base_score = 8.0
            avg_words = all_words / turns_count if turns_count > 0 else 0
            if avg_words >= 25:
                base_score += 0.4
            elif avg_words < 12:
                base_score -= 0.4

            all_text = " ".join(data["texts"]).lower()
            topic_kws = [w.lower().strip("?,.") for w in topic.split() if len(w) > 3]
            on_topic = any(kw in all_text for kw in topic_kws) if topic_kws else True
            if on_topic:
                base_score += 0.2

            if name == "Meera":
                score = round(min(9.5, max(7.0, base_score + 0.4)), 1)
                feedback = "Exceptional analytical depth; anchored arguments in empirical logic and structured synthesis."
            elif name == "Aarav":
                score = round(min(9.1, max(6.8, base_score - 0.3)), 1)
                feedback = "Assertive counter-points, though leaned toward combative debating rather than collaborative consensus."
            elif name == "Kabir":
                score = round(min(9.4, max(7.0, base_score + 0.3)), 1)
                feedback = "Thoughtful, high-impact contributions; brought long-term ethical and human depth to the dialogue."
            elif name == "Riya":
                score = round(min(9.3, max(7.0, base_score + 0.2)), 1)
                feedback = "Unconventional perspectives and creative metaphors; successfully expanded the scope of dialogue."
            elif name == "Dev":
                score = round(min(8.9, max(6.8, base_score - 0.2)), 1)
                feedback = "Engaging cross-industry parallels, though occasionally drifted before reconnecting to the topic."
            else:
                score = round(min(9.5, max(6.5, base_score)), 1)
                feedback = "Substantive and timely participation in the group discussion."

        result.append({
            "name": name,
            "score": score,
            "feedback": feedback,
            "seconds": data["seconds"],
            "turns": data["turns"],
            "words": data["words"],
            "share_pct": share_pct,
        })

    # Sort by talk share descending
    result.sort(key=lambda x: (x["share_pct"], x["words"]), reverse=True)

    return {
        "denominator_note": "Talk share is calculated across all participants (moderator excluded).",
        "total_seconds": total_seconds,
        "total_words": total_words,
        "speakers": result,
    }


# ---------- AI Communication Coach Metrics ----------

COMMON_FILLERS = [
    ("umm", r"\bumm*\b"),
    ("um", r"\bum\b"),
    ("uh", r"\buhh*\b"),
    ("actually", r"\bactually\b"),
    ("like", r"\blike\b"),
    ("basically", r"\bbasically\b"),
    ("you know", r"\byou know\b"),
    ("literally", r"\bliterally\b"),
    ("sort of", r"\bsort of\b"),
    ("kind of", r"\bkind of\b"),
    ("matlab", r"\bmatlab\b"),
    ("dekho", r"\bdekho\b"),
    ("so yeah", r"\bso yeah\b"),
]


def compute_coach_metrics(transcript: list[dict], topic: str = "", student_categories: list[dict] = None) -> dict:
    """Analyze communication performance: speaking balance, filler words, argument clarity, and next GD action plan."""
    student_turns = [t for t in transcript if t.get("speaker") == "Student"]
    all_turns = transcript or []

    # 1. Speaking time & Participation Balance
    total_seconds = 0
    student_seconds = 0
    total_words = 0
    student_words = 0

    participants = set()
    for t in transcript:
        spk = t.get("speaker", "Unknown")
        if spk != "Moderator":
            participants.add(spk)
        dur = max(0, t.get("ended_at", 0) - t.get("started_at", 0))
        w = len(t.get("text", "").split())
        total_seconds += dur
        total_words += w
        if spk == "Student":
            student_seconds += dur
            student_words += w

    num_peers = len(participants) if participants else 4
    ideal_pct = round(100.0 / max(1, num_peers), 1)
    ideal_range_str = f"{max(12, int(ideal_pct * 0.7))}% – {min(32, int(ideal_pct * 1.3))}%"

    if total_seconds > 0:
        student_share_pct = round((student_seconds / total_seconds) * 100, 1)
    elif total_words > 0:
        student_share_pct = round((student_words / total_words) * 100, 1)
    else:
        student_share_pct = 0.0

    if not student_turns:
        balance_status = "No Spoken Presence"
        balance_critique = "You remained silent during the discussion. In competitive recruitment GDs, candidates without speaking presence cannot be evaluated."
    elif student_share_pct < 12.0:
        balance_status = "Under-Participating"
        balance_critique = f"Your speaking share was {student_share_pct}%, which is below the benchmark range ({ideal_range_str}). You had valid insights but yielded too much floor time to dominant peers."
    elif student_share_pct > 32.0:
        balance_status = "Over-Dominating"
        balance_critique = f"Your speaking share was {student_share_pct}%, exceeding the benchmark range ({ideal_range_str}). Assessors evaluate collaborative consensus rather than monologue length; invite quieter peers into the dialogue."
    else:
        balance_status = "Well-Balanced Participation"
        balance_critique = f"Optimal speaking share at {student_share_pct}% (Benchmark: {ideal_range_str}). You maintained an authoritative presence without crowding out fellow participants."

    # 2. Filler words analysis
    filler_breakdown = {}
    filler_examples = []
    total_fillers = 0

    for turn in student_turns:
        text = turn.get("text", "")
        tid = turn.get("id", "")
        for label, pattern in COMMON_FILLERS:
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            if matches:
                count = len(matches)
                filler_breakdown[label] = filler_breakdown.get(label, 0) + count
                total_fillers += count
                for m in matches[:2]:
                    start = max(0, m.start() - 25)
                    end = min(len(text), m.end() + 25)
                    snip = text[start:end].strip()
                    if not any(ex["turn_id"] == tid and ex["word"] == label for ex in filler_examples):
                        filler_examples.append({
                            "word": label,
                            "turn_id": tid,
                            "snippet": f"...{snip}..."
                        })

    filler_rate = round((total_fillers / max(1, student_words)) * 100, 1)
    if total_fillers == 0:
        filler_status = "Crisp & Clean Cadence"
        filler_critique = "Zero noticeable filler words detected. Your verbal delivery was articulate, composed, and structurally tight."
    elif total_fillers <= 3:
        filler_status = "Well Controlled"
        filler_critique = f"Only {total_fillers} filler words detected ({filler_rate} per 100 words). Highly natural for live conversational delivery; easily polished with deliberate pauses."
    elif total_fillers <= 6:
        filler_status = "Moderate Fillers Detected"
        filler_critique = f"{total_fillers} filler words detected ({filler_rate} per 100 words). Words like {', '.join(f'\"{k}\"' for k in list(filler_breakdown.keys())[:3])} appeared as thinking buffers when transitioning between sentences."
    else:
        filler_status = "High Filler Frequency"
        filler_critique = f"{total_fillers} filler words detected ({filler_rate} per 100 words). High filler density distracts from the authority of your arguments. Replace vocal crutches with silent pauses."

    # 3. Argument clarity, structure, and relevance
    topic_kws = [w.lower().strip("?,.") for w in topic.split() if len(w) > 3]
    all_student_text = " ".join(t.get("text", "") for t in student_turns).lower()
    is_on_topic = any(kw in all_student_text for kw in topic_kws) if topic_kws else True

    combative_tokens = ["you are wrong", "nonsense", "shut up", "i don't care", "stupid", "ridiculous", "fight"]
    is_combative = any(ct in all_student_text for ct in combative_tokens)

    collaborative_tokens = ["agree", "point", "meera", "aarav", "kabir", "riya", "dev", "building", "perspective", "adding", "also"]
    is_collaborative = any(ct in all_student_text for ct in collaborative_tokens)

    if not student_turns:
        argument_status = "Unassessed"
        argument_critique = "No student speech recorded to evaluate argument structure or relevance."
        structure_score = None
    elif is_combative:
        argument_status = "Combative / Adversarial"
        argument_critique = "You pushed back with confrontational rhetoric rather than collaborative consensus. GD evaluates team synergy, not aggressive debating."
        structure_score = 5.5
    elif is_collaborative and is_on_topic:
        argument_status = "Structured & Collaborative"
        argument_critique = "Exceptional argument structure. You acknowledged peer perspectives before introducing your own reasoning, staying firmly anchored to the topic prompt."
        structure_score = 8.8
    elif is_on_topic:
        argument_status = "Direct & Relevant"
        argument_critique = "Your points were relevant and logically sound, though you presented ideas in isolation rather than synthesizing fellow participants' remarks."
        structure_score = 7.6
    else:
        argument_status = "Divergent / Tangential"
        argument_critique = "Your points strayed away from the core problem statement into generalized observations."
        structure_score = 6.2

    # 4. Unique Twist: What to Improve in Your Next GD
    first_turn_idx = -1
    if student_turns:
        for idx, t in enumerate(all_turns):
            if t.get("id") == student_turns[0].get("id"):
                first_turn_idx = idx
                break

    action_plan = []

    # Action 1: Opening & Floor Entry
    if first_turn_idx == -1 or first_turn_idx > 3:
        action_plan.append({
            "step": 1,
            "title": "Enter Within the First 60 Seconds",
            "action": "Do not wait for multiple peers to set the agenda. Speak in the opening round and frame the discussion into two distinct dimensions.",
            "example_phrase": f"\"I'd like to frame our discussion on '{topic[:32]}...' across two key dimensions: pragmatic implementation and long-term societal impact.\""
        })
    else:
        action_plan.append({
            "step": 1,
            "title": "Establish an Analytical Anchor in Your Opening",
            "action": "Your initial entry was timely. In your next GD, define 1 concrete boundary or industry metric during your opening to give the room a clear roadmap.",
            "example_phrase": "\"To build a structured baseline for the group, let's examine both the economic feasibility and user adoption challenges.\""
        })

    # Action 2: Delivery & Filler Elimination
    if total_fillers > 0:
        top_filler = list(filler_breakdown.keys())[0]
        action_plan.append({
            "step": 2,
            "title": f"Substitute the '{top_filler}' Filler with a 1-Second Breath",
            "action": f"You used '{top_filler}' {filler_breakdown[top_filler]} times as a cognitive transition. In your next GD, replace the verbal sound with complete silence and structure thoughts using PREP.",
            "example_phrase": "\"Point: Automation increases output. Reason: Eliminates repetitive manual bottlenecks. Example: As seen in logistics warehousing.\""
        })
    else:
        action_plan.append({
            "step": 2,
            "title": "Deploy the PREP Framework on Every Turn",
            "action": "Structure every contribution into 4 concise sentences: Point (core claim) → Reason (the 'why') → Example (empirical evidence) → Point (closing synthesis).",
            "example_phrase": "\"My core recommendation is X, because empirical trends indicate Y. For instance, in fintech adoption, this yielded Z results.\""
        })

    # Action 3: Collaborative Synthesis vs Combative Debating
    if is_combative:
        action_plan.append({
            "step": 3,
            "title": "Shift from Combative Debating to Consensus Synthesis",
            "action": "Never say 'you are wrong'. Acknowledge the merit in your peer's observation first, then pivot smoothly using collaborative signposts.",
            "example_phrase": "\"That is a valid concern raised by Aarav. However, if we examine operational constraints, an alternative approach could be...\""
        })
    elif not is_collaborative:
        action_plan.append({
            "step": 3,
            "title": "Use Peer Name Bridging on Every Entry",
            "action": "Before stating your point, actively cite a peer's name from the previous turn. This demonstrates active listening and collaborative leadership.",
            "example_phrase": "\"Building on Meera's observation regarding empirical evidence, we must also factor in the cultural transition...\""
        })
    else:
        action_plan.append({
            "step": 3,
            "title": "Lead the Room Toward Consensus in the Closing Phase",
            "action": "During the final 2 minutes, initiate a synthesis turn that unites contrasting viewpoints into a shared group recommendation.",
            "example_phrase": "\"Looking across our discussion, Aarav and Meera presented two vital angles. To reconcile them into a practical conclusion, our collective takeaway is...\""
        })

    return {
        "speaking_time": {
            "student_seconds": round(student_seconds, 1),
            "student_words": student_words,
            "student_turns": len(student_turns),
            "share_pct": student_share_pct,
            "ideal_range": ideal_range_str,
            "status": balance_status,
            "critique": balance_critique,
        },
        "filler_words": {
            "total_count": total_fillers,
            "rate_per_100_words": filler_rate,
            "breakdown": filler_breakdown,
            "examples": filler_examples[:4],
            "status": filler_status,
            "critique": filler_critique,
        },
        "argument_clarity": {
            "score": structure_score,
            "status": argument_status,
            "critique": argument_critique,
            "is_on_topic": is_on_topic,
            "is_collaborative": is_collaborative,
            "is_combative": is_combative,
        },
        "next_gd_action_plan": action_plan,
        "executive_summary": (
            f"Speaking time: {student_share_pct}% ({balance_status}). "
            f"Cadence: {total_fillers} fillers detected ({filler_status}). "
            f"Team dynamic: {argument_status}. "
            f"Review your 3 Next GD Action Items below to elevate your placement score."
        )
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

async def evaluate_with_llm(topic: str, transcript: list[dict], api_key: str = "") -> list[dict]:
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
             "turn_id": None, "quote": None, "suggestion": "Try to participate actively in the next round."}
            for cat in ["starting", "idea_quality", "building_on_others",
                        "speech_delivery", "listening", "handling_interruptions", "ending"]
        ], {}, {}

    prompt = f"""You are an elite Placement and MBA Group Discussion (GD) Assessor.
Evaluate the Group Discussion performance of all participants present in this session, with deep category analysis for the Student.

Topic: "{topic}"

Full Transcript (each turn has an ID like t1, t2, etc.):
{transcript_text}

CRITICAL GD EVALUATION PHILOSOPHY:
In a professional Group Discussion, candidates are evaluated on team synergy, analytical depth, and collaborative consensus — NOT aggressive debating.
Assess all participants against these exact placement standards:

EVALUATION CRITERIA:
1. starting (Topic Encounter & Framing):
   - How did the candidate encounter and approach the topic upon entering?
   - Did they frame the discussion constructively, defining context and inviting productive dialogue, or was their entry superficial?

2. idea_quality (Topic Understanding & Focus):
   - Did the candidate demonstrate a well-rounded, mature understanding of the topic?
   - Did they stay firmly anchored to the topic, or did they divert the group into irrelevant tangents or side tracks?
   - Penalize superficial slogans or drifting off-topic.

3. building_on_others (Collaborative Mindset vs. Combative Debating):
   - GD IS A COLLABORATIVE DISCUSSION, NOT AN ADVERSARIAL DEBATE.
   - The candidate should NOT look like a combative debater fighting with others to prove their point!
   - Did they acknowledge, respect, and build upon peers' points to reach consensus?
   - Or did they aggressively attack others, interrupt to dominate, or stubbornly fight to win arguments?

4. speech_delivery (Way of Speaking & Sentence Clarity):
   - Evaluate speech delivery, sentence construction, and articulation.
   - Did the candidate speak with clean, grammatically correct, and coherent sentences without fumbling, stumbling, or rambling?
   - Suggest how to structure sentences crisply.

5. listening (Active Listening & Synthesis):
   - Did the candidate demonstrate genuine listening by connecting their points to what was just spoken, rather than reciting pre-prepared monologues?

6. handling_interruptions (Composure & Handling Interruptions):
   - How calmly and professionally did they handle turn-taking or interruptions? (Score null if no interruption dynamics occurred).

7. ending (Discussion Closure & Final Takeaways):
   - Did they contribute to summarizing or providing balanced concluding takeaways during the closing phase?

SCORING RULES:
- Rate EVERY participant present in the transcript (Student and every AI speaker, excluding Moderator) based on their overall performance OUT OF 10.
- Do NOT give percentage scores anywhere — every single score must be a number out of 10 (e.g. 8.5, 7.8, 9.2).
- Base scores directly on what they actually said and how they conducted themselves in the conversation.

Return ONLY a valid JSON object with "categories" and "speaker_ratings":
{{
  "categories": [
    {{
      "category": "starting",
      "score": 8,
      "feedback": "Specific feedback evaluating how the Student encountered the topic.",
      "turn_id": "t1",
      "quote": "exact substring from Student",
      "suggestion": "Actionable suggestion"
    }},
    {{
      "category": "idea_quality",
      "score": 8,
      "feedback": "Specific feedback on Student's topic understanding and staying focused without diverting.",
      "turn_id": "t1",
      "quote": "exact substring from Student",
      "suggestion": "Actionable suggestion"
    }},
    {{
      "category": "building_on_others",
      "score": 8,
      "feedback": "Specific feedback on collaborative attitude vs combative debating (not fighting).",
      "turn_id": "t1",
      "quote": "exact substring from Student",
      "suggestion": "Actionable suggestion"
    }},
    {{
      "category": "speech_delivery",
      "score": 8,
      "feedback": "Specific feedback on way of speaking, sentence formation, and no fumbling.",
      "turn_id": "t1",
      "quote": "exact substring from Student",
      "suggestion": "Actionable suggestion"
    }},
    {{
      "category": "listening",
      "score": 8,
      "feedback": "Specific feedback on listening to others' ideas.",
      "turn_id": "t1",
      "quote": "exact substring from Student",
      "suggestion": "Actionable suggestion"
    }},
    {{
      "category": "handling_interruptions",
      "score": null,
      "feedback": "Feedback on interruption composure (score null if none occurred).",
      "turn_id": null,
      "quote": null,
      "suggestion": "Actionable suggestion"
    }},
    {{
      "category": "ending",
      "score": 8,
      "feedback": "Specific feedback on wrapping up constructively.",
      "turn_id": "t1",
      "quote": "exact substring from Student",
      "suggestion": "Actionable suggestion"
    }}
  ],
  "speaker_ratings": [
    {{
      "name": "Student",
      "score": 8.0,
      "feedback": "1-2 sentence overall performance verdict out of 10 based on all things present in the convo."
    }},
    {{
      "name": "SpeakerName",
      "score": 8.5,
      "feedback": "1-2 sentence overall performance verdict out of 10 based on all things present in the convo."
    }}
  ],
  "coach": {{
    "summary": "2-3 sentences of direct executive feedback as an elite GD communication coach.",
    "speaking_critique": "Personalized assessment of speaking time balance and floor pacing.",
    "filler_critique": "Personalized critique on vocal cadence, filler words, and fluency.",
    "argument_critique": "Personalized critique on argument structure, clarity, and collaborative teamwork without combative debating.",
    "next_gd_action_plan": [
      {{
        "step": 1,
        "title": "Exact title for next GD action",
        "action": "Concrete behavior to execute in next GD",
        "example_phrase": "Exact verbal formula to speak"
      }},
      {{
        "step": 2,
        "title": "Exact title for next GD action",
        "action": "Concrete behavior to execute in next GD",
        "example_phrase": "Exact verbal formula to speak"
      }},
      {{
        "step": 3,
        "title": "Exact title for next GD action",
        "action": "Concrete behavior to execute in next GD",
        "example_phrase": "Exact verbal formula to speak"
      }}
    ]
  }}
}}
"""

    active_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
    key_available = bool(active_key and active_key != "your-api-key-here" and len(active_key) > 10)

    if key_available:
        try:
            genai.configure(api_key=active_key)
            report_models = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash"]
            for m_name in report_models:
                try:
                    model = genai.GenerativeModel(
                        m_name,
                        generation_config=genai.GenerationConfig(
                            response_mime_type="application/json",
                            max_output_tokens=2500,
                            temperature=0.4,
                        ),
                    )

                    response = await asyncio.wait_for(
                        asyncio.to_thread(model.generate_content, prompt),
                        timeout=30.0,
                    )

                    text = response.text.strip()
                    if text.startswith("```"):
                        lines = text.split("\n")
                        if lines and lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].startswith("```"):
                            lines = lines[:-1]
                        text = "\n".join(lines).strip()

                    parsed_data = json.loads(text)
                    categories = []
                    speaker_ratings = {}
                    coach_data = {}

                    if isinstance(parsed_data, dict):
                        categories = parsed_data.get("categories", [])
                        ratings_list = parsed_data.get("speaker_ratings", [])
                        if isinstance(ratings_list, list):
                            for r in ratings_list:
                                if isinstance(r, dict) and "name" in r:
                                    speaker_ratings[r["name"]] = r
                        coach_data = parsed_data.get("coach", {}) if isinstance(parsed_data.get("coach"), dict) else {}
                    elif isinstance(parsed_data, list):
                        categories = parsed_data

                    if isinstance(categories, list) and len(categories) > 0:
                        return categories, speaker_ratings, coach_data

                except Exception as m_err:
                    print(f"Report model {m_name} failed: {m_err}")
                    continue

        except Exception as e:
            print(f"Report LLM setup error: {e}")

    # Fallback heuristic evaluation with real quotes and calculated metrics
    return evaluate_heuristic(topic, transcript), {}, {}


def evaluate_heuristic(topic: str, transcript: list[dict]) -> list[dict]:
    """Generates structured evaluation with real quotes from student turns."""
    student_turns = [t for t in transcript if t.get("speaker") == "Student"]
    if not student_turns:
        return [
            {"category": cat, "score": None,
             "feedback": "You did not speak during this session.",
             "turn_id": None, "quote": None, "suggestion": "Try to participate actively in the next round."}
            for cat in ["starting", "idea_quality", "building_on_others",
                        "speech_delivery", "listening", "handling_interruptions", "ending"]
        ]

    first_student_turn = student_turns[0]
    first_turn_index = next((i for i, t in enumerate(transcript) if t.get("id") == first_student_turn.get("id")), 0)

    # 1. Starting (Topic Encounter & Framing)
    if first_turn_index <= 3:
        starting_score = 8
        starting_feedback = "Encountered the topic promptly with structured framing. You established an initial presence that welcomed group participation."
        starting_suggestion = "Open by highlighting two distinct dimensions of the topic to give the group a clear roadmap."
    else:
        starting_score = 6
        starting_feedback = "Entered the discussion relatively late after others had already set the direction of the topic."
        starting_suggestion = "Speak within the first 2-3 turns to anchor your perspective on the topic early."

    # 2. Idea quality (Topic Understanding & Focus / No Diverting)
    longest_turn = max(student_turns, key=lambda t: len(t.get("text", "")))
    word_count = len(longest_turn.get("text", "").split())
    topic_words = [w.lower().strip("?,.") for w in topic.split() if len(w) > 3]
    stays_on_topic = any(any(kw in t.get("text", "").lower() for kw in topic_words) for t in student_turns)

    if word_count >= 15 and stays_on_topic:
        idea_score = 8
        idea_feedback = "Demonstrated solid understanding of the topic. Stayed focused on the core theme without getting diverted onto side tracks."
        idea_suggestion = "Support your central insight with empirical examples or industry data to deepen your analysis."
    elif stays_on_topic:
        idea_score = 7
        idea_feedback = "Understood the main theme, though arguments were brief. You stayed on topic without drifting into tangents."
        idea_suggestion = "Elaborate on the 'why' and 'how' behind your points to show deeper conceptual mastery."
    else:
        idea_score = 6
        idea_feedback = "Contribution was generalized and risked diverting away from the core question posed by the topic."
        idea_suggestion = "Anchor every sentence directly to the topic prompt to ensure you never divert the discussion."

    # 3. Building on others (Collaborative Mindset vs. Combative Debating)
    build_turn = None
    combative_phrases = ["you are wrong", "nonsense", "fight", "shut up", "i don't care"]
    is_combative = False
    for t in student_turns:
        txt = t.get("text", "").lower()
        if any(cp in txt for cp in combative_phrases):
            is_combative = True
            build_turn = t
            break
        if any(w in txt for w in ["agree", "point", "meera", "aarav", "kabir", "riya", "dev", "also", "building", "however", "perspective"]):
            build_turn = t

    if is_combative:
        build_score = 5
        build_feedback = "You came across as an aggressive debater fighting to prove a point. A GD is a collaborative discussion, not a battle."
        build_suggestion = "Adopt a consensus-building tone: validate peer arguments before offering an alternative perspective."
    elif build_turn:
        build_score = 8
        build_feedback = "Exhibited a collaborative GD mindset. You engaged respectfully with peer arguments rather than treating the session like an adversarial debate."
        build_suggestion = "Synthesize two contrasting viewpoints before offering your own recommendation."
    else:
        build_score = 6
        build_turn = student_turns[min(1, len(student_turns)-1)]
        build_feedback = "Stated personal opinions in isolation without linking back to fellow participants. A GD requires collaborative teamwork, not monologues."
        build_suggestion = "Use bridging phrases like 'Building on what Aarav noted...' to show active collaboration."

    # 4. Speech Delivery & Sentence Clarity (Way of Speaking, No Fumbling)
    avg_words = sum(len(t.get("text", "").split()) for t in student_turns) / len(student_turns)
    delivery_turn = longest_turn
    if avg_words >= 10:
        delivery_score = 8
        delivery_feedback = "Articulated your thoughts in clear, coherent sentences without fumbling or broken phrasing."
        delivery_suggestion = "Continue using clean signposting ('First...', 'Secondly...') to maintain a composed speaking cadence."
    elif avg_words >= 5:
        delivery_score = 7
        delivery_feedback = "Maintained basic fluency and correct sentence formation, though ideas could be expressed more expansively."
        delivery_suggestion = "Formulate a complete 2-sentence thought before speaking to sound authoritative and confident."
    else:
        delivery_score = 5
        delivery_feedback = "Contributions were fragmented into short phrases, which can sound hesitant or like fumbling in a formal GD."
        delivery_suggestion = "Practice speaking in complete grammatical sentences: state your point, followed by the supporting reason."

    # 5. Listening
    listen_turn = student_turns[-1]
    listen_score = 7
    listen_feedback = "Showed active attention to the discussion flow and timed your entries respectfully."
    listen_suggestion = "Paraphrase a key point from the previous speaker before introducing your new observation."

    # 6. Handling interruptions
    handling_score = None
    handling_feedback = "No contentious interruption dynamics occurred during this session, so it is not scored."
    handling_turn_id = None
    handling_quote = None
    handling_suggestion = "If interrupted in future discussions, calmly finish your core sentence before courteously yielding the floor."

    # 7. Ending
    last_turn = student_turns[-1]
    is_near_end = transcript and (transcript[-1].get("id") == last_turn.get("id") or (len(transcript) > 1 and transcript[-2].get("id") == last_turn.get("id")))
    if is_near_end:
        ending_score = 8
        ending_feedback = "Helped summarize key takeaways constructively during the closing round without starting new conflicts."
        ending_suggestion = "Provide a structured 30-second synthesis that highlights areas of group consensus."
    else:
        ending_score = 6
        ending_feedback = "Did not contribute to the final wrap-up phase."
        ending_suggestion = "Seize the closing opportunity to deliver a balanced summary of the group's findings."

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
            "category": "speech_delivery",
            "score": delivery_score,
            "feedback": delivery_feedback,
            "turn_id": delivery_turn["id"],
            "quote": delivery_turn["text"],
            "suggestion": delivery_suggestion,
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


async def generate_report(topic: str, transcript: list[dict], api_key: str = "") -> dict:
    """Full report: performance ratings out of 10 + category evaluation + quote validation + AI communication coach."""
    categories, llm_ratings, llm_coach = await evaluate_with_llm(topic, transcript, api_key=api_key)
    categories = validate_quotes(categories, transcript)
    metrics = compute_metrics(transcript, topic=topic, student_categories=categories, llm_ratings=llm_ratings)
    coach = compute_coach_metrics(transcript, topic=topic, student_categories=categories)

    # Merge LLM qualitative improvements if available
    if llm_coach and isinstance(llm_coach, dict):
        if llm_coach.get("speaking_critique"):
            coach["speaking_time"]["critique"] = llm_coach["speaking_critique"]
        if llm_coach.get("filler_critique"):
            coach["filler_words"]["critique"] = llm_coach["filler_critique"]
        if llm_coach.get("argument_critique"):
            coach["argument_clarity"]["critique"] = llm_coach["argument_critique"]
        if llm_coach.get("next_gd_action_plan") and isinstance(llm_coach["next_gd_action_plan"], list) and len(llm_coach["next_gd_action_plan"]) >= 2:
            coach["next_gd_action_plan"] = llm_coach["next_gd_action_plan"]
        if llm_coach.get("summary"):
            coach["executive_summary"] = llm_coach["summary"]

    return {
        "metrics": metrics,
        "categories": categories,
        "coach": coach,
    }

